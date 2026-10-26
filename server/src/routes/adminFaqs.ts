import { Router } from 'express';
import { db } from '../database/index.js';
import { faqs } from '../database/schema.js';
import { eq, asc, count, or, ilike } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/faqs
// List all FAQs (including hidden) with search and pagination ordered by sort_order
router.get('/', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search ? (req.query.search as string).trim() : undefined;

    let whereClause = undefined;
    if (search) {
      const searchTerm = `%${search}%`;
      whereClause = or(
        ilike(faqs.question, searchTerm),
        ilike(faqs.answer, searchTerm)
      );
    }

    if (page !== undefined || limit !== undefined || search !== undefined) {
      const currentPage = Math.max(1, page || 1);
      const pageSize = Math.max(1, limit || 10);
      const offset = (currentPage - 1) * pageSize;

      const countQuery = db.select({ total: count() }).from(faqs);
      if (whereClause) {
        countQuery.where(whereClause);
      }
      const [totalResult] = await countQuery;
      const total = Number(totalResult?.total || 0);

      const dataQuery = db.select().from(faqs);
      if (whereClause) {
        dataQuery.where(whereClause);
      }
      const data = await dataQuery
        .orderBy(asc(faqs.sortOrder), asc(faqs.faqId))
        .limit(pageSize)
        .offset(offset);

      return res.json({
        data,
        pagination: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      });
    }

    const list = await db
      .select()
      .from(faqs)
      .orderBy(asc(faqs.sortOrder), asc(faqs.faqId));

    res.json({ data: list });
  } catch (error) {
    console.error('Error fetching admin FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// GET /api/admin/faqs/:id
// Get single FAQ
router.get('/:id', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);
    const result = await db.select().from(faqs).where(eq(faqs.faqId, faqId));

    if (result.length === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ data: result[0] });
  } catch (error) {
    console.error('Error fetching FAQ by id:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
});

// POST /api/admin/faqs
// Create FAQ
router.post('/', async (req, res) => {
  try {
    const { question, answer, sortOrder = 0, isVisible = true } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const [newFaq] = await db
      .insert(faqs)
      .values({
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder) || 0,
        isVisible: Boolean(isVisible),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ message: 'FAQ created successfully', data: newFaq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// PATCH /api/admin/faqs/:id
// Update question, answer, sort_order, is_visible
router.patch('/:id', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);
    const { question, answer, sortOrder, isVisible } = req.body;

    const updates: any = {
      updatedAt: new Date(),
    };

    if (question !== undefined && question.trim()) {
      updates.question = question.trim();
    }
    if (answer !== undefined && answer.trim()) {
      updates.answer = answer.trim();
    }
    if (sortOrder !== undefined) {
      updates.sortOrder = typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder) || 0;
    }
    if (isVisible !== undefined) {
      updates.isVisible = Boolean(isVisible);
    }

    const [updatedFaq] = await db
      .update(faqs)
      .set(updates)
      .where(eq(faqs.faqId, faqId))
      .returning();

    if (!updatedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ updated successfully', data: updatedFaq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// PATCH /api/admin/faqs/:id/visibility
// Toggle is_visible
router.patch('/:id/visibility', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);
    const isVisible = req.body?.isVisible;

    let targetVisibility: boolean;

    if (isVisible !== undefined) {
      targetVisibility = Boolean(isVisible);
    } else {
      // Toggle
      const existing = await db.select().from(faqs).where(eq(faqs.faqId, faqId));
      if (existing.length === 0) {
        return res.status(404).json({ error: 'FAQ not found' });
      }
      targetVisibility = !existing[0].isVisible;
    }

    const [updatedFaq] = await db
      .update(faqs)
      .set({
        isVisible: targetVisibility,
        updatedAt: new Date(),
      })
      .where(eq(faqs.faqId, faqId))
      .returning();

    if (!updatedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: `FAQ is now ${targetVisibility ? 'visible' : 'hidden'}`, data: updatedFaq });
  } catch (error) {
    console.error('Error toggling FAQ visibility:', error);
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
});

// DELETE /api/admin/faqs/:id
// Hard Delete
router.delete('/:id', async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);

    const [deletedFaq] = await db
      .delete(faqs)
      .where(eq(faqs.faqId, faqId))
      .returning();

    if (!deletedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

export default router;
