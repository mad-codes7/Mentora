'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
    Bell, CalendarCheck, CreditCard, AlertCircle, CheckCircle2,
    BookOpen, Clock, Filter,
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'session' | 'payment' | 'system' | 'assessment';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

export default function NotificationsPage() {
    const { firebaseUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'session' | 'payment' | 'assessment'>('all');

    useEffect(() => {
        const generateNotifications = async () => {
            if (!firebaseUser) return;

            const notifs: Notification[] = [];

            try {
                // Fetch recent sessions for session notifications
                const sessionsSnap = await getDocs(
                    query(
                        collection(db, 'sessions'),
                        where('studentId', '==', firebaseUser.uid),
                        orderBy('createdAt', 'desc'),
                        limit(10)
                    )
                );

                sessionsSnap.docs.forEach((doc) => {
                    const data = doc.data();
                    const createdAt = data.createdAt as Timestamp;
                    const timeStr = createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) || '';

                    if (data.status === 'completed') {
                        notifs.push({
                            id: `session-completed-${doc.id}`,
                            type: 'session',
                            title: 'Session Completed',
                            message: `Your ${data.topic} session has been completed successfully.`,
                            time: timeStr,
                            read: true,
                        });
                    }
                    if (data.status === 'paid_waiting') {
                        notifs.push({
                            id: `session-ready-${doc.id}`,
                            type: 'session',
                            title: 'Session Ready',
                            message: `Your ${data.topic} session is ready to join. Your tutor is waiting!`,
                            time: timeStr,
                            read: false,
                        });
                    }
                    if (data.status === 'pending_payment') {
                        notifs.push({
                            id: `payment-pending-${doc.id}`,
                            type: 'payment',
                            title: 'Payment Pending',
                            message: `Complete payment for your ${data.topic} session to confirm booking.`,
                            time: timeStr,
                            read: false,
                        });
                    }
                    if (data.amountPaid) {
                        notifs.push({
                            id: `payment-success-${doc.id}`,
                            type: 'payment',
                            title: 'Payment Successful',
                            message: `₹${data.amountPaid} paid for ${data.topic} session.`,
                            time: timeStr,
                            read: true,
                        });
                    }
                });

                // Fetch recent assessments
                const assessSnap = await getDocs(
                    query(
                        collection(db, 'assessments'),
                        where('userId', '==', firebaseUser.uid),
                        orderBy('takenAt', 'desc'),
                        limit(5)
                    )
                );

                assessSnap.docs.forEach((doc) => {
                    const data = doc.data();
                    const pct = Math.round((data.scoreData.totalScore / data.scoreData.maxScore) * 100);
                    const timeStr = data.takenAt?.toDate?.()?.toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) || '';

                    notifs.push({
                        id: `assess-${doc.id}`,
                        type: 'assessment',
                        title: `${data.type === 'pre_session' ? 'Pre' : 'Post'}-Assessment: ${data.topic}`,
                        message: `You scored ${pct}% (${data.scoreData.totalScore}/${data.scoreData.maxScore}).`,
                        time: timeStr,
                        read: true,
                    });
                });

                // Add a welcome notification
                notifs.push({
                    id: 'welcome',
                    type: 'system',
                    title: 'Welcome to Mentora!',
                    message: 'Start by selecting a topic and taking a pre-assessment to find the right tutor.',
                    time: '',
                    read: true,
                });

            } catch (err) {
                console.error('Error generating notifications:', err);
            }

            setNotifications(notifs);
            setLoading(false);
        };

        generateNotifications();
    }, [firebaseUser]);

    const filteredNotifs = filter === 'all'
        ? notifications
        : notifications.filter((n) => n.type === filter);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'session': return <CalendarCheck className="h-5 w-5 text-indigo-600" />;
            case 'payment': return <CreditCard className="h-5 w-5 text-emerald-600" />;
            case 'assessment': return <BookOpen className="h-5 w-5 text-amber-600" />;
            case 'system': return <AlertCircle className="h-5 w-5 text-blue-600" />;
            default: return <Bell className="h-5 w-5 text-slate-400" />;
        }
    };

    const getIconBg = (type: string) => {
        switch (type) {
            case 'session': return 'bg-indigo-50';
            case 'payment': return 'bg-emerald-50';
            case 'assessment': return 'bg-amber-50';
            case 'system': return 'bg-blue-50';
            default: return 'bg-slate-50';
        }
    };

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'session', label: 'Sessions' },
        { key: 'payment', label: 'Payments' },
        { key: 'assessment', label: 'Assessments' },
    ] as const;

    return (
        <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-md">
                        <Bell className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                        <p className="text-sm text-slate-400">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${filter === f.key
                            ? 'gradient-primary text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            {loading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-10 w-10 rounded-2xl gradient-primary animate-pulse" />
                </div>
            ) : filteredNotifs.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-slate-50 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">No notifications</p>
                    <p className="text-sm text-slate-400 mt-1">You&apos;re all caught up!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredNotifs.map((notif) => (
                        <div
                            key={notif.id}
                            className={`card flex items-start gap-4 p-4 transition-all ${!notif.read ? 'border-l-4 border-l-indigo-500' : ''}`}
                        >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getIconBg(notif.type)}`}>
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-semibold ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {notif.title}
                                    </h3>
                                    {!notif.read && (
                                        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                                {notif.time && (
                                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                                        <Clock className="h-3 w-3" />
                                        {notif.time}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
