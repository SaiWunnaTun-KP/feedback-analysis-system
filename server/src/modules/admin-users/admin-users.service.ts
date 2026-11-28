import { db } from '../../database/index.js';
import { users, feedbacks, datasets, activeSubscriptions, plans } from '../../database/schema.js';
import { eq, ne, or, ilike, and, desc, count, isNull } from 'drizzle-orm';

export async function listUsers(params: {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  const conditions: any[] = [eq(users.role, 'RETAIL_MANAGER')];

  if (params.status && params.status !== 'all') {
    conditions.push(eq(users.status, params.status as any));
  } else {
    conditions.push(ne(users.status, 'deleted'));
  }

  if (params.search) {
    const searchTerm = `%${params.search}%`;
    conditions.push(
      or(
        ilike(users.username, searchTerm),
        ilike(users.email, searchTerm),
        ilike(users.companyName, searchTerm)
      )
    );
  }

  const whereClause = and(...conditions);

  const totalCountResult = await db.select({ count: count() }).from(users).where(whereClause);
  const totalCount = Number(totalCountResult[0]?.count || 0);

  const data = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      companyName: users.companyName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { data, totalCount };
}

export async function getUserDetailById(userId: number) {
  const userResult = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      status: users.status,
      suspensionReason: users.suspensionReason,
      companyName: users.companyName,
      companyEmail: users.companyEmail,
      hasUsedFreeTrial: users.hasUsedFreeTrial,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (userResult.length === 0) {
    return null;
  }

  const user = userResult[0];

  const subResult = await db
    .select({
      id: activeSubscriptions.id,
      status: activeSubscriptions.status,
      usedStorageMb: activeSubscriptions.usedStorageMb,
      startDate: activeSubscriptions.startDate,
      endDate: activeSubscriptions.endDate,
      currentPeriodEnd: activeSubscriptions.currentPeriodEnd,
      planId: activeSubscriptions.planId,
      planName: plans.name,
      maxStorageMb: plans.maxStorageMb,
      planStatus: plans.status,
    })
    .from(activeSubscriptions)
    .leftJoin(plans, eq(activeSubscriptions.planId, plans.id))
    .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

  const userDatasets = await db
    .select({
      id: datasets.id,
      filename: datasets.filename,
      fileSizeMb: datasets.fileSizeMb,
      status: datasets.status,
      createdAt: datasets.createdAt,
    })
    .from(datasets)
    .where(eq(datasets.userId, userId))
    .orderBy(desc(datasets.createdAt));

  const userFeedbacks = await db
    .select({
      feedbackId: feedbacks.feedbackId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.retailerId, userId), isNull(feedbacks.deletedAt)))
    .orderBy(desc(feedbacks.createdAt));

  return {
    ...user,
    subscription: subResult[0] || null,
    datasets: userDatasets,
    feedbacks: userFeedbacks,
  };
}

export async function updateUserStatusById(userId: number, status: string, suspensionReason?: string | null) {
  const updatePayload: any = { status };
  if (status === 'suspended') {
    updatePayload.suspensionReason = suspensionReason;
  } else if (status === 'active') {
    updatePayload.suspensionReason = null;
  }

  const result = await db
    .update(users)
    .set(updatePayload)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      status: users.status,
      suspensionReason: users.suspensionReason,
      createdAt: users.createdAt,
    });

  return result[0] || null;
}

export async function userExists(userId: number) {
  const userCheck = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  return userCheck.length > 0;
}

export async function listUserFeedbacks(userId: number, limit: number, offset: number) {
  const totalCountResult = await db
    .select({ count: count() })
    .from(feedbacks)
    .where(and(eq(feedbacks.retailerId, userId), isNull(feedbacks.deletedAt)));
  const totalCount = totalCountResult[0].count;

  const data = await db
    .select({
      feedbackId: feedbacks.feedbackId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      repliedBy: feedbacks.repliedBy,
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.retailerId, userId), isNull(feedbacks.deletedAt)))
    .orderBy(desc(feedbacks.createdAt))
    .limit(limit)
    .offset(offset);

  return { data, totalCount };
}
