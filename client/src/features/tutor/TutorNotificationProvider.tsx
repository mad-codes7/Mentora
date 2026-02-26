'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { useRouter } from 'next/navigation';
import { Session } from '@/config/types';
import { Video, X, Bell } from 'lucide-react';

interface Toast {
    id: string;
    sessionId: string;
    topic: string;
    studentName: string;
    type: 'new_session' | 'reminder';
}

interface TutorNotificationContextType {
    pendingCount: number;
    activeCount: number;
}

const TutorNotificationContext = createContext<TutorNotificationContextType>({
    pendingCount: 0,
    activeCount: 0,
});

export const useTutorNotifications = () => useContext(TutorNotificationContext);

export default function TutorNotificationProvider({ children }: { children: React.ReactNode }) {
    const { firebaseUser } = useAuth();
    const router = useRouter();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [activeCount, setActiveCount] = useState(0);
    const prevSessionIdsRef = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Play notification sound
    const playSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVnkbm3oXdRQlh/q7Ssg2E/P2KOsrCefFQ+UHqjsK2NZEI7YImsr6COZkg5XoSqrqKRaUo5WoGnraSWbk46V36kqqaab1E7WHuhqKehc1U+U3agp6imdlhBT3Oepaipe1xET3KcpKite15GT3GbpKmufWBITnCapKquf2JJTHCY');
            }
            audioRef.current.play().catch(() => { });
        } catch {
            // Silent fail
        }
    }, []);

    // Add a toast
    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { ...toast, id }]);
        playSound();

        // Auto-dismiss after 15s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 15000);
    }, [playSound]);

    // Remove a toast
    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Listen for sessions assigned to this tutor
    useEffect(() => {
        if (!firebaseUser) return;

        const q = query(
            collection(db, 'sessions'),
            where('tutorId', '==', firebaseUser.uid),
            where('status', 'in', ['paid_waiting', 'in_progress', 'pending_payment'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = snapshot.docs.map(doc => ({
                sessionId: doc.id,
                ...doc.data(),
            })) as Session[];

            const paidWaiting = sessions.filter(s => s.status === 'paid_waiting');
            const inProgress = sessions.filter(s => s.status === 'in_progress');

            setPendingCount(paidWaiting.length);
            setActiveCount(inProgress.length);

            // Detect NEW paid_waiting sessions  show toast
            const currentIds = new Set(paidWaiting.map(s => s.sessionId));
            currentIds.forEach(id => {
                if (!prevSessionIdsRef.current.has(id)) {
                    const session = paidWaiting.find(s => s.sessionId === id);
                    if (session) {
                        addToast({
                            sessionId: session.sessionId,
                            topic: session.topic,
                            studentName: session.studentName || 'A student',
                            type: 'new_session',
                        });
                    }
                }
            });
            prevSessionIdsRef.current = currentIds;
        });

        return () => unsubscribe();
    }, [firebaseUser, addToast]);

    // 5-min reminder effect for waiting sessions
    useEffect(() => {
        if (pendingCount === 0) return;

        const timer = setTimeout(() => {
            // Re-show a reminder toast for any session still waiting
            prevSessionIdsRef.current.forEach(sessionId => {
                addToast({
                    sessionId,
                    topic: 'Session',
                    studentName: 'Student',
                    type: 'reminder',
                });
            });
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearTimeout(timer);
    }, [pendingCount, addToast]);

    return (
        <TutorNotificationContext.Provider value={{ pendingCount, activeCount }}>
            {children}

            {/* Toast Container */}
            {toasts.length > 0 && (
                <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm">
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className="rounded-2xl bg-white shadow-2xl border border-slate-100 p-4 animate-slide-down"
                            style={{ animationDuration: '0.3s' }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shrink-0">
                                    {toast.type === 'reminder' ? (
                                        <Bell className="h-5 w-5 text-white" />
                                    ) : (
                                        <Video className="h-5 w-5 text-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm">
                                        {toast.type === 'reminder'
                                            ? '⏰ Reminder: Student waiting!'
                                            : '🎉 New session ready!'
                                        }
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        {toast.studentName} • {toast.topic}
                                    </p>
                                    <button
                                        onClick={() => {
                                            removeToast(toast.id);
                                            router.push(`/room/${toast.sessionId}`);
                                        }}
                                        className="mt-2 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <Video className="h-3.5 w-3.5" />
                                        Join Now
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </TutorNotificationContext.Provider>
    );
}
