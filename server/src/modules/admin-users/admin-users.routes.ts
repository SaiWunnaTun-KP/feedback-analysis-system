import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/authMiddleware.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getUserFeedbacks,
} from './admin-users.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/status', updateUserStatus);
router.get('/:id/feedbacks', getUserFeedbacks);

export default router;
