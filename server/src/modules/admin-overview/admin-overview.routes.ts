import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/authMiddleware.js';
import { getAdminOverview } from './admin-overview.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAdminOverview);

export default router;
