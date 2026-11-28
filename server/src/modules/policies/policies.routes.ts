import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/authMiddleware.js';
import { getAllPolicies, getPolicyByType, updatePolicy } from './policies.controller.js';

const router = Router();

router.get('/', getAllPolicies);
router.get('/:type', getPolicyByType);
router.put('/:type', authenticate, requireAdmin, updatePolicy);

export default router;
