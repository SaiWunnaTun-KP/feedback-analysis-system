import { Request, Response } from 'express';
import * as faqsService from './faqs.service.js';

export async function getPublicFaqs(_req: Request, res: Response) {
  try {
    const list = await faqsService.listPublicFaqs();
    res.json({ data: list });
  } catch (error) {
    console.error('Error fetching public FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
}

export async function getAdminFaqs(req: Request, res: Response) {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const search = req.query.search ? (req.query.search as string).trim() : undefined;

    if (page !== undefined || limit !== undefined || search !== undefined) {
      const currentPage = Math.max(1, page || 1);
      const pageSize = Math.max(1, limit || 10);
      const offset = (currentPage - 1) * pageSize;

      const { data, total } = await faqsService.listAdminFaqsPaginated(search, pageSize, offset);

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

    const list = await faqsService.listAllAdminFaqs();
    res.json({ data: list });
  } catch (error) {
    console.error('Error fetching admin FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
}

export async function getFaqById(req: Request, res: Response) {
  try {
    const faqId = parseInt(String(req.params.id));
    const faq = await faqsService.findFaqById(faqId);

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ data: faq });
  } catch (error) {
    console.error('Error fetching FAQ by id:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
}

export async function createFaq(req: Request, res: Response) {
  try {
    const { question, answer, sortOrder = 0, isVisible = true } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const newFaq = await faqsService.createFaqRecord({
      question: question.trim(),
      answer: answer.trim(),
      sortOrder: typeof sortOrder === 'number' ? sortOrder : parseInt(sortOrder) || 0,
      isVisible: Boolean(isVisible),
    });

    res.status(201).json({ message: 'FAQ created successfully', data: newFaq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
}

export async function updateFaq(req: Request, res: Response) {
  try {
    const faqId = parseInt(String(req.params.id));
    const { question, answer, sortOrder, isVisible } = req.body;

    const updates: any = {};
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

    const updatedFaq = await faqsService.updateFaqRecord(faqId, updates);
    if (!updatedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ updated successfully', data: updatedFaq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
}

export async function toggleFaqVisibility(req: Request, res: Response) {
  try {
    const faqId = parseInt(String(req.params.id));
    const isVisible = req.body?.isVisible;

    let targetVisibility: boolean;
    if (isVisible !== undefined) {
      targetVisibility = Boolean(isVisible);
    } else {
      const existing = await faqsService.findFaqById(faqId);
      if (!existing) {
        return res.status(404).json({ error: 'FAQ not found' });
      }
      targetVisibility = !existing.isVisible;
    }

    const updatedFaq = await faqsService.updateFaqRecord(faqId, { isVisible: targetVisibility });
    if (!updatedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: `FAQ is now ${targetVisibility ? 'visible' : 'hidden'}`, data: updatedFaq });
  } catch (error) {
    console.error('Error toggling FAQ visibility:', error);
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
}

export async function deleteFaq(req: Request, res: Response) {
  try {
    const faqId = parseInt(String(req.params.id));
    const deletedFaq = await faqsService.deleteFaqRecord(faqId);

    if (!deletedFaq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
}
