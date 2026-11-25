import { db } from '../../database/index.js';
import { feedbacks, users } from '../../database/schema.js';
import { eq, desc, asc, isNull, and, or, ilike, count, inArray } from 'drizzle-orm';

export async function createFeedbackRecord(data: {
  retailerId: number;
  subject: string;
  message: string;
}) {
  const result = await db
    .insert(feedbacks)
    .values({
      retailerId: data.retailerId,
      subject: data.subject,
      message: data.message,
      status: 'pending',
    })
    .returning();
  return result[0];
}

export async function listUserFeedbacks(retailerId: number) {
  return db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.retailerId, retailerId), isNull(feedbacks.deletedAt)))
    .orderBy(desc(feedbacks.createdAt));
}

export async function listAllFeedbacksPaginated(params: {
  includeDeleted: boolean;
  status?: string;
  search?: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}) {
  const conditions: any[] = [];

  if (!params.includeDeleted) {
    conditions.push(isNull(feedbacks.deletedAt));
  }
  if (params.status && params.status !== 'all') {
    conditions.push(eq(feedbacks.status, params.status as any));
  }
  if (params.search) {
    const searchPattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(feedbacks.subject, searchPattern),
        ilike(feedbacks.message, searchPattern),
        ilike(users.username, searchPattern),
        ilike(users.email, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countQuery = db
    .select({ total: count() })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.retailerId, users.id));
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [countResult] = await countQuery;
  const total = Number(countResult?.total || 0);

  const dataQuery = db
    .select({
      feedbackId: feedbacks.feedbackId,
      retailerId: feedbacks.retailerId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      repliedBy: feedbacks.repliedBy,
      deletedAt: feedbacks.deletedAt,
      retailerName: users.username,
      retailerEmail: users.email,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.retailerId, users.id));

  if (whereClause) {
    dataQuery.where(whereClause);
  }

  const orderField = params.sortOrder === 'asc' ? asc(feedbacks.createdAt) : desc(feedbacks.createdAt);
  const data = await dataQuery.orderBy(orderField).limit(params.limit).offset(params.offset);

  const [pendingResult] = await db
    .select({ pending: count() })
    .from(feedbacks)
    .where(and(isNull(feedbacks.deletedAt), eq(feedbacks.status, 'pending')));

  return {
    data,
    total,
    pendingCount: Number(pendingResult?.pending || 0),
  };
}

export async function listAllFeedbacks(includeDeleted: boolean) {
  const baseQuery = db
    .select({
      feedbackId: feedbacks.feedbackId,
      retailerId: feedbacks.retailerId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      repliedBy: feedbacks.repliedBy,
      deletedAt: feedbacks.deletedAt,
      retailerName: users.username,
      retailerEmail: users.email,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.retailerId, users.id));

  return includeDeleted
    ? baseQuery.orderBy(desc(feedbacks.createdAt))
    : baseQuery.where(isNull(feedbacks.deletedAt)).orderBy(desc(feedbacks.createdAt));
}

export async function findFeedbackWithRetailerById(feedbackId: number) {
  const result = await db
    .select({
      feedbackId: feedbacks.feedbackId,
      retailerId: feedbacks.retailerId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      repliedBy: feedbacks.repliedBy,
      retailerName: users.username,
      retailerEmail: users.email,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.retailerId, users.id))
    .where(eq(feedbacks.feedbackId, feedbackId));

  return result[0] || null;
}

export async function findFeedbackById(feedbackId: number) {
  const result = await db.select().from(feedbacks).where(eq(feedbacks.feedbackId, feedbackId));
  return result[0] || null;
}

export async function findRetailerEmailById(userId: number) {
  const result = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return result[0]?.email || null;
}

export async function updateFeedbackStatusById(
  feedbackId: number,
  status: 'pending' | 'sent' | 'replied',
  repliedBy: number
) {
  const result = await db
    .update(feedbacks)
    .set({ status, repliedBy })
    .where(eq(feedbacks.feedbackId, feedbackId))
    .returning();
  return result[0] || null;
}

export async function bulkSoftDeleteFeedbacks(ids: number[]) {
  return db
    .update(feedbacks)
    .set({ deletedAt: new Date() })
    .where(and(inArray(feedbacks.feedbackId, ids), isNull(feedbacks.deletedAt)))
    .returning();
}

export async function softDeleteFeedbackById(feedbackId: number) {
  const result = await db
    .update(feedbacks)
    .set({ deletedAt: new Date() })
    .where(and(eq(feedbacks.feedbackId, feedbackId), isNull(feedbacks.deletedAt)))
    .returning();
  return result[0] || null;
}
