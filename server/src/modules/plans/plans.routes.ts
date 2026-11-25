import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireAdmin } from '../../middlewares/authMiddleware.js';
import {
  getPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
  activatePlan,
  deletePlan,
} from './plans.controller.js';

const router = Router();

router.get('/', optionalAuthenticate, getPlans);
router.post('/', authenticate, requireAdmin, createPlan);
router.put('/:id', authenticate, requireAdmin, updatePlan);
router.patch('/:id', authenticate, requireAdmin, updatePlan);
router.patch('/:id/deactivate', authenticate, requireAdmin, deactivatePlan);
router.patch('/:id/activate', authenticate, requireAdmin, activatePlan);
router.delete('/:id', authenticate, requireAdmin, deletePlan);

export default router;
