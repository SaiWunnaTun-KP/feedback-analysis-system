import { db } from '../../database/index.js';
import { activeSubscriptions, datasets, users, reviews, feedbackResults } from '../../database/schema.js';
import { eq, and, desc, count, inArray } from 'drizzle-orm';

export async function findActiveDatasetForUser(userId: number) {
  const [active] = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.userId, userId), eq(datasets.status, 'ANALYSIS_IN_PROGRESS')))
    .orderBy(desc(datasets.updatedAt))
    .limit(1);
  return active || null;
}

export async function markDatasetFailed(datasetId: number, errorMessage: string) {
  await db
    .update(datasets)
    .set({
      status: 'FAILED',
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(datasets.id, datasetId));
}

export async function countUserDatasets(userId: number) {
  const [countResult] = await db
    .select({ count: count() })
    .from(datasets)
    .where(eq(datasets.userId, userId));
  return Number(countResult?.count || 0);
}

export async function listUserDatasets(userId: number, limit?: number, offset?: number) {
  const query = db
    .select()
    .from(datasets)
    .where(eq(datasets.userId, userId))
    .orderBy(desc(datasets.createdAt));

  if (limit !== undefined && offset !== undefined) {
    return query.limit(limit).offset(offset);
  }
  return query;
}

export async function getUserAndActiveSubscription(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [subscription] = await db
    .select()
    .from(activeSubscriptions)
    .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));
  return { user: user || null, subscription: subscription || null };
}

export async function getPlanMaxStorageMb(planId: number) {
  const planRes = await db.execute(`SELECT max_storage_mb FROM plans WHERE id = ${planId}`);
  if (planRes.rows.length > 0) {
    return Number(planRes.rows[0].max_storage_mb);
  }
  return 0;
}

export async function updateSubscriptionUsedStorage(subscriptionId: number, newUsedStorageMb: number) {
  await db
    .update(activeSubscriptions)
    .set({ usedStorageMb: newUsedStorageMb.toString() })
    .where(eq(activeSubscriptions.id, subscriptionId));
}

export async function markUserFreeTrialUsed(userId: number) {
  await db.update(users).set({ hasUsedFreeTrial: true }).where(eq(users.id, userId));
}

export async function createDatasetRecord(data: {
  userId: number;
  filename: string;
  filePath: string;
  fileSizeMb: string;
}) {
  const [dataset] = await db
    .insert(datasets)
    .values({
      userId: data.userId,
      filename: data.filename,
      filePath: data.filePath,
      fileSizeMb: data.fileSizeMb,
      status: 'ANALYSIS_IN_PROGRESS',
      totalReviews: 0,
      processedReviews: 0,
      errorMessage: null,
    })
    .returning();
  return dataset;
}

export async function insertReviewsInChunks(
  rows: Array<{ datasetId: number; productName: string; reviewText: string }>,
  chunkSize = 1000
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db.insert(reviews).values(rows.slice(i, i + chunkSize));
  }
}

export async function updateDatasetTotalReviews(datasetId: number, totalReviews: number) {
  await db
    .update(datasets)
    .set({
      totalReviews,
      processedReviews: 0,
      errorMessage: null,
    })
    .where(eq(datasets.id, datasetId));
}

export async function findDatasetByIdAndUser(datasetId: number, userId: number) {
  const [dataset] = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
  return dataset || null;
}

export async function renameDatasetById(datasetId: number, filename: string) {
  const [updatedDataset] = await db
    .update(datasets)
    .set({
      filename,
      updatedAt: new Date(),
    })
    .where(eq(datasets.id, datasetId))
    .returning();
  return updatedDataset;
}

export async function getDatasetReviewIds(datasetId: number) {
  const datasetReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.datasetId, datasetId));
  return datasetReviews.map((r) => r.id);
}

export async function deleteFeedbackResultsForReviews(reviewIds: number[], chunkSize = 1000) {
  for (let i = 0; i < reviewIds.length; i += chunkSize) {
    const chunk = reviewIds.slice(i, i + chunkSize);
    await db.delete(feedbackResults).where(inArray(feedbackResults.reviewId, chunk));
  }
}

export async function markDatasetInProgress(datasetId: number, totalReviews: number) {
  await db
    .update(datasets)
    .set({
      status: 'ANALYSIS_IN_PROGRESS',
      totalReviews,
      processedReviews: 0,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(datasets.id, datasetId));
}

export async function deleteReviewsAndDataset(datasetId: number) {
  await db.delete(reviews).where(eq(reviews.datasetId, datasetId));
  await db.delete(datasets).where(eq(datasets.id, datasetId));
}
