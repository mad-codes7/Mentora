import { Request, Response } from 'express';
import * as adminService from '../services/adminService';

// GET /api/admin/dashboard
export async function getDashboard(req: Request, res: Response) {
    try {
        const data = await adminService.getAdminDashboard();
        res.status(200).json({ data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load admin dashboard';
        res.status(500).json({ error: message });
    }
}
