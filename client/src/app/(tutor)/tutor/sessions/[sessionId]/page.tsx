'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface SharedDoc {
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
}

interface SessionDetail {
    sessionId: string;
    studentId: string;
    tutorId: string;
    topic: string;
    meetingType: string;
    status: string;
    paymentStatus: string;
    scheduledStartTime?: string;
    actualStartTime?: string;
    endTime?: string;
    durationLimitMinutes: number;
    sharedDocuments: SharedDoc[];
    studentName?: string;
    createdAt: string;
    updatedAt: string;
}

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firebaseUser } = useAuth();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchSession = useCallback(async () => {
        if (!firebaseUser) return;
        try {
            const res = await fetch(`${API_BASE}/api/tutor/sessions/${firebaseUser.uid}`);
            if (res.ok) {
                const { data } = await res.json();
                const found = (data || []).find((s: SessionDetail) => s.sessionId === sessionId);
                setSession(found || null);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [firebaseUser, sessionId]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !firebaseUser) return;

        try {
            setUploading(true);
            const storageRef = ref(storage, `sessions/${sessionId}/materials/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await fetch(`${API_BASE}/api/tutor/sessions/${sessionId}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: file.name, url, uploadedBy: firebaseUser.uid }),
            });

            await fetchSession();
        } catch {
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleStatusUpdate = async (status: string) => {
        try {
            setActionLoading(true);
            await fetch(`${API_BASE}/api/tutor/sessions/${sessionId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            await fetchSession();
        } catch {
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="card p-12 text-center max-w-lg mx-auto">
                <div className="text-5xl mb-3">🔍</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Session Not Found</h2>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>This session may not exist or you don&apos;t have access.</p>
                <button className="btn-primary" onClick={() => router.push('/tutor/sessions')}>Back to Sessions</button>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        searching: 'badge-warning',
        pending_payment: 'badge-info',
        paid_waiting: 'badge-info',
        in_progress: 'badge-success',
        completed: 'badge-success',
        cancelled: 'badge-danger',
    };

    return (
        <div className="max-w-4xl animate-fade-in-up">
            {/* Back button */}
            <button
                onClick={() => router.push('/tutor/sessions')}
                className="mb-6 text-sm hover:underline font-medium"
                style={{ color: 'var(--primary)' }}
            >
                ← Back to Sessions
            </button>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{session.topic}</h1>
                    <div className="flex items-center gap-3">
                        <span className={`badge ${statusColors[session.status] || 'badge-info'}`}>
                            {session.status.replace(/_/g, ' ')}
                        </span>
                        <span className="badge badge-info">
                            {session.meetingType === 'on_demand' ? 'On Demand' : 'Scheduled'}
                        </span>
                        <span className={`badge ${session.paymentStatus === 'success' ? 'badge-success' : 'badge-warning'}`}>
                            Payment: {session.paymentStatus}
                        </span>
                    </div>
                </div>

                {/* Status Actions */}
                <div className="flex gap-2">
                    {session.status === 'searching' && (
                        <button className="btn-primary" disabled={actionLoading} onClick={() => handleStatusUpdate('pending_payment')}>
                            Accept
                        </button>
                    )}
                    {session.status === 'paid_waiting' && (
                        <button className="btn-primary" disabled={actionLoading} onClick={() => handleStatusUpdate('in_progress')}>
                            Start Session
                        </button>
                    )}
                    {session.status === 'in_progress' && (
                        <button className="btn-secondary" disabled={actionLoading} onClick={() => handleStatusUpdate('completed')}>
                            End Session
                        </button>
                    )}
                </div>
            </div>

            {/* Session Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Session Details</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Session ID</span>
                            <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{session.sessionId.slice(0, 12)}...</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
                            <span style={{ color: 'var(--text-primary)' }}>{session.durationLimitMinutes} min</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                            <span style={{ color: 'var(--text-primary)' }}>{new Date(session.createdAt).toLocaleString()}</span>
                        </div>
                        {session.actualStartTime && (
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Started</span>
                                <span style={{ color: 'var(--text-primary)' }}>{new Date(session.actualStartTime).toLocaleString()}</span>
                            </div>
                        )}
                        {session.endTime && (
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Ended</span>
                                <span style={{ color: 'var(--text-primary)' }}>{new Date(session.endTime).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Student Info</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                            <span style={{ color: 'var(--text-primary)' }}>{session.studentName || 'Student'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Student ID</span>
                            <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{session.studentId?.slice(0, 12)}...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared Documents */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Teaching Materials ({session.sharedDocuments?.length || 0})
                    </h3>
                    {['in_progress', 'paid_waiting'].includes(session.status) && (
                        <label className="btn-primary text-sm cursor-pointer">
                            {uploading ? 'Uploading...' : '📎 Upload File'}
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    )}
                </div>

                {(!session.sharedDocuments || session.sharedDocuments.length === 0) ? (
                    <div className="text-center py-8">
                        <p className="text-4xl mb-2">📂</p>
                        <p style={{ color: 'var(--text-muted)' }}>No materials uploaded yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {session.sharedDocuments.map((doc, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📄</span>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(doc.uploadedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary text-xs"
                                >
                                    Download
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
