import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';

const router = Router();

// Process payment to admin
router.post('/pay', paymentController.processPayment);

// Transfer to tutor wallet after session completion
router.post('/complete-transfer/:sessionId', paymentController.completeTransfer);

// Get tutor wallet balance & transactions
router.get('/wallet/:tutorId', paymentController.getWallet);

// Redeem wallet points
router.post('/redeem', paymentController.redeemPoints);

export default router;
