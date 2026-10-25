import { Router } from 'express';
import { db } from '../database';
import { feedbacks, users } from '../database/schema';
import { eq, desc, asc, isNull, and, or, ilike, count } from 'drizzle-orm';
import { sendFeedbackReplyEmail } from '../services/emailService';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// Rate limiting (simple placeholder)
const submitFeedbackRateLimit = (req: AuthRequest, res: any, next: any) => {
  // In a real app, use express-rate-limit
  next();
};

// Create Feedback
router.post('/', authenticate, submitFeedbackRateLimit, async (req: AuthRequest, res) => {
  try {
    const { subject, message } = req.body;
    const retailer_id = req.user?.userId;

    if (!retailer_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    if (subject.length > 255) {
      return res.status(400).json({ error: 'Subject must be ≤ 255 characters' });
    }

    const result = await db.insert(feedbacks).values({
      retailerId: retailer_id,
      subject: subject.trim(),
      message: message.trim(),
      status: 'pending'
    }).returning();

    res.status(201).json({
      message: 'Feedback submitted successfully',
      data: result[0]
    });
  } catch (err) {
    console.error('Error in POST /api/feedbacks:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get User's Own Feedbacks
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const retailer_id = req.user?.userId;
    if (!retailer_id) return res.status(401).json({ error: 'Unauthorized' });

    const result = await db.select()
      .from(feedbacks)
      .where(and(eq(feedbacks.retailerId, retailer_id), isNull(feedbacks.deletedAt)))
      .orderBy(desc(feedbacks.createdAt));
      
    res.json({ data: result });
  } catch (err) {
    console.error('Error in GET /api/feedbacks/my:', err);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

// Admin: List all feedbacks (supports search, status filter, sorting, and server-driven pagination)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search ? (req.query.search as string).trim() : undefined;
    const status = req.query.status ? (req.query.status as string).trim() : undefined;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Build conditions array
    const conditions = [];

    if (!includeDeleted) {
      conditions.push(isNull(feedbacks.deletedAt));
    }

    if (status && status !== 'all') {
      conditions.push(eq(feedbacks.status, status as any));
    }

    if (search) {
      const searchPattern = `%${search}%`;
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

    // Check if server pagination / search / filter is requested
    const isPaginated = page !== undefined || limit !== undefined || search !== undefined || status !== undefined;

    if (isPaginated) {
      const currentPage = Math.max(1, page || 1);
      const pageSize = Math.max(1, limit || 10);
      const offset = (currentPage - 1) * pageSize;

      // Count query
      const countQuery = db
        .select({ total: count() })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.retailerId, users.id));

      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = Number(countResult?.total || 0);

      // Data query
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

      const orderField = sortOrder === 'asc' ? asc(feedbacks.createdAt) : desc(feedbacks.createdAt);
      const result = await dataQuery.orderBy(orderField).limit(pageSize).offset(offset);

      // Pending feedbacks count for badge indicator
      const [pendingResult] = await db
        .select({ pending: count() })
        .from(feedbacks)
        .where(and(isNull(feedbacks.deletedAt), eq(feedbacks.status, 'pending')));

      return res.json({
        data: result,
        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
        pendingCount: Number(pendingResult?.pending || 0),
      });
    }

    // Default / fallback: return all (with backward compatibility)
    const baseQuery = db.select({
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

    const result = includeDeleted 
      ? await baseQuery.orderBy(desc(feedbacks.createdAt))
      : await baseQuery.where(isNull(feedbacks.deletedAt)).orderBy(desc(feedbacks.createdAt));
    
    res.json({ data: result });
  } catch (err) {
    console.error('Error in GET /api/feedbacks:', err);
    res.status(500).json({ error: 'Failed to fetch all feedbacks' });
  }
});

// Admin: Get single feedback
router.get('/:id', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const result = await db.select({
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
    .where(eq(feedbacks.feedbackId, parseInt(id)));

    if (result.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = result[0];
    if (!isAdmin && feedback.retailerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ data: feedback });
  } catch (err) {
    console.error('Error in GET /api/feedbacks/:id:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Admin: Update Status
router.patch('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const admin_id = req.user?.userId;

    if (!['sent', 'replied', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.update(feedbacks)
      .set({ 
        status: status as 'pending' | 'sent' | 'replied', 
        repliedBy: admin_id 
      })
      .where(eq(feedbacks.feedbackId, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Status updated', data: result[0] });
  } catch (err) {
    console.error('Error in PATCH /api/feedbacks/:id/status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Admin: Reply to feedback
router.post('/:id/reply', authenticate, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;
    const admin_id = req.user?.userId;

    if (!replyMessage || typeof replyMessage !== 'string') {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const result = await db.select().from(feedbacks).where(eq(feedbacks.feedbackId, parseInt(id)));
    if (result.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = result[0];
    
    // Get user email
    const userResult = await db.select().from(users).where(eq(users.id, feedback.retailerId));
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    const retailerEmail = userResult[0].email;

    // Send the email
    await sendFeedbackReplyEmail(retailerEmail, feedback.subject, replyMessage);

    // Update status to replied
    const updatedFeedback = await db.update(feedbacks)
      .set({ 
        status: 'replied', 
        repliedBy: admin_id 
      })
      .where(eq(feedbacks.feedbackId, parseInt(id)))
      .returning();

    res.json({ message: 'Reply sent successfully', data: updatedFeedback[0] });
  } catch (err) {
    console.error('Error in POST /api/feedbacks/:id/reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Admin: Soft delete feedback
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;

    const result = await db.update(feedbacks)
      .set({ deletedAt: new Date() })
      .where(and(eq(feedbacks.feedbackId, parseInt(id)), isNull(feedbacks.deletedAt)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Feedback not found or already deleted' });
    }

    res.json({ message: 'Feedback soft-deleted successfully', data: result[0] });
  } catch (err) {
    console.error('Error in DELETE /api/feedbacks/:id:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
