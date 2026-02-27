'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { BookOpen, Clock, Target, Flame } from 'lucide-react';

interface Stats {
    totalSessions: number;
    hoursLearned: number;
    avgScore: number;
    streak: number;
}

export default function DashboardStats() {
    const { firebaseUser } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalSessions: 0,
        hoursLearned: 0,
        avgScore: 0,
        streak: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!firebaseUser) { setLoading(false); return; }

            try {
                // Fetch completed sessions
                const sessionsQ = query(
                    collection(db, 'sessions'),
                    where('studentId', '==', firebaseUser.uid),
                    where('status', '==', 'completed')
                );
                const sessionsSnap = await getDocs(sessionsQ);

                let totalMinutes = 0;
                const sessionDates = new Set<string>();

                sessionsSnap.docs.forEach((d) => {
                    const data = d.data();
                    totalMinutes += data.durationLimitMinutes || 60;
                    const date = data.createdAt?.toDate?.();
                    if (date) sessionDates.add(date.toDateString());
                });

                // Fetch assessments for avg score
                const assessQ = query(
                    collection(db, 'assessments'),
                    where('userId', '==', firebaseUser.uid)
                );
                const assessSnap = await getDocs(assessQ);

                let totalPct = 0;
                let count = 0;
                const assessDates = new Set<string>();

                assessSnap.docs.forEach((d) => {
                    const data = d.data();
                    if (data.scoreData?.totalScore != null && data.scoreData?.maxScore > 0) {
                        totalPct += (data.scoreData.totalScore / data.scoreData.maxScore) * 100;
                        count++;
                    }
                    const date = data.takenAt?.toDate?.();
                    if (date) assessDates.add(date.toDateString());
                });

                // Calculate streak (consecutive days with activity)
                const allDates = new Set([...sessionDates, ...assessDates]);
                let streak = 0;
                const today = new Date();
                for (let i = 0; i < 365; i++) {
                    const checkDate = new Date(today);
                    checkDate.setDate(today.getDate() - i);
                    if (allDates.has(checkDate.toDateString())) {
                        streak++;
                    } else if (i > 0) {
                        // Allow today to not have activity yet
                        break;
                    }
                }

                setStats({
                    totalSessions: sessionsSnap.size,
                    hoursLearned: Math.round((totalMinutes / 60) * 10) / 10,
                    avgScore: count > 0 ? Math.round(totalPct / count) : 0,
                    streak,
                });
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [firebaseUser]);

    const statCards = [
        {
            label: 'Total Sessions',
            value: stats.totalSessions,
            suffix: '',
            icon: BookOpen,
            gradient: 'from-blue-500 to-indigo-600',
            bgLight: 'bg-blue-50',
        },
        {
            label: 'Hours Learned',
            value: stats.hoursLearned,
            suffix: 'h',
            icon: Clock,
            gradient: 'from-emerald-500 to-teal-600',
            bgLight: 'bg-emerald-50',
        },
        {
            label: 'Avg Score',
            value: stats.avgScore,
            suffix: '%',
            icon: Target,
            gradient: 'from-amber-500 to-orange-600',
            bgLight: 'bg-amber-50',
        },
        {
            label: 'Day Streak',
            value: stats.streak,
            suffix: '🔥',
            icon: Flame,
            gradient: 'from-rose-500 to-pink-600',
            bgLight: 'bg-rose-50',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                        <div className="h-8 w-8 rounded-lg bg-slate-100" />
                        <div className="mt-3 h-7 w-12 rounded bg-slate-100" />
                        <div className="mt-1 h-4 w-20 rounded bg-slate-50" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className="card group p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                    >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm transition-transform group-hover:scale-110`}>
                            <Icon className="h-4 w-4 text-white" />
                        </div>
                        <p className="mt-3 text-2xl font-black text-slate-900">
                            {card.value}{card.suffix !== '🔥' ? card.suffix : ''}
                            {card.suffix === '🔥' && card.value > 0 && (
                                <span className="ml-1 text-lg">{card.suffix}</span>
                            )}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {card.label}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
