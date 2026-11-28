import { db } from '../../database/index.js';
import { plans, activeSubscriptions, planAnnouncements, users } from '../../database/schema.js';
import { eq, and, count, ilike } from 'drizzle-orm';

export async function listPlansPaginated(search?: string, limit?: number, offset?: number) {
  const whereClause = search ? ilike(plans.name, `%${search}%`) : undefined;

  const countQuery = db.select({ total: count() }).from(plans);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [totalResult] = await countQuery;
  const total = Number(totalResult?.total || 0);

  const dataQuery = db.select().from(plans);
  if (whereClause) {
    dataQuery.where(whereClause);
  }
  const orderedQuery = dataQuery.orderBy(plans.id);
  const pagedPlans =
    limit !== undefined && offset !== undefined
      ? await orderedQuery.limit(limit).offset(offset)
      : await orderedQuery;

  return { plans: pagedPlans, total };
}

export async function listAllPlans() {
  return db.select().from(plans).orderBy(plans.id);
}

export async function listActivePlansPublic() {
  return db.select().from(plans).where(eq(plans.status, 'ACTIVE')).orderBy(plans.id);
}

export async function getActiveSubscribersCountMap() {
  const subsCounts = await db
    .select({
      planId: activeSubscriptions.planId,
      count: count(),
    })
    .from(activeSubscriptions)
    .where(eq(activeSubscriptions.status, 'ACTIVE'))
    .groupBy(activeSubscriptions.planId);

  const countMap = new Map<number, number>();
  for (const row of subsCounts) {
    countMap.set(row.planId, Number(row.count));
  }
  return countMap;
}

export async function findPlanById(planId: number) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  return plan || null;
}

export async function createPlanRecord(data: {
  name: string;
  price: string;
  maxStorageMb: number;
  durationDays: number;
  stripeProductId: string;
  stripePriceId: string;
}) {
  const [newPlan] = await db.insert(plans).values(data).returning();
  return newPlan;
}

export async function updatePlanRecord(
  planId: number,
  data: {
    name?: string;
    price?: string;
    maxStorageMb?: number;
    durationDays?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    stripePriceId?: string;
  }
) {
  const [updatedPlan] = await db
    .update(plans)
    .set({
      name: data.name,
      price: data.price,
      maxStorageMb: data.maxStorageMb,
      durationDays: data.durationDays,
      status: data.status,
      stripePriceId: data.stripePriceId,
      updatedAt: new Date(),
    })
    .where(eq(plans.id, planId))
    .returning();
  return updatedPlan || null;
}

export async function setPlanStatus(planId: number, status: 'ACTIVE' | 'INACTIVE') {
  const [updatedPlan] = await db
    .update(plans)
    .set({ status, updatedAt: new Date() })
    .where(eq(plans.id, planId))
    .returning();
  return updatedPlan || null;
}

export async function countActiveSubscribersForPlan(planId: number) {
  const [subCountResult] = await db
    .select({ count: count() })
    .from(activeSubscriptions)
    .where(and(eq(activeSubscriptions.planId, planId), eq(activeSubscriptions.status, 'ACTIVE')));
  return Number(subCountResult?.count || 0);
}

export async function deletePlanRecord(planId: number) {
  const [deletedPlan] = await db.delete(plans).where(eq(plans.id, planId)).returning();
  return deletedPlan || null;
}

export async function createPlanAnnouncement(data: {
  planId: number | null;
  action: 'created' | 'edited' | 'deactivated' | 'activated' | 'deleted';
  title: string;
  message: string;
  targetUserIds: number[] | null;
}) {
  await db.insert(planAnnouncements).values(data);
}

export async function getAllActiveRetailManagers() {
  return db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(and(eq(users.status, 'active'), eq(users.role, 'RETAIL_MANAGER')));
}

export async function getActiveSubscribersForPlan(planId: number) {
  return db
    .select({
      userId: activeSubscriptions.userId,
      usedStorageMb: activeSubscriptions.usedStorageMb,
      endDate: activeSubscriptions.endDate,
      currentPeriodEnd: activeSubscriptions.currentPeriodEnd,
      email: users.email,
      username: users.username,
    })
    .from(activeSubscriptions)
    .innerJoin(users, eq(users.id, activeSubscriptions.userId))
    .where(
      and(
        eq(activeSubscriptions.planId, planId),
        eq(activeSubscriptions.status, 'ACTIVE'),
        eq(users.status, 'active'),
        eq(users.role, 'RETAIL_MANAGER')
      )
    );
}
