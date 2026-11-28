import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import { sendFeedbackReplyEmail } from '../../services/emailService.js';
import * as feedbacksService from './feedbacks.service.js';

export async function createFeedback(req: AuthRequest, res: Response) {
  try {
    const { subject, message } = req.body;
    const retailerId = req.user?.userId;

    if (!retailerId) return res.status(401).json({ error: 'Unauthorized' });
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    if (subject.length > 255) {
      return res.status(400).json({ error: 'Subject must be ≤ 255 characters' });
    }

    const created = await feedbacksService.createFeedbackRecord({
      retailerId,
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      data: created,
    });
  } catch (err) {
    console.error('Error in POST /api/feedbacks:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

export async function getMyFeedbacks(req: AuthRequest, res: Response) {
  try {
    const retailerId = req.user?.userId;
    if (!retailerId) return res.status(401).json({ error: 'Unauthorized' });

    const data = await feedbacksService.listUserFeedbacks(retailerId);
    res.json({ data });
  } catch (err) {
    console.error('Error in GET /api/feedbacks/my:', err);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
}

export async function getAllFeedbacks(req: AuthRequest, res: Response) {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search ? (req.query.search as string).trim() : undefined;
    const status = req.query.status ? (req.query.status as string).trim() : undefined;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const isPaginated = page !== undefined || limit !== undefined || search !== undefined || status !== undefined;

    if (isPaginated) {
      const currentPage = Math.max(1, page || 1);
      const pageSize = Math.max(1, limit || 10);
      const offset = (currentPage - 1) * pageSize;

      const { data, total, pendingCount } = await feedbacksService.listAllFeedbacksPaginated({
        includeDeleted,
        status,
        search,
        sortOrder,
        limit: pageSize,
        offset,
      });

      return res.json({
        data,
        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
        pendingCount,
      });
    }

    const result = await feedbacksService.listAllFeedbacks(includeDeleted);
    res.json({ data: result });
  } catch (err) {
    console.error('Error in GET /api/feedbacks:', err);
    res.status(500).json({ error: 'Failed to fetch all feedbacks' });
  }
}

export async function getFeedbackById(req: AuthRequest, res: Response) {
  try {
    const feedbackId = parseInt(String(req.params.id));
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const feedback = await feedbacksService.findFeedbackWithRetailerById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (!isAdmin && feedback.retailerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ data: feedback });
  } catch (err) {
    console.error('Error in GET /api/feedbacks/:id:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

export async function updateFeedbackStatus(req: AuthRequest, res: Response) {
  try {
    const feedbackId = parseInt(String(req.params.id));
    const { status } = req.body;
    const adminId = req.user!.userId;

    if (!['sent', 'replied', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await feedbacksService.updateFeedbackStatusById(feedbackId, status, adminId);
    if (!updated) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Status updated', data: updated });
  } catch (err) {
    console.error('Error in PATCH /api/feedbacks/:id/status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
}

export async function replyToFeedback(req: AuthRequest, res: Response) {
  try {
    const feedbackId = parseInt(String(req.params.id));
    const { replyMessage } = req.body;
    const adminId = req.user!.userId;

    if (!replyMessage || typeof replyMessage !== 'string') {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const feedback = await feedbacksService.findFeedbackById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const retailerEmail = await feedbacksService.findRetailerEmailById(feedback.retailerId);
    if (!retailerEmail) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    await sendFeedbackReplyEmail(retailerEmail, feedback.subject, replyMessage);

    const updatedFeedback = await feedbacksService.updateFeedbackStatusById(feedbackId, 'replied', adminId);
    res.json({ message: 'Reply sent successfully', data: updatedFeedback });
  } catch (err) {
    console.error('Error in POST /api/feedbacks/:id/reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
}

export async function bulkDeleteFeedbacks(req: AuthRequest, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array of feedback IDs' });
    }

    const numericIds = ids
      .map((id: any) => parseInt(id, 10))
      .filter((id: number) => !isNaN(id));

    if (numericIds.length === 0) {
      return res.status(400).json({ error: 'No valid feedback IDs provided' });
    }

    const deleted = await feedbacksService.bulkSoftDeleteFeedbacks(numericIds);

    res.json({
      message: `${deleted.length} feedback(s) deleted successfully`,
      deletedCount: deleted.length,
      data: deleted,
    });
  } catch (err) {
    console.error('Error in POST /api/feedbacks/bulk-delete:', err);
    res.status(500).json({ error: 'Failed to bulk delete feedbacks' });
  }
}

export async function deleteFeedback(req: AuthRequest, res: Response) {
  try {
    const feedbackId = parseInt(String(req.params.id));
    const deleted = await feedbacksService.softDeleteFeedbackById(feedbackId);

    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found or already deleted' });
    }

    res.json({ message: 'Feedback soft-deleted successfully', data: deleted });
  } catch (err) {
    console.error('Error in DELETE /api/feedbacks/:id:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
}
