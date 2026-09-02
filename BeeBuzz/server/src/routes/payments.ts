import { Router } from 'express';
import { getEarnings, getPayments } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/earnings', getEarnings);
router.get('/', getPayments);

export default router;
