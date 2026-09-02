import { Router } from 'express';
import { createLoad, getLoads, getLoad, updateLoad, acceptLoad, updateLoadStatus, updateLocation, cancelLoad, uploadProofOfDelivery, requestPaymentReleaseOTP, verifyPODAndReleasePayment, rejectPod, getAiPricingRecommendation } from '../controllers/loadController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('shipper', 'admin'), createLoad);
router.post('/ai-pricing', authorize('shipper', 'admin'), getAiPricingRecommendation);
router.get('/', getLoads);
router.get('/:id', getLoad);
router.put('/:id', authorize('shipper', 'admin'), updateLoad);
router.post('/:id/accept', authorize('driver', 'admin'), acceptLoad);
router.put('/:id/status', authorize('driver', 'shipper', 'admin'), updateLoadStatus);
router.put('/:id/location', authorize('driver', 'admin'), updateLocation);
router.put('/:id/pod', authorize('driver', 'admin'), uploadProofOfDelivery);
router.post('/:id/request-otp', authorize('shipper', 'admin'), requestPaymentReleaseOTP);
router.post('/:id/verify-pod', authorize('shipper', 'admin'), verifyPODAndReleasePayment);
router.post('/:id/reject-pod', authorize('shipper', 'admin'), rejectPod);
router.delete('/:id', authorize('shipper', 'admin'), cancelLoad);

export default router;
