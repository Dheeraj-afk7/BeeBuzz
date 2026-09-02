import { Router } from 'express';
import { getNotifications, markAsRead, getUnreadCount } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread', getUnreadCount);
router.put('/:id/read', markAsRead);

export default router;
