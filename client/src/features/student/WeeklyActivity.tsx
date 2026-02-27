'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';

interface DayActivity {
    day: string;
    fullDate: string;
    sessions: number;
    assessments: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        return (
            <div className="rounded-xl bg-white px-4 py-3 shadow-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">{data?.fullDate}</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-xs font-semibold text-slate-700">
                            {data?.sessions} session{data?.sessions !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-semibold text-slate-700">
                            {data?.assessments} assessment{data?.assessments !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function WeeklyActivity() {
    const { firebaseUser } = useAuth();
    const [data, setData] = useState<DayActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!firebaseUser) { setLoading(false); return; }

            try {
                setLoading(true);
                setError(null);

                // Build last 7 days
                const days: DayActivity[] = [];
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const now = new Date();

                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    days.push({
                        day: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayNames[d.getDay()],
                        fullDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                        sessions: 0,
                        assessments: 0,
                    });
                }

                // Seven days ago at midnight
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);

                // Fetch sessions
                const sessionsQ = query(
                    collection(db, 'sessions'),
                    where('studentId', '==', firebaseUser.uid)
                );
                const sessionsSnap = await getDocs(sessionsQ);

                sessionsSnap.docs.forEach((d) => {
                    const data = d.data();
                    const date = data.createdAt?.toDate?.();
                    if (date && date >= sevenDaysAgo) {
                        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                        const idx = 6 - daysDiff;
                        if (idx >= 0 && idx < 7) {
                            days[idx].sessions++;
                        }
                    }
                });

                // Fetch assessments
                const assessQ = query(
                    collection(db, 'assessments'),
                    where('userId', '==', firebaseUser.uid)
                );
                const assessSnap = await getDocs(assessQ);

                assessSnap.docs.forEach((d) => {
                    const data = d.data();
                    const date = data.takenAt?.toDate?.();
                    if (date && date >= sevenDaysAgo) {
                        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                        const idx = 6 - daysDiff;
                        if (idx >= 0 && idx < 7) {
                            days[idx].assessments++;
                        }
                    }
                });

                setData(days);
            } catch (err) {
                console.error('Error fetching weekly activity:', err);
                setError('Failed to load activity data.');
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [firebaseUser]);

    const totalActivity = data.reduce((sum, d) => sum + d.sessions + d.assessments, 0);

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-sm">
                    <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">
                        Weekly Activity
                    </h3>
                    {!loading && totalActivity > 0 && (
                        <p className="text-xs text-slate-400">
                            {totalActivity} activit{totalActivity !== 1 ? 'ies' : 'y'} this week
                        </p>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
                    <p className="mt-3 text-sm text-slate-400">Loading activity...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
                </div>
            ) : totalActivity === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                        <Activity className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        No activity this week
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Start a session or take an assessment to see activity
                    </p>
                </div>
            ) : (
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11, fill: '#94A3B8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: '#94A3B8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '11px', color: '#64748B' }}
                            />
                            <Bar
                                dataKey="sessions"
                                name="Sessions"
                                stackId="activity"
                                fill="#4F46E5"
                                radius={[0, 0, 0, 0]}
                                barSize={24}
                            />
                            <Bar
                                dataKey="assessments"
                                name="Assessments"
                                stackId="activity"
                                fill="#F59E0B"
                                radius={[4, 4, 0, 0]}
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
