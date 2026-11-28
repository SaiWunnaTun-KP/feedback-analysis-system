import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  requestPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
  deleteAccount,
} from './profile.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/password/request-code', requestPasswordResetCode);
router.post('/password/verify-code', verifyPasswordResetCode);
router.post('/password/reset', resetPassword);
router.delete('/', deleteAccount);

export default router;
