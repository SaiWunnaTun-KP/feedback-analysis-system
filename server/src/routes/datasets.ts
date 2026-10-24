import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.ts';
import { activeSubscriptions, datasets, users, reviews } from '../database/schema.ts';
import { eq, and, desc, count } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.ts';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// GET /api/datasets
// Get user's datasets with pagination
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const isAll = req.query.all === 'true';

    // 1. Fetch total count of user's datasets
    const [countResult] = await db
      .select({ count: count() })
      .from(datasets)
      .where(eq(datasets.userId, userId));
    const total = Number(countResult?.count || 0);

    // If 'all=true' requested, return all datasets without pagination
    if (isAll) {
      const userDatasets = await db
        .select()
        .from(datasets)
        .where(eq(datasets.userId, userId))
        .orderBy(desc(datasets.createdAt));

      return res.json({
        datasets: userDatasets,
        pagination: {
          total,
          page: 1,
          limit: total || 1,
          offset: 0,
          totalPages: 1,
        },
      });
    }

    // 2. Parse pagination params
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const offset = req.query.offset !== undefined 
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : (page - 1) * limit;

    const totalPages = Math.ceil(total / limit) || 1;

    // 3. Fetch paginated datasets
    const userDatasets = await db
      .select()
      .from(datasets)
      .where(eq(datasets.userId, userId))
      .orderBy(desc(datasets.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      datasets: userDatasets,
      pagination: {
        total,
        page,
        limit,
        offset,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/datasets/upload
// Upload a CSV file
router.post('/upload', authenticate, upload.single('file'), async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'Only CSV files are allowed' });
    }

    const fileSizeMb = file.size / (1024 * 1024);

    // 1. Quota Validation
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [subscription] = await db.select().from(activeSubscriptions).where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

    let maxStorageMb = 0;
    let usedStorageMb = 0;

    if (subscription) {
      // We need to fetch plan details to get max storage
      const planRes = await db.execute(`SELECT max_storage_mb FROM plans WHERE id = ${subscription.planId}`);
      if (planRes.rows.length > 0) {
        maxStorageMb = Number(planRes.rows[0].max_storage_mb);
      }
      usedStorageMb = Number(subscription.usedStorageMb);
    } else if (!user.hasUsedFreeTrial) {
      maxStorageMb = 75; // Free tier
    } else {
      return res.status(402).json({ error: 'No active subscription and free trial exhausted. Please upgrade.' });
    }

    if (usedStorageMb + fileSizeMb > maxStorageMb) {
      return res.status(402).json({ error: `Upload exceeds quota. Used: ${usedStorageMb.toFixed(2)}MB, Max: ${maxStorageMb}MB, File: ${fileSizeMb.toFixed(2)}MB` });
    }

    // Helper functions for matching columns exactly (stripping non-alphanumeric chars)
    const getNorm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    const isProductCol = (h: string) => {
      const norm = getNorm(h);
      const validAliases = ['productname', 'product', 'itemname', 'item', 'name', 'producttitle'];
      return validAliases.includes(norm);
    };
    
    const isReviewCol = (h: string) => {
      const norm = getNorm(h);
      const validAliases = ['reviewtext', 'review', 'feedback', 'customerfeedback', 'text', 'comment', 'comments'];
      return validAliases.includes(norm);
    };

    // 2. CSV Template Validation (Flexible)
    try {
      // Parse just the first line (headers)
      const firstNewlineIdx = file.buffer.indexOf('\n');
      const headerLine = firstNewlineIdx !== -1 
        ? file.buffer.subarray(0, firstNewlineIdx).toString('utf-8') 
        : file.buffer.toString('utf-8');
      
      const headers = headerLine.split(',').map(h => h.trim());
      
      const hasProduct = headers.some(isProductCol);
      const hasReview = headers.some(isReviewCol);
      
      if (!hasProduct || !hasReview) {
        return res.status(400).json({ 
          error: 'Invalid CSV format. Could not find a product column (e.g., "Product Name", "product") or a review column (e.g., "Review Text", "review"). Please check your headers.' 
        });
      }
    } catch (err) {
      console.error('CSV Parsing Error:', err);
      return res.status(400).json({ error: 'Failed to read CSV headers.' });
    }

    // 3. Cloudflare R2 Upload
    const objectKey = `${userId}/${uuidv4()}-${file.originalname}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      Body: file.buffer,
      ContentType: 'text/csv',
    }));

    // 4. Update Quota
    if (subscription) {
      const newUsedStorage = usedStorageMb + fileSizeMb;
      await db.update(activeSubscriptions).set({ usedStorageMb: newUsedStorage.toString() }).where(eq(activeSubscriptions.id, subscription.id));
    } else {
      // Set free trial exhausted for simplistic MVP approach
      await db.update(users).set({ hasUsedFreeTrial: true }).where(eq(users.id, userId));
    }

    // 5. Database Logging
    const [dataset] = await db.insert(datasets).values({
      userId,
      filename: file.originalname,
      filePath: objectKey,
      fileSizeMb: fileSizeMb.toString(),
      status: 'ANALYSIS_IN_PROGRESS',
    }).returning();

    // 6. Asynchronous CSV Parsing & Insertion
    const results: any[] = [];
    let productNameKey = '';
    let reviewTextKey = '';

    Readable.from(file.buffer)
      .pipe(csv())
      .on('headers', (headers) => {
        headers.forEach((h: string) => {
          if (!productNameKey && isProductCol(h)) productNameKey = h;
          if (!reviewTextKey && isReviewCol(h)) reviewTextKey = h;
        });
      })
      .on('data', (data) => {
        if (productNameKey && reviewTextKey && data[productNameKey] && data[reviewTextKey]) {
          results.push({
            datasetId: dataset.id,
            productName: String(data[productNameKey]).substring(0, 255), // Truncate to fit varchar(255)
            reviewText: String(data[reviewTextKey])
          });
        }
      })
      .on('end', async () => {
        try {
          // Batch insert into reviews table
          const chunkSize = 1000;
          for (let i = 0; i < results.length; i += chunkSize) {
            await db.insert(reviews).values(results.slice(i, i + chunkSize));
          }
          
          console.log(`Inserted ${results.length} reviews for dataset ${dataset.id}`);

          // Trigger AI Microservice (Python FastAPI)
          fetch('http://localhost:8001/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset_id: dataset.id })
          }).catch(err => console.error('Failed to trigger Python worker:', err));

        } catch (dbErr) {
          console.error('Error inserting reviews:', dbErr);
        }
      });

    // Send immediate response to client
    res.json({ message: 'File uploaded successfully', dataset });

  } catch (error) {
    console.error('Error uploading dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { inArray } from 'drizzle-orm';
import { feedbackResults } from '../database/schema.ts';

// DELETE /api/datasets/:id
// Hard delete a dataset and all associated data
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const datasetId = parseInt(req.params.id);

    // Verify ownership
    const [dataset] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
    
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    // 1. Delete associated Feedback Results
    const datasetReviews = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.datasetId, datasetId));
    const reviewIds = datasetReviews.map((r: any) => r.id);
    
    if (reviewIds.length > 0) {
      // Chunk deletion to avoid too many variables in query
      const chunkSize = 1000;
      for (let i = 0; i < reviewIds.length; i += chunkSize) {
        const chunk = reviewIds.slice(i, i + chunkSize);
        await db.delete(feedbackResults).where(inArray(feedbackResults.reviewId, chunk));
      }
    }

    // 2. Delete associated Reviews
    await db.delete(reviews).where(eq(reviews.datasetId, datasetId));

    // 3. Delete from Database
    await db.delete(datasets).where(eq(datasets.id, datasetId));

    // 4. Delete from Cloudflare R2
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: dataset.filePath,
      }));
    } catch (s3Error) {
      console.error('Error deleting file from R2:', s3Error);
      // Proceeding anyway since we've already deleted from DB, might leave orphaned file
    }

    // 5. Refund Storage Quota
    const fileSizeMb = Number(dataset.fileSizeMb);
    const [subscription] = await db.select().from(activeSubscriptions).where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));
    
    if (subscription) {
      const currentUsed = Number(subscription.usedStorageMb);
      const newUsed = Math.max(0, currentUsed - fileSizeMb); // Ensure it doesn't go below 0
      await db.update(activeSubscriptions)
        .set({ usedStorageMb: newUsed.toString() })
        .where(eq(activeSubscriptions.id, subscription.id));
    }

    res.json({ message: 'Dataset successfully deleted' });

  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
