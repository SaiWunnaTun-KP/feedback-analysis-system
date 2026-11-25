import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  getActiveDataset,
  getDatasets,
  uploadDataset,
  renameDataset,
  stopDatasetAnalysis,
  retryDatasetAnalysis,
  deleteDataset,
} from './datasets.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/active', getActiveDataset);
router.get('/', getDatasets);
router.post('/upload', upload.single('file'), uploadDataset);
router.patch('/:id/rename', renameDataset);
router.patch('/:id', renameDataset);
router.post('/:id/stop', stopDatasetAnalysis);
router.post('/:id/retry', retryDatasetAnalysis);
router.delete('/:id', deleteDataset);

export default router;
