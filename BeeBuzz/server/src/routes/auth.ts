import { Router } from 'express';
import { register, login, getMe, updateProfile, uploadDocument } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/document', authenticate, uploadDocument);

export default router;
