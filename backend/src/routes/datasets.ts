import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import {
  listDatasets,
  uploadDataset,
  getDataset,
  deleteDataset,
} from '../controllers/datasetController';

const router = Router();

// All dataset routes require authentication
router.use(authenticate);

router.get('/', listDatasets);
router.post('/', uploadMiddleware.single('file'), uploadDataset);
router.get('/:id', getDataset);
router.delete('/:id', deleteDataset);

export default router;
