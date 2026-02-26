'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { useRouter } from 'next/navigation';
import { Session } from '@/config/types';
import { CalendarDays, BookOpenCheck } from 'lucide-react';

export default function UpcomingSessions() {
    const { firebaseUser } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
        if (!firebaseUser) return;

        const q = query(
            collection(db, 'sessions'),
            where('studentId', '==', firebaseUser.uid),
            where('status', 'in', ['paid_waiting', 'pending_payment', 'searching']),
            orderBy('scheduledStartTime', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                sessionId: doc.id,
                ...doc.data(),
            })) as Session[];
            setSessions(data);
        });

        return () => unsubscribe();
    }, [firebaseUser]);

    const getTimeUntil = (timestamp: Timestamp | null) => {
        if (!timestamp) return 'TBD';
        const now = new Date();
        const target = timestamp.toDate();
        const diff = target.getTime() - now.getTime();

        if (diff <= 0) return 'Starting soon';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
            searching: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Finding Tutor' },
            pending_payment: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400', label: 'Awaiting Payment' },
            paid_waiting: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400', label: 'Ready to Join' },
        };
        return configs[status] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: status };
    };

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm">
                    <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                    Upcoming Sessions
                </h3>
                {sessions.length > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white">
                        {sessions.length}
                    </span>
                )}
            </div>

            {sessions.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                        <BookOpenCheck className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        No upcoming sessions
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Select a topic above to get started!
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => {
                        const status = getStatusConfig(session.status);
                        return (
                            <div
                                key={session.sessionId}
                                className="flex items-center justify-between rounded-2xl p-4 transition-all duration-200 hover:bg-slate-50 group border border-slate-100 hover:border-indigo-100 hover:shadow-sm"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="h-10 w-1 rounded-full gradient-primary opacity-60" />
                                    <div>
                                        <p className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                            {session.topic}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {session.meetingType === 'scheduled' ? 'Scheduled' : 'On-demand'} · {session.durationLimitMinutes} min
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.bg} ${status.text}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${session.status === 'paid_waiting' ? 'animate-pulse' : ''}`} />
                                        {status.label}
                                    </span>
                                    {session.status === 'pending_payment' && (
                                        <button
                                            onClick={() => router.push(`/payment?sessionId=${session.sessionId}`)}
                                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
                                        >
                                            Pay Now
                                        </button>
                                    )}
                                    {session.status === 'paid_waiting' && (
                                        <button
                                            onClick={() => router.push(`/room/${session.sessionId}`)}
                                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors animate-pulse"
                                        >
                                            Join Room
                                        </button>
                                    )}
                                    {session.status === 'searching' && (
                                        <span className="text-sm font-bold text-indigo-600 min-w-[4rem] text-right">
                                            {getTimeUntil(session.scheduledStartTime)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
