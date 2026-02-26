'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, LineChart as LineChartIcon } from 'lucide-react';

interface AssessmentEntry {
    topic: string;
    preScore: number;
    postScore: number;
    date: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl bg-white px-4 py-3 shadow-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">{payload[0]?.payload?.topic}</p>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-amber-600">
                        Pre: {payload[0]?.value}%
                    </span>
                    <span className="text-xs font-semibold text-indigo-600">
                        Post: {payload[1]?.value}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default function ProgressCharts() {
    const { firebaseUser } = useAuth();
    const [data, setData] = useState<AssessmentEntry[]>([]);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!firebaseUser) return;

            const q = query(
                collection(db, 'assessments'),
                where('userId', '==', firebaseUser.uid),
                orderBy('takenAt', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            const assessmentsBySession: Record<string, { pre?: number; post?: number; topic?: string; date?: string }> = {};

            snapshot.docs.forEach((doc) => {
                const d = doc.data();
                const sessionKey = d.sessionId || doc.id;
                if (!assessmentsBySession[sessionKey]) {
                    assessmentsBySession[sessionKey] = {};
                }

                const pct = Math.round((d.scoreData.totalScore / d.scoreData.maxScore) * 100);
                if (d.type === 'pre_session') {
                    assessmentsBySession[sessionKey].pre = pct;
                    assessmentsBySession[sessionKey].topic = d.topic;
                    assessmentsBySession[sessionKey].date = d.takenAt?.toDate?.()?.toLocaleDateString?.() || '';
                } else {
                    assessmentsBySession[sessionKey].post = pct;
                }
            });

            const entries: AssessmentEntry[] = Object.values(assessmentsBySession)
                .filter((v) => v.pre !== undefined || v.post !== undefined)
                .map((v) => ({
                    topic: v.topic || 'Quiz',
                    preScore: v.pre || 0,
                    postScore: v.post || 0,
                    date: v.date || '',
                }))
                .slice(0, 8);

            setData(entries);
        };

        fetchProgress();
    }, [firebaseUser]);

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                    Progress Tracker
                </h3>
            </div>

            {data.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                        <LineChartIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        No progress data yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Complete your first assessment to see your progress
                    </p>
                </div>
            ) : (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                            <defs>
                                <linearGradient id="preGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" />
                            <XAxis
                                dataKey="topic"
                                tick={{ fontSize: 11, fill: '#94A3B8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 11, fill: '#94A3B8' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="preScore"
                                stroke="#F59E0B"
                                strokeWidth={2.5}
                                fill="url(#preGrad)"
                                dot={{ fill: '#F59E0B', stroke: '#fff', strokeWidth: 2, r: 4 }}
                                name="Pre-Test"
                            />
                            <Area
                                type="monotone"
                                dataKey="postScore"
                                stroke="#4F46E5"
                                strokeWidth={2.5}
                                fill="url(#postGrad)"
                                dot={{ fill: '#4F46E5', stroke: '#fff', strokeWidth: 2, r: 4 }}
                                name="Post-Test"
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    <div className="flex items-center justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="text-xs text-slate-500 font-medium">Pre-Test</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                            <span className="text-xs text-slate-500 font-medium">Post-Test</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
