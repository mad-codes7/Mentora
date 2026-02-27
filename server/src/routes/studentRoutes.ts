import { Router } from 'express';
import * as studentController from '../controllers/studentController';

const router = Router();

// Profile
router.get('/profile/:uid', studentController.getProfile);

// Sessions
router.get('/sessions/:uid', studentController.getSessions);

// Progress (assessment deltas)
router.get('/progress/:uid', studentController.getProgress);

// History (completed sessions)
router.get('/history/:uid', studentController.getHistory);

export default router;
