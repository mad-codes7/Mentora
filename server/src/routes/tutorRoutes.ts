import { Router } from 'express';
import * as tutorController from '../controllers/tutorController';

const router = Router();

// Registration
router.post('/register', tutorController.registerTutor);

// Profile
router.get('/profile/:uid', tutorController.getProfile);
router.put('/profile', tutorController.updateProfile);

// Sessions
router.get('/sessions/available/list', tutorController.getAvailableSessions);
router.get('/sessions/:uid', tutorController.getSessions);
router.put('/sessions/:sessionId/accept', tutorController.acceptSession);
router.put('/sessions/:sessionId/status', tutorController.updateSessionStatus);
router.post('/sessions/:sessionId/upload', tutorController.uploadDocument);

// Wallet
router.get('/wallet/:uid', tutorController.getWallet);

// Analytics
router.get('/analytics/:uid', tutorController.getAnalytics);

export default router;
