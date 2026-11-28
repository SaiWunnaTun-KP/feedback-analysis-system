import { db } from '../../database/index.js';
import { activeSubscriptions, plans, users } from '../../database/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export async function checkInactivePlanExpirations() {
  const now = new Date();
  try {
    await db.execute(sql`
      UPDATE active_subscriptions
      SET status = 'EXPIRED', updated_at = NOW()
      FROM plans
      WHERE active_subscriptions.plan_id = plans.id
        AND plans.status = 'INACTIVE'
        AND active_subscriptions.status = 'ACTIVE'
        AND (
          (active_subscriptions.current_period_end IS NOT NULL AND active_subscriptions.current_period_end < ${now})
          OR
          (active_subscriptions.current_period_end IS NULL AND active_subscriptions.end_date < ${now})
        )
    `);
  } catch (err) {
    console.error('Error checking inactive plan expirations:', err);
  }
}

export async function getUserById(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

export async function getUserFreeTrialStatus(userId: number) {
  const [user] = await db
    .select({ hasUsedFreeTrial: users.hasUsedFreeTrial })
    .from(users)
    .where(eq(users.id, userId));
  return user || null;
}

export async function findActiveSubscription(userId: number) {
  const [subscription] = await db
    .select()
    .from(activeSubscriptions)
    .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));
  return subscription || null;
}

export async function findAnySubscriptionForUser(userId: number) {
  const [subscription] = await db
    .select()
    .from(activeSubscriptions)
    .where(eq(activeSubscriptions.userId, userId));
  return subscription || null;
}

export async function findPlanById(planId: number) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  return plan || null;
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function upsertIncompleteSubscription(data: {
  existingSubId?: number;
  userId: number;
  planId: number;
  stripeSubscriptionId: string;
  startDate: Date;
  endDate: Date;
}) {
  if (data.existingSubId) {
    await db
      .update(activeSubscriptions)
      .set({
        planId: data.planId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'INCOMPLETE',
        updatedAt: new Date(),
      })
      .where(eq(activeSubscriptions.id, data.existingSubId));
  } else {
    await db.insert(activeSubscriptions).values({
      userId: data.userId,
      planId: data.planId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'INCOMPLETE',
    });
  }
}

export async function activateOrUpgradeSubscription(data: {
  existingSubId?: number;
  userId: number;
  planId: number;
  startDate: Date;
  endDate: Date;
}) {
  if (data.existingSubId) {
    const [subscription] = await db
      .update(activeSubscriptions)
      .set({
        planId: data.planId,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(activeSubscriptions.id, data.existingSubId))
      .returning();
    return subscription;
  }

  const [subscription] = await db
    .insert(activeSubscriptions)
    .values({
      userId: data.userId,
      planId: data.planId,
      startDate: data.startDate,
      endDate: data.endDate,
      usedStorageMb: '0',
      status: 'ACTIVE',
    })
    .returning();
  return subscription;
}

export async function syncSubscriptionRecord(
  subscriptionId: number,
  status: string,
  currentPeriodEnd: Date
) {
  await db
    .update(activeSubscriptions)
    .set({
      status: status as any,
      currentPeriodEnd,
      endDate: currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(activeSubscriptions.id, subscriptionId));
}
