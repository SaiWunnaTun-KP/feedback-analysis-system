import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.ts';
import { activeSubscriptions, datasets, users, reviews, feedbackResults } from '../database/schema.ts';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
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

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8001';

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

/**
 * Watchdog helper:
 * Verifies if the Python worker is actively running and processing the dataset.
 * If the worker is offline, paused, or no longer processing the dataset, automatically
 * updates its status to 'FAILED' so the user is not stuck and can click Try Again.
 */
async function verifyWorkerAndReconcileDataset(dataset: any): Promise<boolean> {
  if (!dataset || dataset.status !== 'ANALYSIS_IN_PROGRESS') {
    return false;
  }

  const ageMs = Date.now() - new Date(dataset.createdAt || dataset.updatedAt).getTime();
  let isWorkerReachable = false;
  let activeDatasets: number[] = [];

  try {
    const healthRes = await fetch(`${WORKER_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });

    if (healthRes.ok) {
      const data: any = await healthRes.json();
      isWorkerReachable = true;
      activeDatasets = Array.isArray(data.active_datasets) ? data.active_datasets : [];
    }
  } catch (err) {
    isWorkerReachable = false;
  }

  // Case 1: Worker is offline, paused (timed out), or connection refused
  if (!isWorkerReachable) {
    console.warn(`[Watchdog] Worker is unreachable or paused. Marking dataset ${dataset.id} as FAILED.`);
    const errorMsg = 'Analysis stopped: Python worker service is offline or paused. Please restart the worker and click Try Again.';
    await db.update(datasets).set({
      status: 'FAILED',
      errorMessage: errorMsg,
      updatedAt: new Date(),
    }).where(eq(datasets.id, dataset.id));

    dataset.status = 'FAILED';
    dataset.errorMessage = errorMsg;
    return false;
  }

  // Case 2: Worker is running, but dataset is not actively being processed
  // Allow a 15-second grace period for newly uploaded datasets during initial CSV parsing & review insertion
  if (ageMs > 15000 && !activeDatasets.includes(dataset.id)) {
    console.warn(`[Watchdog] Worker is alive, but dataset ${dataset.id} is not in active_datasets. Marking as FAILED.`);
    const errorMsg = 'Analysis interrupted: Worker is not actively processing this dataset. Please click Try Again to restart.';
    await db.update(datasets).set({
      status: 'FAILED',
      errorMessage: errorMsg,
      updatedAt: new Date(),
    }).where(eq(datasets.id, dataset.id));

    dataset.status = 'FAILED';
    dataset.errorMessage = errorMsg;
    return false;
  }

  return true;
}

// GET /api/datasets/active
// Returns the currently active dataset in progress (if any) for the user
router.get('/active', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const [active] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.userId, userId), eq(datasets.status, 'ANALYSIS_IN_PROGRESS')))
      .orderBy(desc(datasets.updatedAt))
      .limit(1);

    if (!active) {
      return res.json({ activeDataset: null });
    }

    const isStillActive = await verifyWorkerAndReconcileDataset(active);
    if (!isStillActive) {
      return res.json({ activeDataset: null });
    }

    res.json({ activeDataset: active });
  } catch (error) {
    console.error('Error fetching active dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

      for (const d of userDatasets) {
        if (d.status === 'ANALYSIS_IN_PROGRESS') {
          await verifyWorkerAndReconcileDataset(d);
        }
      }

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

    for (const d of userDatasets) {
      if (d.status === 'ANALYSIS_IN_PROGRESS') {
        await verifyWorkerAndReconcileDataset(d);
      }
    }

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

    // 2. CSV Template Validation (Flexible)
    try {
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
      ContentType: 'text/csv',
      Body: file.buffer,
    }));

    // 4. Update Quota
    if (subscription) {
      const newUsedStorage = usedStorageMb + fileSizeMb;
      await db.update(activeSubscriptions).set({ usedStorageMb: newUsedStorage.toString() }).where(eq(activeSubscriptions.id, subscription.id));
    } else {
      await db.update(users).set({ hasUsedFreeTrial: true }).where(eq(users.id, userId));
    }

    // 5. Database Logging
    const [dataset] = await db.insert(datasets).values({
      userId,
      filename: file.originalname,
      filePath: objectKey,
      fileSizeMb: fileSizeMb.toString(),
      status: 'ANALYSIS_IN_PROGRESS',
      totalReviews: 0,
      processedReviews: 0,
      errorMessage: null,
    }).returning();

    // 6. Asynchronous CSV Parsing & Review Insertion with Try/Catch
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
            productName: String(data[productNameKey]).substring(0, 255),
            reviewText: String(data[reviewTextKey])
          });
        }
      })
      .on('error', async (parseErr) => {
        console.error(`CSV stream error for dataset ${dataset.id}:`, parseErr);
        await db.update(datasets).set({
          status: 'FAILED',
          errorMessage: 'CSV stream parsing error: ' + (parseErr.message || 'Malformed CSV')
        }).where(eq(datasets.id, dataset.id));
      })
      .on('end', async () => {
        try {
          if (results.length === 0) {
            console.warn(`No valid review rows found for dataset ${dataset.id}`);
            await db.update(datasets).set({
              status: 'FAILED',
              errorMessage: 'No valid rows matching product and review columns were found.'
            }).where(eq(datasets.id, dataset.id));
            return;
          }

          // Batch insert into reviews table
          const chunkSize = 1000;
          for (let i = 0; i < results.length; i += chunkSize) {
            await db.insert(reviews).values(results.slice(i, i + chunkSize));
          }
          
          await db.update(datasets).set({
            totalReviews: results.length,
            processedReviews: 0,
            errorMessage: null,
          }).where(eq(datasets.id, dataset.id));

          console.log(`Inserted ${results.length} reviews for dataset ${dataset.id}. Launching Python worker...`);

          // Trigger AI Microservice (Python FastAPI)
          const workerRes = await fetch(`${WORKER_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset_id: dataset.id }),
            signal: AbortSignal.timeout(3000),
          });

          if (!workerRes.ok) {
            const errText = await workerRes.text();
            throw new Error(`Worker HTTP ${workerRes.status}: ${errText}`);
          }

        } catch (dbErr: any) {
          console.error(`Error processing reviews/launching worker for dataset ${dataset.id}:`, dbErr);
          await db.update(datasets).set({
            status: 'FAILED',
            errorMessage: 'Analysis start error: ' + (dbErr.message || 'Worker service is unreachable or paused. Please restart the worker and click Try Again.')
          }).where(eq(datasets.id, dataset.id));
        }
      });

    // Send immediate response to client
    res.json({ message: 'File uploaded successfully', dataset });

  } catch (error) {
    console.error('Error uploading dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/datasets/:id/stop
// Explicitly stop/abort an in-progress analysis and mark it as FAILED (allowing retry)
router.post('/:id/stop', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const datasetId = parseInt(req.params.id, 10);

    if (isNaN(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const [dataset] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    if (dataset.status !== 'ANALYSIS_IN_PROGRESS') {
      return res.status(400).json({ error: 'Dataset is not currently processing' });
    }

    // Attempt to notify worker to abort
    try {
      await fetch(`${WORKER_URL}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (cancelErr) {
      console.warn('Worker unreachable on stop signal (proceeding with status update):', cancelErr);
    }

    // Mark as FAILED so user can retry
    const errorMsg = 'Analysis stopped by user. Click Try Again to restart when ready.';
    await db.update(datasets).set({
      status: 'FAILED',
      errorMessage: errorMsg,
      updatedAt: new Date(),
    }).where(eq(datasets.id, datasetId));

    res.json({ message: 'Analysis stopped successfully', status: 'FAILED' });
  } catch (err: any) {
    console.error('Error stopping dataset analysis:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/datasets/:id/retry
// Retry/re-run analysis on a failed or stuck dataset
router.post('/:id/retry', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const datasetId = parseInt(req.params.id);

    if (isNaN(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    // 1. Verify ownership
    const [dataset] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    // 2. Clean up any existing feedback_results for this dataset's reviews
    const datasetReviews = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.datasetId, datasetId));

    const reviewIds = datasetReviews.map((r: any) => r.id);
    if (reviewIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < reviewIds.length; i += chunkSize) {
        const chunk = reviewIds.slice(i, i + chunkSize);
        await db.delete(feedbackResults).where(inArray(feedbackResults.reviewId, chunk));
      }
    }

    // 3. Check if reviews already exist in DB
    let totalReviews = reviewIds.length;

    if (totalReviews === 0) {
      // Tier 2: Stream from R2 and re-parse reviews
      console.log(`Dataset ${datasetId} has 0 reviews in DB. Streaming from R2 (${dataset.filePath})...`);
      const getObjectRes = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: dataset.filePath,
      }));

      if (!getObjectRes.Body) {
        return res.status(404).json({ error: 'Dataset CSV file not found in storage' });
      }

      const stream = getObjectRes.Body as Readable;
      const parsedRows: any[] = [];
      let productNameKey = '';
      let reviewTextKey = '';

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('headers', (headers) => {
            headers.forEach((h: string) => {
              if (!productNameKey && isProductCol(h)) productNameKey = h;
              if (!reviewTextKey && isReviewCol(h)) reviewTextKey = h;
            });
          })
          .on('data', (data) => {
            if (productNameKey && reviewTextKey && data[productNameKey] && data[reviewTextKey]) {
              parsedRows.push({
                datasetId: dataset.id,
                productName: String(data[productNameKey]).substring(0, 255),
                reviewText: String(data[reviewTextKey]),
              });
            }
          })
          .on('error', (err) => reject(err))
          .on('end', () => resolve());
      });

      if (parsedRows.length === 0) {
        await db.update(datasets).set({
          status: 'FAILED',
          errorMessage: 'No valid product or review rows found in the CSV.'
        }).where(eq(datasets.id, datasetId));
        return res.status(400).json({ error: 'No valid reviews could be extracted from the file' });
      }

      const chunkSize = 1000;
      for (let i = 0; i < parsedRows.length; i += chunkSize) {
        await db.insert(reviews).values(parsedRows.slice(i, i + chunkSize));
      }
      totalReviews = parsedRows.length;
    }

    // 4. Mark status = ANALYSIS_IN_PROGRESS, clear error_message
    await db.update(datasets).set({
      status: 'ANALYSIS_IN_PROGRESS',
      totalReviews,
      processedReviews: 0,
      errorMessage: null,
      updatedAt: new Date(),
    }).where(eq(datasets.id, datasetId));

    // 5. Trigger Python worker synchronously with timeout
    try {
      const workerRes = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId }),
        signal: AbortSignal.timeout(3000),
      });

      if (!workerRes.ok) {
        const errText = await workerRes.text();
        throw new Error(`Worker returned HTTP ${workerRes.status}: ${errText}`);
      }
    } catch (err: any) {
      console.error('Failed to trigger Python worker on retry:', err);
      const errorMsg = 'Cannot restart analysis: Worker service is offline or paused. Please start the worker and retry.';
      await db.update(datasets).set({
        status: 'FAILED',
        errorMessage: errorMsg,
        updatedAt: new Date(),
      }).where(eq(datasets.id, datasetId));

      return res.status(503).json({
        error: 'Python worker service is offline or paused. Please start the worker server before retrying.'
      });
    }

    res.json({ message: 'Dataset analysis restarted successfully' });

  } catch (error: any) {
    console.error('Error retrying dataset analysis:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

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

    // 0. If dataset is currently being processed, notify Python worker to stop immediately
    if (dataset.status === 'ANALYSIS_IN_PROGRESS') {
      try {
        console.log(`Aborting ongoing analysis for dataset ${datasetId}...`);
        await fetch(`${WORKER_URL}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset_id: datasetId }),
          signal: AbortSignal.timeout(2000),
        });
      } catch (cancelErr) {
        console.warn('Could not reach worker to cancel analysis (proceeding with deletion):', cancelErr);
      }
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
    }

    // 5. Refund Storage Quota
    const fileSizeMb = Number(dataset.fileSizeMb);
    const [subscription] = await db.select().from(activeSubscriptions).where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));
    
    if (subscription) {
      const currentUsed = Number(subscription.usedStorageMb);
      const newUsed = Math.max(0, currentUsed - fileSizeMb);
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
