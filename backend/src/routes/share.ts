import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createShareLink,
  listShareLinks,
  listAllUserShareLinks,
  revokeShareLink,
  viewSharedReport,
  computeSharedBlock,
} from '../controllers/shareController';

const router = Router();

// Owner operations — require login
router.post('/create', authenticate, createShareLink);
router.get('/all', authenticate, listAllUserShareLinks);
router.get('/list/:reportId', authenticate, listShareLinks);
router.patch('/revoke/:linkId', authenticate, revokeShareLink);

// Public view — NO authentication required
router.get('/:token', viewSharedReport);
router.post('/:token/compute', computeSharedBlock);

export default router;
