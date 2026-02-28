import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';

type Params = { sessionId: string; tutorId: string };

// POST /api/payment/pay
export async function processPayment(req: Request, res: Response) {
    try {
        const { sessionId, studentId, amount } = req.body;

        if (!sessionId || !studentId || !amount) {
            res.status(400).json({ error: 'Missing required fields: sessionId, studentId, amount' });
            return;
        }

        const result = await paymentService.processPaymentToAdmin({ sessionId, studentId, amount });
        res.status(200).json({ message: 'Payment processed to admin', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Payment processing failed';
        res.status(500).json({ error: message });
    }
}

// POST /api/payment/complete-transfer/:sessionId
export async function completeTransfer(req: Request<Params>, res: Response) {
    try {
        const sessionId = req.params.sessionId;

        if (!sessionId) {
            res.status(400).json({ error: 'Missing sessionId' });
            return;
        }

        const result = await paymentService.transferToTutorWallet(sessionId);
        res.status(200).json({ message: 'Funds transferred to tutor wallet', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Transfer failed';
        res.status(500).json({ error: message });
    }
}

// GET /api/payment/wallet/:tutorId
export async function getWallet(req: Request<Params>, res: Response) {
    try {
        const tutorId = req.params.tutorId;
        const wallet = await paymentService.getTutorWallet(tutorId);
        res.status(200).json({ data: wallet });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get wallet';
        res.status(500).json({ error: message });
    }
}

// POST /api/payment/redeem
export async function redeemPoints(req: Request, res: Response) {
    try {
        const { tutorId, amount } = req.body;

        if (!tutorId || !amount) {
            res.status(400).json({ error: 'Missing required fields: tutorId, amount' });
            return;
        }

        const result = await paymentService.redeemWalletPoints(tutorId, amount);
        res.status(200).json({ message: 'Redemption successful', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Redemption failed';
        res.status(500).json({ error: message });
    }
}
