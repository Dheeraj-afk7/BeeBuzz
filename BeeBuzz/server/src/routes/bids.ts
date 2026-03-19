import { Router } from 'express';
import { createBid, getBids, getMyBids, acceptBid, rejectBid } from '../controllers/bidController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('driver', 'admin'), createBid);
router.get('/load/:loadId', getBids);
router.get('/my', authorize('driver', 'admin'), getMyBids);
router.put('/:bidId/accept', authorize('shipper', 'admin'), acceptBid);
router.put('/:bidId/reject', authorize('shipper', 'admin'), rejectBid);

export default router;
