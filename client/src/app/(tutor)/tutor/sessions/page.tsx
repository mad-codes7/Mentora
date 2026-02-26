'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSessions } from '@/hooks/useSessions';
import { BookOpen, Bell, Clock, CheckCircle, Inbox, Users, Video } from 'lucide-react';

type TabFilter = 'all' | 'available' | 'searching' | 'in_progress' | 'completed';

export default function TutorSessionsPage() {
    const { sessions, availableSessions, loading, acceptSession, updateSessionStatus, fetchSessions, fetchAvailableSessions } = useSessions();
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filteredSessions = activeTab === 'all'
        ? sessions
        : activeTab === 'available'
            ? availableSessions
            : sessions.filter((s) => {
                if (activeTab === 'searching') return s.status === 'searching';
                if (activeTab === 'in_progress') return ['pending_payment', 'paid_waiting', 'in_progress'].includes(s.status);
                if (activeTab === 'completed') return ['completed', 'cancelled'].includes(s.status);
                return true;
            });

    const handleAccept = async (sessionId: string) => {
        try {
            setActionLoading(sessionId);
            await acceptSession(sessionId);
        } catch {
            alert('Failed to accept session');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStatusUpdate = async (sessionId: string, status: string) => {
        try {
            setActionLoading(sessionId);
            await updateSessionStatus(sessionId, status);
        } catch {
            alert('Failed to update session');
        } finally {
            setActionLoading(null);
        }
    };

    const statusColors: Record<string, string> = {
        searching: 'badge-warning',
        pending_payment: 'badge-info',
        paid_waiting: 'badge-info',
        in_progress: 'badge-success',
        completed: 'badge-success',
        cancelled: 'badge-danger',
    };

    const tabs: { key: TabFilter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: sessions.length },
        { key: 'available', label: '🔔 Available', count: availableSessions.length },
        { key: 'searching', label: 'Pending', count: sessions.filter((s) => s.status === 'searching').length },
        { key: 'in_progress', label: 'Active', count: sessions.filter((s) => ['pending_payment', 'paid_waiting', 'in_progress'].includes(s.status)).length },
        { key: 'completed', label: 'History', count: sessions.filter((s) => ['completed', 'cancelled'].includes(s.status)).length },
    ];

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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm">
                    <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Sessions</h1>
                    <p className="text-slate-500">Manage your tutoring sessions</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setActiveTab(tab.key);
                            if (tab.key === 'available') {
                                fetchAvailableSessions();
                            } else if (tab.key === 'all') {
                                fetchSessions();
                            } else {
                                fetchSessions(tab.key === 'searching' ? 'searching' : undefined);
                            }
                        }}
                        className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    >
                        {tab.label}
                        <span
                            className="ml-2 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: 'var(--bg-alt)', color: 'var(--text-muted)' }}
                        >
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Available Sessions Banner */}
            {activeTab === 'available' && (
                <div
                    className="mb-6 p-4 rounded-xl text-sm"
                    style={{
                        background: 'var(--primary-light)',
                        border: '1px solid rgba(79, 70, 229, 0.2)',
                        color: 'var(--primary)',
                    }}
                >
                    💡 These are session requests from students looking for a tutor. Accept one to start!
                </div>
            )}

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                            <Inbox className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-slate-900">No sessions found</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {activeTab === 'available'
                                ? 'No student requests available right now. Check back later!'
                                : activeTab === 'searching'
                                    ? 'No pending session requests right now.'
                                    : 'Sessions will appear here when students book with you.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredSessions.map((session) => (
                        <div key={session.sessionId} className="card p-6 card-interactive transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Link
                                            href={`/tutor/sessions/${session.sessionId}`}
                                            className="text-lg font-semibold hover:underline"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {session.topic}
                                        </Link>
                                        <span className={`badge ${statusColors[session.status] || 'badge-info'}`}>
                                            {session.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="badge badge-info">{session.meetingType === 'on_demand' ? 'On Demand' : 'Scheduled'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {session.studentName || 'Student'}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {session.durationLimitMinutes} min</span>
                                        <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 shrink-0">
                                    {(session.status === 'searching' || activeTab === 'available') && (
                                        <>
                                            <button
                                                className="btn-primary text-sm"
                                                disabled={actionLoading === session.sessionId}
                                                onClick={() => handleAccept(session.sessionId)}
                                            >
                                                {actionLoading === session.sessionId ? '...' : 'Accept'}
                                            </button>
                                            {activeTab !== 'available' && (
                                                <button
                                                    className="btn-secondary text-sm"
                                                    style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                                                    disabled={actionLoading === session.sessionId}
                                                    onClick={() => handleStatusUpdate(session.sessionId, 'cancelled')}
                                                >
                                                    Decline
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {session.status === 'paid_waiting' && (
                                        <button
                                            className="btn-primary text-sm"
                                            disabled={actionLoading === session.sessionId}
                                            onClick={async () => {
                                                await handleStatusUpdate(session.sessionId, 'in_progress');
                                                window.location.href = `/room/${session.sessionId}`;
                                            }}
                                        >
                                            🎥 Join Room
                                        </button>
                                    )}
                                    {session.status === 'in_progress' && (
                                        <>
                                            <button
                                                className="btn-primary text-sm"
                                                onClick={() => {
                                                    window.location.href = `/room/${session.sessionId}`;
                                                }}
                                            >
                                                🎥 Join Room
                                            </button>
                                            <button
                                                className="btn-secondary text-sm"
                                                style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                                                disabled={actionLoading === session.sessionId}
                                                onClick={() => handleStatusUpdate(session.sessionId, 'completed')}
                                            >
                                                End Session
                                            </button>
                                        </>
                                    )}
                                    <Link
                                        href={`/tutor/sessions/${session.sessionId}`}
                                        className="btn-secondary text-sm"
                                    >
                                        Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
