import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/authMiddleware.js';
import {
  getPublicFaqs,
  getAdminFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  toggleFaqVisibility,
  deleteFaq,
} from './faqs.controller.js';

export const publicFaqsRouter = Router();
publicFaqsRouter.get('/', getPublicFaqs);

export const adminFaqsRouter = Router();
adminFaqsRouter.use(authenticate);
adminFaqsRouter.use(requireAdmin);
adminFaqsRouter.get('/', getAdminFaqs);
adminFaqsRouter.get('/:id', getFaqById);
adminFaqsRouter.post('/', createFaq);
adminFaqsRouter.patch('/:id', updateFaq);
adminFaqsRouter.patch('/:id/visibility', toggleFaqVisibility);
adminFaqsRouter.delete('/:id', deleteFaq);
