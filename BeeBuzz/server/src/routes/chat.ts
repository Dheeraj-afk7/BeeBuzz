import { Router } from 'express';
import { sendMessage, getMessages } from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', sendMessage);
router.get('/:loadId', getMessages);

export default router;
