import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { createAuthRateLimiter } from '../middleware/authRateLimit.js';

const router = Router();
const registerLimiter = createAuthRateLimiter();
const loginLimiter = createAuthRateLimiter();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);

export default router;
