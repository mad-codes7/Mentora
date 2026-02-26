'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/common/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
export interface TutorSessionItem {
    sessionId: string;
    studentId: string;
    tutorId: string;
    topic: string;
    meetingType: string;
    status: string;
    durationLimitMinutes: number;
    paymentStatus: string;
    studentName?: string;
    createdAt: string;
    updatedAt: string;
    scheduledStartTime?: string;
    actualStartTime?: string;
    endTime?: string;
    sharedDocuments?: { name: string; url: string; uploadedAt: string; uploadedBy: string }[];
}

export function useSessions() {
    const { firebaseUser } = useAuth();
    const [sessions, setSessions] = useState<TutorSessionItem[]>([]);
    const [availableSessions, setAvailableSessions] = useState<TutorSessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSessions = useCallback(async (statusFilter?: string) => {
        if (!firebaseUser) {
            setSessions([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const url = statusFilter
                ? `${API_BASE}/api/tutor/sessions/${firebaseUser.uid}?status=${statusFilter}`
                : `${API_BASE}/api/tutor/sessions/${firebaseUser.uid}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch sessions');
            const { data } = await res.json();
            setSessions(data || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error loading sessions';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [firebaseUser]);

    const fetchAvailableSessions = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/tutor/sessions/available/list`);
            if (!res.ok) throw new Error('Failed to fetch available sessions');
            const { data } = await res.json();
            setAvailableSessions(data || []);
        } catch {
            // silent – available sessions are optional
        }
    }, []);

    useEffect(() => {
        fetchSessions();
        fetchAvailableSessions();
    }, [fetchSessions, fetchAvailableSessions]);

    const acceptSession = async (sessionId: string) => {
        if (!firebaseUser) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/api/tutor/sessions/${sessionId}/accept`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tutorId: firebaseUser.uid }),
        });

        if (!res.ok) throw new Error('Failed to accept session');
        await fetchSessions();
        await fetchAvailableSessions();
    };

    const updateSessionStatus = async (sessionId: string, status: string) => {
        const res = await fetch(`${API_BASE}/api/tutor/sessions/${sessionId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });

        if (!res.ok) throw new Error('Failed to update session status');
        await fetchSessions();
    };

    const uploadDocument = async (sessionId: string, name: string, url: string) => {
        if (!firebaseUser) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/api/tutor/sessions/${sessionId}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url, uploadedBy: firebaseUser.uid }),
        });

        if (!res.ok) throw new Error('Failed to upload document');
        return res.json();
    };

    return { sessions, availableSessions, loading, error, fetchSessions, fetchAvailableSessions, acceptSession, updateSessionStatus, uploadDocument };
}
