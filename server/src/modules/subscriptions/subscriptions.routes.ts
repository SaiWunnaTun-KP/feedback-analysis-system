import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  getMySubscription,
  createSubscription,
  cancelSubscription,
  purchasePlanMock,
  getInvoices,
  syncSubscription,
} from './subscriptions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMySubscription);
router.post('/create', createSubscription);
router.post('/cancel', cancelSubscription);
router.post('/purchase', purchasePlanMock);
router.get('/invoices', getInvoices);
router.post('/sync', syncSubscription);

export default router;
