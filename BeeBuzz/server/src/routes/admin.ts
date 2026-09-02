import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getStats, getUsers, getUser, verifyUser,
  getLoads, getPayments, getPendingDocuments
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/verify', verifyUser);
router.get('/loads', getLoads);
router.get('/payments', getPayments);
router.get('/documents', getPendingDocuments);

export default router;
