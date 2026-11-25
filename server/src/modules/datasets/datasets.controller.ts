import { Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import * as datasetsService from './datasets.service.js';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8001';

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
  } catch {
    isWorkerReachable = false;
  }

  if (!isWorkerReachable) {
    console.warn(`[Watchdog] Worker is unreachable or paused. Marking dataset ${dataset.id} as FAILED.`);
    const errorMsg = 'Analysis stopped: Python worker service is offline or paused. Please restart the worker and click Try Again.';
    await datasetsService.markDatasetFailed(dataset.id, errorMsg);
    dataset.status = 'FAILED';
    dataset.errorMessage = errorMsg;
    return false;
  }

  if (ageMs > 15000 && !activeDatasets.includes(dataset.id)) {
    console.warn(`[Watchdog] Worker is alive, but dataset ${dataset.id} is not in active_datasets. Marking as FAILED.`);
    const errorMsg = 'Analysis interrupted: Worker is not actively processing this dataset. Please click Try Again to restart.';
    await datasetsService.markDatasetFailed(dataset.id, errorMsg);
    dataset.status = 'FAILED';
    dataset.errorMessage = errorMsg;
    return false;
  }

  return true;
}

export async function getActiveDataset(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const active = await datasetsService.findActiveDatasetForUser(userId);

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
}

