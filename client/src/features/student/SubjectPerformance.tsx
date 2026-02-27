'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Award, AlertCircle } from 'lucide-react';

interface SubjectScore {
    subject: string;
    avgScore: number;
    count: number;
}

const getBarColor = (score: number) => {
    if (score >= 70) return '#10B981'; // green
    if (score >= 40) return '#F59E0B'; // amber
    return '#EF4444'; // red
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="rounded-xl bg-white px-4 py-3 shadow-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-1">{data.subject}</p>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold" style={{ color: getBarColor(data.avgScore) }}>
                        Avg: {data.avgScore}%
                    </span>
                    <span className="text-xs text-slate-400">
                        ({data.count} test{data.count > 1 ? 's' : ''})
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default function SubjectPerformance() {
    const { firebaseUser } = useAuth();
    const [data, setData] = useState<SubjectScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!firebaseUser) { setLoading(false); return; }

            try {
                setLoading(true);
                setError(null);

                const q = query(
                    collection(db, 'assessments'),
                    where('userId', '==', firebaseUser.uid)
                );
                const snapshot = await getDocs(q);

                const topicMap: Record<string, { total: number; count: number }> = {};

                snapshot.docs.forEach((d) => {
                    const data = d.data();
                    const topic = data.topic || 'General';
                    const pct = data.scoreData?.totalScore != null && data.scoreData?.maxScore > 0
                        ? Math.round((data.scoreData.totalScore / data.scoreData.maxScore) * 100)
                        : null;

                    if (pct !== null) {
                        if (!topicMap[topic]) topicMap[topic] = { total: 0, count: 0 };
                        topicMap[topic].total += pct;
                        topicMap[topic].count++;
                    }
                });

                const entries: SubjectScore[] = Object.entries(topicMap)
                    .map(([subject, { total, count }]) => ({
                        subject: subject.length > 18 ? subject.slice(0, 16) + '…' : subject,
                        avgScore: Math.round(total / count),
                        count,
                    }))
                    .sort((a, b) => b.avgScore - a.avgScore)
                    .slice(0, 8);

                setData(entries);
            } catch (err) {
                console.error('Error fetching subject performance:', err);
                setError('Failed to load performance data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [firebaseUser]);

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Award className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                    Subject Performance
                </h3>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
                    <p className="mt-3 text-sm text-slate-400">Loading performance...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                        <Award className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        No subject data yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Complete assessments to see performance by subject
                    </p>
                </div>
            ) : (
                <div>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="subject"
                                    width={110}
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                                <Bar dataKey="avgScore" radius={[0, 6, 6, 0]} barSize={20}>
                                    {data.map((entry, idx) => (
                                        <Cell key={idx} fill={getBarColor(entry.avgScore)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-5 mt-3">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="text-xs text-slate-500">≥ 70%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <span className="text-xs text-slate-500">40–69%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-500">&lt; 40%</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
