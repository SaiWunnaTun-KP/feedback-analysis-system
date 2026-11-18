import { Router } from 'express';
import { db } from '../database/index.js';
import { planAnnouncements, userAnnouncementViews, activeSubscriptions, plans, users } from '../database/schema.js';
import { eq, and, sql, desc, asc, gte } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/announcements/unseen
// Returns the oldest unseen announcement applicable to the current user
router.get('/unseen', authenticate, async (req: any, res) => {
  try {
    // Only RETAIL_MANAGER users should receive customer-facing plan announcements.
    // Administrators manage plans and should never receive these announcements.
    if (req.user?.role === 'ADMIN') {
      return res.json({ announcement: null });
    }

    const userId = req.user.userId;
    let userCreatedAt = req.user.createdAt;

    // Safety fallback: fetch user's account creation date if not populated on req.user
    if (!userCreatedAt) {
      const [userRecord] = await db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, userId));
      userCreatedAt = userRecord?.createdAt;
    }

    if (!userCreatedAt) {
      return res.json({ announcement: null });
    }

    // Fetch announcements that:
    // 1. Have targetUserIds IS NULL (all users) OR userId is in targetUserIds
    // 2. Were created on or after the user's account creation date (createdAt >= userCreatedAt)
    //    -> Ensures newly created user accounts do NOT see announcements that were published earlier than their account creation
    // 3. Have NOT been marked seen by this user in user_announcement_views
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

    if (unseenList.length === 0) {
      return res.json({ announcement: null });
    }

    const item = unseenList[0];
    let personalizedMessage = item.message;

    // Personalize for 'deactivated' action: inject personal end date
    if (item.action === 'deactivated' && item.planId) {
      const [userSub] = await db
        .select()
        .from(activeSubscriptions)
        .where(
          and(
            eq(activeSubscriptions.userId, userId),
            eq(activeSubscriptions.planId, item.planId)
          )
        )
        .orderBy(desc(activeSubscriptions.id))
        .limit(1);

      let endDateStr = 'the end of your current billing period';
      if (userSub?.endDate || userSub?.currentPeriodEnd) {
        const d = new Date(userSub.endDate || userSub.currentPeriodEnd!);
        endDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      personalizedMessage = personalizedMessage
        .replace('{user’s personal end_date}', endDateStr)
        .replace('{end_date}', endDateStr);
    }

    // Personalize for 'edited' action: if new quota is lower than current usage, add warning
    if (item.action === 'edited' && item.planId) {
      const [planRecord] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, item.planId));

      const [userSub] = await db
        .select()
        .from(activeSubscriptions)
        .where(
          and(
            eq(activeSubscriptions.userId, userId),
            eq(activeSubscriptions.planId, item.planId),
            eq(activeSubscriptions.status, 'ACTIVE')
          )
        )
        .orderBy(desc(activeSubscriptions.id))
        .limit(1);

      if (planRecord && userSub) {
        const usedStorage = parseFloat(userSub.usedStorageMb || '0');
        if (usedStorage > planRecord.maxStorageMb && !personalizedMessage.includes('Warning: Your current storage usage exceeds')) {
          personalizedMessage += `\n\nWarning: Your current storage usage exceeds the new quota.\nPlease free up space or upgrade to avoid restrictions.`;
        }
      }
    }

    res.json({
      announcement: {
        announcementId: item.announcementId,
        planId: item.planId,
        action: item.action,
        title: item.title,
        message: personalizedMessage,
        createdAt: item.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching unseen announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// POST /api/announcements/:id/seen
// Marks the announcement as seen for the current user
router.post('/:id/seen', authenticate, async (req: any, res) => {
  try {
    const announcementId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    // Insert into user_announcement_views with on conflict do nothing
    await db.execute(sql`
      INSERT INTO user_announcement_views (user_id, announcement_id, seen_at)
      VALUES (${userId}, ${announcementId}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, announcement_id) DO NOTHING
    `);

    res.json({ success: true, message: 'Announcement marked as seen' });
  } catch (error) {
    console.error('Error marking announcement as seen:', error);
    res.status(500).json({ error: 'Failed to mark announcement as seen' });
  }
});

export default router;
