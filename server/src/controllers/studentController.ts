import { Request, Response } from 'express';
import * as studentService from '../services/studentService';

// GET /api/student/profile/:uid
export async function getProfile(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const profile = await studentService.getStudentProfile(uid);

        if (!profile) {
            res.status(404).json({ error: 'Student profile not found' });
            return;
        }

        res.status(200).json({ data: profile });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get profile';
        res.status(500).json({ error: message });
    }
}

// GET /api/student/sessions/:uid
export async function getSessions(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const statusFilter = req.query.status as string | undefined;
        const sessions = await studentService.getStudentSessions(uid, statusFilter);
        res.status(200).json({ data: sessions });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get sessions';
        res.status(500).json({ error: message });
    }
}

// GET /api/student/progress/:uid
export async function getProgress(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const progress = await studentService.getStudentProgress(uid);
        res.status(200).json({ data: progress });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get progress';
        res.status(500).json({ error: message });
    }
}

// GET /api/student/history/:uid
export async function getHistory(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const history = await studentService.getSessionHistory(uid);
        res.status(200).json({ data: history });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get history';
        res.status(500).json({ error: message });
    }
}
