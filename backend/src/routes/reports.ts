import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listReports,
  createReport,
  getReport,
  updateReport,
  deleteReport,
  computeBlock,
  exportReportPDF,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/', listReports);
router.post('/', createReport);
router.get('/:id', getReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);
router.post('/:id/compute', computeBlock);
router.get('/:id/export/pdf', exportReportPDF);

export default router;
