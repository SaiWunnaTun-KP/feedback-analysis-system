import { db } from '../../database/index.js';
import { planAnnouncements, activeSubscriptions, plans, users } from '../../database/schema.js';
import { eq, and, sql, desc, asc, gte } from 'drizzle-orm';

export async function getUserCreatedAt(userId: number) {
  const [userRecord] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  return userRecord?.createdAt || null;
}

export async function findOldestUnseenAnnouncement(userId: number, userCreatedAt: Date) {
  const unseenList = await db
    .select({
      announcementId: planAnnouncements.announcementId,
      planId: planAnnouncements.planId,
      action: planAnnouncements.action,
      title: planAnnouncements.title,
      message: planAnnouncements.message,
      targetUserIds: planAnnouncements.targetUserIds,
      createdAt: planAnnouncements.createdAt,
    })
    .from(planAnnouncements)
    .where(
      and(
        sql`(${planAnnouncements.targetUserIds} IS NULL OR ${userId} = ANY(${planAnnouncements.targetUserIds}))`,
        gte(planAnnouncements.createdAt, userCreatedAt),
        sql`NOT EXISTS (
          SELECT 1 FROM user_announcement_views 
          WHERE user_announcement_views.user_id = ${userId} 
          AND user_announcement_views.announcement_id = ${planAnnouncements.announcementId}
        )`
      )
    )
    .orderBy(asc(planAnnouncements.createdAt), asc(planAnnouncements.announcementId))
    .limit(1);

  return unseenList[0] || null;
}

export async function findLatestUserSubscriptionForPlan(userId: number, planId: number) {
  const [userSub] = await db
    .select()
    .from(activeSubscriptions)
    .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.planId, planId)))
    .orderBy(desc(activeSubscriptions.id))
    .limit(1);
  return userSub || null;
}

export async function findActiveUserSubscriptionForPlan(userId: number, planId: number) {
  const [planRecord] = await db.select().from(plans).where(eq(plans.id, planId));
  const [userSub] = await db
    .select()
    .from(activeSubscriptions)
    .where(
      and(
        eq(activeSubscriptions.userId, userId),
        eq(activeSubscriptions.planId, planId),
        eq(activeSubscriptions.status, 'ACTIVE')
      )
    )
    .orderBy(desc(activeSubscriptions.id))
    .limit(1);

  return { planRecord: planRecord || null, userSub: userSub || null };
}

export async function markAnnouncementSeen(userId: number, announcementId: number) {
  await db.execute(sql`
    INSERT INTO user_announcement_views (user_id, announcement_id, seen_at)
    VALUES (${userId}, ${announcementId}, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, announcement_id) DO NOTHING
  `);
}
