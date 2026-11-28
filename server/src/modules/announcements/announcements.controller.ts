import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import * as announcementsService from './announcements.service.js';

export async function getUnseenAnnouncement(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role === 'ADMIN') {
      return res.json({ announcement: null });
    }

    const userId = req.user!.userId;
    let userCreatedAt = req.user?.createdAt;

    if (!userCreatedAt) {
      userCreatedAt = await announcementsService.getUserCreatedAt(userId) ?? undefined;
    }

    if (!userCreatedAt) {
      return res.json({ announcement: null });
    }

    const item = await announcementsService.findOldestUnseenAnnouncement(userId, userCreatedAt);
    if (!item) {
      return res.json({ announcement: null });
    }

    let personalizedMessage = item.message;

    if (item.action === 'deactivated' && item.planId) {
      const userSub = await announcementsService.findLatestUserSubscriptionForPlan(userId, item.planId);
      let endDateStr = 'the end of your current billing period';
      if (userSub?.endDate || userSub?.currentPeriodEnd) {
        const d = new Date((userSub.endDate || userSub.currentPeriodEnd)!);
        endDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      personalizedMessage = personalizedMessage
        .replace('{user’s personal end_date}', endDateStr)
        .replace('{end_date}', endDateStr);
    }

    if (item.action === 'edited' && item.planId) {
      const { planRecord, userSub } = await announcementsService.findActiveUserSubscriptionForPlan(
        userId,
        item.planId
      );

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
}

export async function markAnnouncementAsSeen(req: AuthRequest, res: Response) {
  try {
    const announcementId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    if (isNaN(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    await announcementsService.markAnnouncementSeen(userId, announcementId);
    res.json({ success: true, message: 'Announcement marked as seen' });
  } catch (error) {
    console.error('Error marking announcement as seen:', error);
    res.status(500).json({ error: 'Failed to mark announcement as seen' });
  }
}
