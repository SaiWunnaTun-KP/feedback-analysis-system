import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  getProductMatrix,
  getOverviewReport,
  getDrilldownReport,
  getProductDetail,
} from './reports.controller.js';

const router = Router();

router.use(authenticate);

router.get('/product-matrix', getProductMatrix);
router.get('/:datasetId/product-matrix', getProductMatrix);
router.get('/:datasetId/overview', getOverviewReport);
router.get('/:datasetId/drilldown', getDrilldownReport);
router.get('/:datasetId/product/:productName', getProductDetail);
router.get('/product/:productName', getProductDetail);

export default router;
