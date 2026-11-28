import { Router } from 'express';
import {
  register,
  login,
  requestForgotPasswordCode,
  verifyForgotPasswordCode,
  resetForgotPassword,
} from './user-auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password/request-code', requestForgotPasswordCode);
router.post('/forgot-password/verify-code', verifyForgotPasswordCode);
router.post('/forgot-password/reset', resetForgotPassword);

export default router;
