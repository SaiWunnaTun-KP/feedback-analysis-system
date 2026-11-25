import { Router, NextFunction, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../middlewares/authMiddleware.js';
import {
  createFeedback,
  getMyFeedbacks,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedbackStatus,
  replyToFeedback,
  bulkDeleteFeedbacks,
  deleteFeedback,
} from './feedbacks.controller.js';

const router = Router();

const submitFeedbackRateLimit = (_req: AuthRequest, _res: Response, next: NextFunction) => {
  next();
};

router.post('/', authenticate, submitFeedbackRateLimit, createFeedback);
router.get('/my', authenticate, getMyFeedbacks);
router.get('/', authenticate, requireAdmin, getAllFeedbacks);
router.get('/:id', authenticate, getFeedbackById);
router.patch('/:id/status', authenticate, requireAdmin, updateFeedbackStatus);
router.post('/:id/reply', authenticate, requireAdmin, replyToFeedback);
router.post('/bulk-delete', authenticate, requireAdmin, bulkDeleteFeedbacks);
router.delete('/:id', authenticate, requireAdmin, deleteFeedback);

export default router;
