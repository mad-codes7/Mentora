import { Request, Response } from 'express';
import * as tutorService from '../services/tutorService';

// POST /api/tutor/register
export async function registerTutor(req: Request, res: Response) {
    try {
        const { uid, displayName, email, photoURL, subjects, bio, experience, hourlyRate, verificationQuizScore, qualification } = req.body;

        if (!uid || !displayName || !email || !subjects?.length || verificationQuizScore === undefined) {
            res.status(400).json({ error: 'Missing required fields: uid, displayName, email, subjects, verificationQuizScore' });
            return;
        }

        const result = await tutorService.registerTutor({
            uid, displayName, email, photoURL, subjects, bio, experience, hourlyRate, verificationQuizScore, qualification,
        });

        res.status(201).json({ message: 'Tutor registered successfully', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to register tutor';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/profile/:uid
export async function getProfile(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const profile = await tutorService.getTutorProfile(uid);

        if (!profile) {
            res.status(404).json({ error: 'Tutor profile not found' });
            return;
        }

        res.status(200).json({ data: profile });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get profile';
        res.status(500).json({ error: message });
    }
}

// PUT /api/tutor/profile
export async function updateProfile(req: Request, res: Response) {
    try {
        const { uid, subjects, availability, bio, experience, hourlyRate, qualification } = req.body;

        if (!uid) {
            res.status(400).json({ error: 'Missing uid' });
            return;
        }

        const result = await tutorService.updateTutorProfile(uid, {
            subjects, availability, bio, experience, hourlyRate, qualification,
        });

        res.status(200).json({ message: 'Profile updated', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update profile';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/sessions/:uid
export async function getSessions(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const statusFilter = req.query.status as string | undefined;
        console.log('[getSessions] uid:', uid, 'statusFilter:', statusFilter);
        const sessions = await tutorService.getTutorSessions(uid, statusFilter);
        console.log('[getSessions] found sessions:', sessions.length);
        res.status(200).json({ data: sessions });
    } catch (error: unknown) {
        console.error('[getSessions] ERROR:', error);
        const message = error instanceof Error ? error.message : 'Failed to get sessions';
        res.status(500).json({ error: message });
    }
}

// PUT /api/tutor/sessions/:sessionId/accept
export async function acceptSession(req: Request, res: Response) {
    try {
        const sessionId = req.params.sessionId as string;
        const { tutorId } = req.body;

        if (!tutorId) {
            res.status(400).json({ error: 'Missing tutorId' });
            return;
        }

        const result = await tutorService.acceptSession(sessionId, tutorId);
        res.status(200).json({ message: 'Session accepted', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to accept session';
        res.status(500).json({ error: message });
    }
}

// PUT /api/tutor/sessions/:sessionId/status
export async function updateSessionStatus(req: Request, res: Response) {
    try {
        const sessionId = req.params.sessionId as string;
        const { status, ...additionalData } = req.body;

        if (!status) {
            res.status(400).json({ error: 'Missing status' });
            return;
        }

        const validStatuses = ['searching', 'pending_payment', 'pending_tutor_approval', 'paid_waiting', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const result = await tutorService.updateSessionStatus(sessionId, status, additionalData);
        res.status(200).json({ message: 'Session status updated', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update session status';
        res.status(500).json({ error: message });
    }
}

// POST /api/tutor/sessions/:sessionId/upload
export async function uploadDocument(req: Request, res: Response) {
    try {
        const sessionId = req.params.sessionId as string;
        const { name, url, uploadedBy } = req.body;

        if (!name || !url || !uploadedBy) {
            res.status(400).json({ error: 'Missing required fields: name, url, uploadedBy' });
            return;
        }

        const result = await tutorService.addDocumentToSession(sessionId, { name, url, uploadedBy });
        res.status(201).json({ message: 'Document uploaded to session', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to upload document';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/wallet/:uid
export async function getWallet(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const wallet = await tutorService.getWalletBalance(uid);
        res.status(200).json({ data: wallet });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get wallet';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/analytics/:uid
export async function getAnalytics(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const analytics = await tutorService.getAnalytics(uid);
        res.status(200).json({ data: analytics });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get analytics';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/sessions/available/list
export async function getAvailableSessions(req: Request, res: Response) {
    try {
        const sessions = await tutorService.getAvailableSessions();
        res.status(200).json({ data: sessions });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get available sessions';
        res.status(500).json({ error: message });
    }
}

// GET /api/tutor/requests/:uid
export async function getBookingRequests(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const requests = await tutorService.getBookingRequests(uid);
        res.status(200).json({ data: requests });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get booking requests';
        res.status(500).json({ error: message });
    }
}