export async function getDatasets(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const isAll = req.query.all === 'true';
    const total = await datasetsService.countUserDatasets(userId);

    if (isAll) {
      const userDatasets = await datasetsService.listUserDatasets(userId);

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

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const offset = req.query.offset !== undefined
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : (page - 1) * limit;

    const totalPages = Math.ceil(total / limit) || 1;
    const userDatasets = await datasetsService.listUserDatasets(userId, limit, offset);

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
}

export async function uploadDataset(req: any, res: Response) {
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
    const { user, subscription } = await datasetsService.getUserAndActiveSubscription(userId);

    let maxStorageMb = 0;
    let usedStorageMb = 0;

    if (subscription) {
      maxStorageMb = await datasetsService.getPlanMaxStorageMb(subscription.planId);
      usedStorageMb = Number(subscription.usedStorageMb);
    } else if (user && !user.hasUsedFreeTrial) {
      maxStorageMb = 75;
    } else {
      return res.status(402).json({ error: 'No active subscription and free trial exhausted. Please upgrade.' });
    }

    if (usedStorageMb + fileSizeMb > maxStorageMb) {
      return res.status(402).json({
        error: `Upload exceeds quota. Used: ${usedStorageMb.toFixed(2)}MB, Max: ${maxStorageMb}MB, File: ${fileSizeMb.toFixed(2)}MB`,
      });
    }

    // 2. CSV Template Validation
    try {
      const firstNewlineIdx = file.buffer.indexOf('\n');
      const headerLine = firstNewlineIdx !== -1
        ? file.buffer.subarray(0, firstNewlineIdx).toString('utf-8')
        : file.buffer.toString('utf-8');

      const headers = headerLine.split(',').map((h: string) => h.trim());
      const hasProduct = headers.some(isProductCol);
      const hasReview = headers.some(isReviewCol);

      if (!hasProduct || !hasReview) {
        return res.status(400).json({
          error: 'Invalid CSV format. Could not find a product column (e.g., "Product Name", "product") or a review column (e.g., "Review Text", "review"). Please check your headers.',
        });
      }
    } catch (err) {
      console.error('CSV Parsing Error:', err);
      return res.status(400).json({ error: 'Failed to read CSV headers.' });
    }

    // 3. Cloudflare R2 Upload
    const objectKey = `${userId}/${uuidv4()}-${file.originalname}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: objectKey,
        ContentType: 'text/csv',
        Body: file.buffer,
      })
    );

    // 4. Update Quota
    if (subscription) {
      await datasetsService.updateSubscriptionUsedStorage(subscription.id, usedStorageMb + fileSizeMb);
    } else {
      await datasetsService.markUserFreeTrialUsed(userId);
    }

    // 5. Database Logging
    const dataset = await datasetsService.createDatasetRecord({
      userId,
      filename: file.originalname,
      filePath: objectKey,
      fileSizeMb: fileSizeMb.toString(),
    });

    // 6. Asynchronous CSV Parsing & Review Insertion
    const results: Array<{ datasetId: number; productName: string; reviewText: string }> = [];
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
            reviewText: String(data[reviewTextKey]),
          });
        }
      })
      .on('error', async (parseErr) => {
        console.error(`CSV stream error for dataset ${dataset.id}:`, parseErr);
        await datasetsService.markDatasetFailed(
          dataset.id,
          'CSV stream parsing error: ' + (parseErr.message || 'Malformed CSV')
        );
      })
      .on('end', async () => {
        try {
          if (results.length === 0) {
            console.warn(`No valid review rows found for dataset ${dataset.id}`);
            await datasetsService.markDatasetFailed(
              dataset.id,
              'No valid rows matching product and review columns were found.'
            );
            return;
          }

          await datasetsService.insertReviewsInChunks(results);
          await datasetsService.updateDatasetTotalReviews(dataset.id, results.length);

          console.log(`Inserted ${results.length} reviews for dataset ${dataset.id}. Launching Python worker...`);

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
          await datasetsService.markDatasetFailed(
            dataset.id,
            'Analysis start error: ' + (dbErr.message || 'Worker service is unreachable or paused. Please restart the worker and click Try Again.')
          );
        }
      });

    res.json({ message: 'File uploaded successfully', dataset });
  } catch (error) {
    console.error('Error uploading dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function renameDataset(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const datasetId = parseInt(String(req.params.id), 10);
    const { filename } = req.body;

    if (isNaN(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      return res.status(400).json({ error: 'Dataset name cannot be empty' });
    }

    const trimmedName = filename.trim();
    if (trimmedName.length > 255) {
      return res.status(400).json({ error: 'Dataset name cannot exceed 255 characters' });
    }

    const dataset = await datasetsService.findDatasetByIdAndUser(datasetId, userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const updatedDataset = await datasetsService.renameDatasetById(datasetId, trimmedName);

    res.json({
      message: 'Dataset renamed successfully',
      dataset: updatedDataset,
    });
  } catch (error: any) {
    console.error('Error renaming dataset:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function stopDatasetAnalysis(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const datasetId = parseInt(String(req.params.id), 10);

    if (isNaN(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const dataset = await datasetsService.findDatasetByIdAndUser(datasetId, userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    if (dataset.status !== 'ANALYSIS_IN_PROGRESS') {
      return res.status(400).json({ error: 'Dataset is not currently processing' });
    }

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

    const errorMsg = 'Analysis stopped by user. Click Try Again to restart when ready.';
    await datasetsService.markDatasetFailed(datasetId, errorMsg);

    res.json({ message: 'Analysis stopped successfully', status: 'FAILED' });
  } catch (err: any) {
    console.error('Error stopping dataset analysis:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

export async function retryDatasetAnalysis(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const datasetId = parseInt(String(req.params.id));

    if (isNaN(datasetId)) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const dataset = await datasetsService.findDatasetByIdAndUser(datasetId, userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const reviewIds = await datasetsService.getDatasetReviewIds(datasetId);
    if (reviewIds.length > 0) {
      await datasetsService.deleteFeedbackResultsForReviews(reviewIds);
    }

    let totalReviews = reviewIds.length;

    if (totalReviews === 0) {
      console.log(`Dataset ${datasetId} has 0 reviews in DB. Streaming from R2 (${dataset.filePath})...`);
      const getObjectRes = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: dataset.filePath,
        })
      );

      if (!getObjectRes.Body) {
        return res.status(404).json({ error: 'Dataset CSV file not found in storage' });
      }

      const stream = getObjectRes.Body as Readable;
      const parsedRows: Array<{ datasetId: number; productName: string; reviewText: string }> = [];
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
        await datasetsService.markDatasetFailed(datasetId, 'No valid product or review rows found in the CSV.');
        return res.status(400).json({ error: 'No valid reviews could be extracted from the file' });
      }

      await datasetsService.insertReviewsInChunks(parsedRows);
      totalReviews = parsedRows.length;
    }

    await datasetsService.markDatasetInProgress(datasetId, totalReviews);

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
      await datasetsService.markDatasetFailed(datasetId, errorMsg);

      return res.status(503).json({
        error: 'Python worker service is offline or paused. Please start the worker server before retrying.',
      });
    }

    res.json({ message: 'Dataset analysis restarted successfully' });
  } catch (error: any) {
    console.error('Error retrying dataset analysis:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteDataset(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const datasetId = parseInt(String(req.params.id));

    const dataset = await datasetsService.findDatasetByIdAndUser(datasetId, userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

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

    const reviewIds = await datasetsService.getDatasetReviewIds(datasetId);
    if (reviewIds.length > 0) {
      await datasetsService.deleteFeedbackResultsForReviews(reviewIds);
    }

    await datasetsService.deleteReviewsAndDataset(datasetId);

    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: dataset.filePath,
        })
      );
    } catch (s3Error) {
      console.error('Error deleting file from R2:', s3Error);
    }

    const fileSizeMb = Number(dataset.fileSizeMb);
    const { subscription } = await datasetsService.getUserAndActiveSubscription(userId);
    if (subscription) {
      const currentUsed = Number(subscription.usedStorageMb);
      const newUsed = Math.max(0, currentUsed - fileSizeMb);
      await datasetsService.updateSubscriptionUsedStorage(subscription.id, newUsed);
    }

    res.json({ message: 'Dataset successfully deleted' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
