import { db } from '../../database/index.js';
import {
  users,
  feedbacks,
  datasets,
  activeSubscriptions,
  plans,
  feedbackResults,
} from '../../database/schema.js';
import { eq, sql, and, gte, isNull, count } from 'drizzle-orm';

export async function checkDatabaseHealth() {
  const dbStart = Date.now();
  await db.execute(sql`SELECT 1`);
  return Date.now() - dbStart;
}

export async function getRetailerUserStats(startOfMonth: Date) {
  const userStats = await db
    .select({
      status: users.status,
      count: count(),
    })
    .from(users)
    .where(eq(users.role, 'RETAIL_MANAGER'))
    .groupBy(users.status);

  const [newUsersResult] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'RETAIL_MANAGER'), gte(users.createdAt, startOfMonth)));

  return {
    userStats,
    newUsersThisMonth: Number(newUsersResult?.count || 0),
  };
}

export async function getActivePlanBreakdown() {
  return db
    .select({
      planId: plans.id,
      planName: plans.name,
      planPrice: plans.price,
      subscribersCount: count(),
    })
    .from(activeSubscriptions)
    .innerJoin(plans, eq(activeSubscriptions.planId, plans.id))
    .where(eq(activeSubscriptions.status, 'ACTIVE'))
    .groupBy(plans.id, plans.name, plans.price);
}

export async function getDatasetStats() {
  return db
    .select({
      status: datasets.status,
      count: count(),
      totalReviews: sql<number>`coalesce(sum(${datasets.totalReviews}), 0)`,
      processedReviews: sql<number>`coalesce(sum(${datasets.processedReviews}), 0)`,
      fileSizeMb: sql<number>`coalesce(sum(${datasets.fileSizeMb}), 0)`,
    })
    .from(datasets)
    .groupBy(datasets.status);
}

export async function getAspectOpinionsCount() {
  const [aspectStats] = await db.select({ count: count() }).from(feedbackResults);
  return Number(aspectStats?.count || 0);
}

export async function getSupportFeedbackStats() {
  return db
    .select({
      status: feedbacks.status,
      count: count(),
    })
    .from(feedbacks)
    .where(isNull(feedbacks.deletedAt))
    .groupBy(feedbacks.status);
}
