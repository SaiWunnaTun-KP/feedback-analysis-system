import { Router } from 'express';
import { loginAdmin, getLockoutStatus } from './admin-auth.controller.js';

const router = Router();

router.post('/login', loginAdmin);
router.get('/lockout-status', getLockoutStatus);

export default router;
