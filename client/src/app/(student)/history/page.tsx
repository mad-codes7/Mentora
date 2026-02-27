'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { Session } from '@/config/types';
import Link from 'next/link';

export default function HistoryPage() {
    const { firebaseUser } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            if (!firebaseUser) return;

            try {
                // Simple single-field query — no composite index needed
                const q = query(
                    collection(db, 'sessions'),
                    where('studentId', '==', firebaseUser.uid)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((doc) => ({
                    sessionId: doc.id,
                    ...doc.data(),
                })) as Session[];

                // Sort client-side by createdAt descending
                data.sort((a, b) => {
                    const timeA = a.createdAt?.toDate?.()?.getTime?.() || 0;
                    const timeB = b.createdAt?.toDate?.()?.getTime?.() || 0;
                    return timeB - timeA;
                });

                setSessions(data);
            } catch (error) {
                console.error('Error fetching session history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, [firebaseUser]);

    const formatDate = (timestamp: Timestamp | null | undefined) => {
        if (!timestamp) return '—';
        try {
            return timestamp.toDate().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            completed: 'bg-emerald-100 text-emerald-700',
            in_progress: 'bg-blue-100 text-blue-700',
            paid_waiting: 'bg-violet-100 text-violet-700',
            pending_payment: 'bg-amber-100 text-amber-700',
            searching: 'bg-slate-100 text-slate-600',
            cancelled: 'bg-red-100 text-red-600',
        };
        const labels: Record<string, string> = {
            completed: 'Completed',
            in_progress: 'In Progress',
            paid_waiting: 'Waiting',
            pending_payment: 'Payment Pending',
            searching: 'Searching',
            cancelled: 'Cancelled',
        };
        return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Session History</h1>
                <p className="mt-1 text-slate-500">All your past and current sessions</p>
            </div>

            {loading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
            ) : sessions.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
                    <span className="text-5xl">📋</span>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No sessions yet</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Start your first session from the dashboard!
                    </p>
                    <Link
                        href="/dashboard"
                        className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3 text-left font-medium text-slate-500">Date</th>
                                    <th className="px-6 py-3 text-left font-medium text-slate-500">Topic</th>
                                    <th className="px-6 py-3 text-left font-medium text-slate-500">Type</th>
                                    <th className="px-6 py-3 text-left font-medium text-slate-500">Duration</th>
                                    <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sessions.map((session) => (
                                    <tr key={session.sessionId} className="transition-colors hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-700">
                                            {formatDate(session.endTime || session.scheduledStartTime)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{session.topic}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                {session.meetingType === 'on_demand' ? 'On-Demand' : 'Scheduled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{session.durationLimitMinutes} min</td>
                                        <td className="px-6 py-4">{getStatusBadge(session.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
