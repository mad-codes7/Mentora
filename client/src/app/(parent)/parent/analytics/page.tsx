'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
    TrendingUp, BookOpen, CheckCircle2, XCircle,
    BarChart3, ArrowUpRight, ArrowDownRight, Inbox
} from 'lucide-react';

interface QuestionDetail {
    questionText: string;
    preCorrect: boolean | null;
    postCorrect: boolean | null;
}

interface SessionAnalytics {
    sessionId: string;
    topic: string;
    preScore: number;
    postScore: number;
    maxScore: number;
    improvement: number;
    questions: QuestionDetail[];
}

export default function ParentAnalyticsPage() {
    const { mentoraUser } = useAuth();
    const [analytics, setAnalytics] = useState<SessionAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!mentoraUser) return;
            const linkedIds = mentoraUser.parentData?.linkedStudentIds || [];
            if (linkedIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const assessQuery = query(
                    collection(db, 'assessments'),
                    where('userId', 'in', linkedIds)
                );
                const assessSnap = await getDocs(assessQuery);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assessments = assessSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

                // Group by session
                const bySession: Record<string, { pre?: typeof assessments[0]; post?: typeof assessments[0] }> = {};
                assessments.forEach(a => {
                    const key = a.sessionId || a.id;
                    if (!bySession[key]) bySession[key] = {};
                    if (a.type === 'pre_session') bySession[key].pre = a;
                    else bySession[key].post = a;
                });

                const result: SessionAnalytics[] = Object.entries(bySession)
                    .filter(([, v]) => v.pre || v.post)
                    .map(([sessionId, v]) => {
                        const preQuiz = v.pre?.quizPayload || [];
                        const postQuiz = v.post?.quizPayload || [];
                        const preScore = v.pre?.scoreData?.totalScore || 0;
                        const postScore = v.post?.scoreData?.totalScore || 0;
                        const maxScore = v.pre?.scoreData?.maxScore || v.post?.scoreData?.maxScore || 10;

                        // Build question-level detail
                        const questions: QuestionDetail[] = [];
                        const allQuestionTexts = new Set<string>();

                        preQuiz.forEach((q: { questionText: string; isCorrect: boolean }) => {
                            allQuestionTexts.add(q.questionText);
                        });
                        postQuiz.forEach((q: { questionText: string; isCorrect: boolean }) => {
                            allQuestionTexts.add(q.questionText);
                        });

                        allQuestionTexts.forEach(qt => {
                            const preQ = preQuiz.find((q: { questionText: string }) => q.questionText === qt);
                            const postQ = postQuiz.find((q: { questionText: string }) => q.questionText === qt);
                            questions.push({
                                questionText: qt,
                                preCorrect: preQ ? preQ.isCorrect : null,
                                postCorrect: postQ ? postQ.isCorrect : null,
                            });
                        });

                        return {
                            sessionId,
                            topic: v.pre?.topic || v.post?.topic || 'General',
                            preScore,
                            postScore,
                            maxScore,
                            improvement: postScore - preScore,
                            questions,
                        };
                    });

                setAnalytics(result);
            } catch (err) {
                console.error('Error fetching analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [mentoraUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#d97706' }} />
                    <p className="text-sm text-slate-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (analytics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 mb-6 animate-float">
                    <Inbox className="h-10 w-10 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No Assessment Data Yet</h2>
                <p className="text-sm text-slate-500 max-w-md">
                    Assessment analytics will appear here once your child completes pre and post session quizzes.
                </p>
            </div>
        );
    }

    // Summary stats
    const avgImprovement = analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + a.improvement, 0) / analytics.length)
        : 0;
    const totalQuizzes = analytics.length;
    const improvedCount = analytics.filter(a => a.improvement > 0).length;

    const selectedAnalytics = selectedSession ? analytics.find(a => a.sessionId === selectedSession) : null;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-amber-600" />
                    Deep Analytics
                </h1>
                <p className="text-sm text-slate-500 mt-1">Question-level breakdown of your child&apos;s assessment performance</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                            <BookOpen className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Total Quizzes</p>
                            <p className="text-xl font-bold text-slate-900">{totalQuizzes}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Avg Improvement</p>
                            <p className={`text-xl font-bold ${avgImprovement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {avgImprovement >= 0 ? '+' : ''}{avgImprovement} pts
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Improved Sessions</p>
                            <p className="text-xl font-bold text-slate-900">{improvedCount}/{totalQuizzes}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Session Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.map((a) => (
                    <div
                        key={a.sessionId}
                        onClick={() => setSelectedSession(selectedSession === a.sessionId ? null : a.sessionId)}
                        className={`card p-5 cursor-pointer transition-all hover:shadow-md ${selectedSession === a.sessionId ? 'ring-2 ring-amber-400 shadow-md' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-900">{a.topic}</h3>
                            <span className={`flex items-center gap-1 text-sm font-bold ${a.improvement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {a.improvement >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                {a.improvement >= 0 ? '+' : ''}{a.improvement}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 mb-1">Pre-Test</p>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(a.preScore / a.maxScore) * 100}%` }} />
                                </div>
                                <p className="text-xs font-bold text-amber-600 mt-1">{a.preScore}/{a.maxScore}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 mb-1">Post-Test</p>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(a.postScore / a.maxScore) * 100}%` }} />
                                </div>
                                <p className="text-xs font-bold text-emerald-600 mt-1">{a.postScore}/{a.maxScore}</p>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                            {a.questions.length} questions · Click to see breakdown
                        </p>
                    </div>
                ))}
            </div>

            {/* Question-Level Breakdown */}
            {selectedAnalytics && selectedAnalytics.questions.length > 0 && (
                <section className="card p-6 animate-fade-in-up">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                        Question Breakdown — {selectedAnalytics.topic}
                    </h3>
                    <div className="space-y-3">
                        {selectedAnalytics.questions.map((q, idx) => (
                            <div key={idx} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 mt-0.5 shrink-0">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 leading-relaxed">{q.questionText}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400">Pre:</span>
                                            {q.preCorrect === null ? (
                                                <span className="text-xs text-slate-300">—</span>
                                            ) : q.preCorrect ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-400" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400">Post:</span>
                                            {q.postCorrect === null ? (
                                                <span className="text-xs text-slate-300">—</span>
                                            ) : q.postCorrect ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-400" />
                                            )}
                                        </div>
                                        {/* Improvement indicator */}
                                        {q.preCorrect === false && q.postCorrect === true && (
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                                ✓ Improved
                                            </span>
                                        )}
                                        {q.preCorrect === true && q.postCorrect === false && (
                                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                                                ✗ Regressed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
