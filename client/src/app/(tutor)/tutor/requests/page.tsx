'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/common/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { Bell, CheckCircle, X, Clock, Users, CalendarDays, Inbox, Video } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface BookingRequest {
    sessionId: string;
    studentId: string;
    studentName?: string;
    topic: string;
    scheduledStartTime?: string;
    durationLimitMinutes: number;
    createdAt: string;
    status: string;
}

export default function TutorRequestsPage() {
    const { firebaseUser } = useAuth();
    const { acceptSession, updateSessionStatus } = useSessions();
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchRequests = async () => {
        if (!firebaseUser) return;
        try {
            const res = await fetch(`${API_BASE}/api/tutor/requests/${firebaseUser.uid}`);
            if (res.ok) {
                const { data } = await res.json();
                setRequests(data || []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        // Poll every 30 seconds for new requests
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firebaseUser]);

    const handleAccept = async (sessionId: string) => {
        try {
            setActionLoading(sessionId);
            await acceptSession(sessionId);
            // Remove from local state
            setRequests(prev => prev.filter(r => r.sessionId !== sessionId));
        } catch {
            alert('Failed to accept request');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (sessionId: string) => {
        try {
            setActionLoading(sessionId);
            await updateSessionStatus(sessionId, 'cancelled');
            setRequests(prev => prev.filter(r => r.sessionId !== sessionId));
        } catch {
            alert('Failed to decline request');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'Not specified';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const isSessionTime = (scheduledTime?: string) => {
        if (!scheduledTime) return false;
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const diffMs = now.getTime() - scheduled.getTime();
        const diffMins = diffMs / (1000 * 60);
        return diffMins >= -5 && diffMins <= 120; // within 5 min before to 2 hours after
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Booking Requests</h1>
                    <p className="text-slate-500">Student slot booking requests waiting for your approval</p>
                </div>
                {requests.length > 0 && (
                    <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                        {requests.length} pending
                    </span>
                )}
            </div>

            {requests.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                            <Inbox className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-slate-900">No pending requests</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            When students request to book a session with you, their requests will appear here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {requests.map((request) => (
                        <div
                            key={request.sessionId}
                            className="card p-6 card-interactive transition-all border-l-4"
                            style={{ borderLeftColor: 'var(--warning)' }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {request.topic || 'General'}
                                        </h3>
                                        <span className="badge badge-warning">⏳ Pending Approval</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {request.studentName || 'Student'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {formatDateTime(request.scheduledStartTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {request.durationLimitMinutes} min
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Requested {formatDateTime(request.createdAt)}
                                    </p>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    {isSessionTime(request.scheduledStartTime) && (
                                        <button
                                            className="btn-primary text-sm flex items-center gap-1"
                                            onClick={() => {
                                                window.location.href = `/room/${request.sessionId}`;
                                            }}
                                        >
                                            <Video className="h-3.5 w-3.5" />
                                            Join
                                        </button>
                                    )}
                                    <button
                                        className="btn-primary text-sm flex items-center gap-1"
                                        disabled={actionLoading === request.sessionId}
                                        onClick={() => handleAccept(request.sessionId)}
                                    >
                                        {actionLoading === request.sessionId ? (
                                            '...'
                                        ) : (
                                            <>
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Accept
                                            </>
                                        )}
                                    </button>
                                    <button
                                        className="btn-secondary text-sm flex items-center gap-1"
                                        style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                                        disabled={actionLoading === request.sessionId}
                                        onClick={() => handleDecline(request.sessionId)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Decline
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
