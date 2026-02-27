'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { ClipboardList, Inbox, AlertCircle } from 'lucide-react';

interface HistoryRow {
    sessionId: string;
    topic: string;
    date: string;
    status: string;
    tutorId?: string;
    tutorName: string;
    amountPaid: number;
}

export default function SessionHistory() {
    const { firebaseUser } = useAuth();
    const [sessions, setSessions] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!firebaseUser) { setLoading(false); return; }

            try {
                setLoading(true);
                setError(null);

                const q = query(
                    collection(db, 'sessions'),
                    where('studentId', '==', firebaseUser.uid),
                    where('status', 'in', ['completed', 'cancelled'])
                );

                const snapshot = await getDocs(q);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawSessions = snapshot.docs.map((d) => ({
                    sessionId: d.id,
                    ...d.data(),
                })) as any[];

                // Sort client-side to avoid needing composite Firestore index
                rawSessions.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.()?.getTime?.() || 0;
                    const dateB = b.createdAt?.toDate?.()?.getTime?.() || 0;
                    return dateB - dateA;
                });

                // Fetch tutor names
                const tutorIds = [...new Set(rawSessions.filter(s => s.tutorId).map(s => s.tutorId))];
                const tutorMap: Record<string, string> = {};
                await Promise.all(
                    tutorIds.map(async (tid) => {
                        try {
                            const tutorDoc = await getDoc(doc(db, 'users', tid));
                            if (tutorDoc.exists()) {
                                const td = tutorDoc.data();
                                tutorMap[tid] = td?.displayName || td?.profile?.fullName || 'Tutor';
                            }
                        } catch {
                            // Skip failed lookups
                        }
                    })
                );

                const enriched = rawSessions.map((s) => ({
                    ...s,
                    tutorName: s.tutorId ? tutorMap[s.tutorId] || 'Unknown' : 'Not Assigned',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    amountPaid: (s as any).amountPaid as number || 0,
                }));

                setSessions(enriched.map((s) => ({
                    sessionId: s.sessionId,
                    topic: s.topic || 'N/A',
                    date: s.scheduledStartTime?.toDate?.()?.toLocaleDateString?.() || s.createdAt?.toDate?.()?.toLocaleDateString?.() || 'N/A',
                    status: s.status || 'N/A',
                    tutorName: s.tutorName,
                    amountPaid: s.amountPaid,
                })));
            } catch (err) {
                console.error('Error fetching session history:', err);
                setError('Failed to load session history. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [firebaseUser]);

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-sm">
                    <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                    Session History
                </h3>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
                    <p className="mt-3 text-sm text-slate-400">Loading history...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                        <Inbox className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        No completed sessions yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Your session history will appear here
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Topic</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tutor</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-3 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session) => (
                                <tr
                                    key={session.sessionId}
                                    className="border-b border-slate-50 transition-colors hover:bg-indigo-50/50 group"
                                >
                                    <td className="px-3 py-3.5 font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                        {session.topic}
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary text-xs font-bold text-white">
                                                {session.tutorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <span className="text-slate-600 font-medium">{session.tutorName}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5 text-slate-500">{session.date}</td>
                                    <td className="px-3 py-3.5 text-right font-bold text-emerald-600">
                                        {session.amountPaid ? `₹${session.amountPaid}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
