import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { getUnseenAnnouncement, markAnnouncementAsSeen } from './announcements.controller.js';

const router = Router();

router.use(authenticate);

router.get('/unseen', getUnseenAnnouncement);
router.post('/:id/seen', markAnnouncementAsSeen);

export default router;
