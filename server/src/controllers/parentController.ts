import { Request, Response } from 'express';
import * as parentService from '../services/parentService';

// GET /api/parent/profile/:uid
export async function getProfile(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const profile = await parentService.getParentProfile(uid);

        if (!profile) {
            res.status(404).json({ error: 'Parent profile not found' });
            return;
        }

        res.status(200).json({ data: profile });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get profile';
        res.status(500).json({ error: message });
    }
}

// POST /api/parent/link-student
export async function linkStudent(req: Request, res: Response) {
    try {
        const { parentId, parentCode } = req.body;

        if (!parentId || !parentCode) {
            res.status(400).json({ error: 'Missing required fields: parentId, parentCode' });
            return;
        }

        const result = await parentService.linkStudent(parentId, parentCode);
        res.status(200).json({ message: 'Student linked successfully', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to link student';
        res.status(400).json({ error: message });
    }
}

// GET /api/parent/students/:uid
export async function getLinkedStudents(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const students = await parentService.getLinkedStudents(uid);
        res.status(200).json({ data: students });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get linked students';
        res.status(500).json({ error: message });
    }
}

// GET /api/parent/sessions/:uid
export async function getSessions(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const sessions = await parentService.getStudentSessionsForParent(uid);
        res.status(200).json({ data: sessions });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get sessions';
        res.status(500).json({ error: message });
    }
}

// GET /api/parent/spending/:uid
export async function getSpending(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const spending = await parentService.getSpendingSummary(uid);
        res.status(200).json({ data: spending });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get spending summary';
        res.status(500).json({ error: message });
    }
}

// GET /api/parent/reviews/:uid
export async function getReviews(req: Request, res: Response) {
    try {
        const uid = req.params.uid as string;
        const reviews = await parentService.getTutorReviews(uid);
        res.status(200).json({ data: reviews });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get reviews';
        res.status(500).json({ error: message });
    }
}
