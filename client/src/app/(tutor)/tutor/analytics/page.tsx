'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { BarChart3, Star, TrendingUp, Users, CheckCircle, MessageSquare } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface RecentRating {
    ratingId: string;
    studentId: string;
    sessionId: string;
    starRating: number;
    feedback: string;
    scoreDelta: number;
    createdAt: string;
}

interface AnalyticsData {
    totalSessions: number;
    completedSessions: number;
    averageRating: number;
    totalStudents: number;
    averageScoreDelta: number;
    ratingDistribution: { [key: number]: number };
    subjectBreakdown: { subject: string; count: number }[];
    monthlySessionTrend: { month: string; count: number }[];
    recentRatings: RecentRating[];
    completionRate: number;
}

export default function TutorAnalyticsPage() {
    const { firebaseUser } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firebaseUser) return;
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/tutor/analytics/${firebaseUser.uid}`);
                if (res.ok) {
                    const { data } = await res.json();
                    setAnalytics(data);
                }
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [firebaseUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    const maxRating = analytics
        ? Math.max(...Object.values(analytics.ratingDistribution), 1)
        : 1;

    const maxMonthly = analytics
        ? Math.max(...analytics.monthlySessionTrend.map((m) => m.count), 1)
        : 1;

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
            />
        ));
    };

    return (
        <div className="max-w-6xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-500">Your performance and teaching metrics</p>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 stagger-children">
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Sessions</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {analytics?.totalSessions || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Completed</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                        {analytics?.completedSessions || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Avg Rating</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
                        ⭐ {analytics?.averageRating?.toFixed(1) || '0.0'}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Students</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                        {analytics?.totalStudents || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Score Delta</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                        +{((analytics?.averageScoreDelta || 0) * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Completion Rate</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                        {analytics?.completionRate || 0}%
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Rating Distribution */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Rating Distribution</h3>
                    <div className="flex flex-col gap-3">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = analytics?.ratingDistribution?.[star] || 0;
                            const pct = (count / maxRating) * 100;
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-sm w-8 text-right font-medium" style={{ color: 'var(--warning)' }}>
                                        {star}★
                                    </span>
                                    <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--bg-alt)' }}>
                                        <div
                                            className="h-full rounded-lg transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                background: `linear-gradient(90deg, var(--primary), ${star >= 4 ? 'var(--success)' : star >= 3 ? 'var(--warning)' : 'var(--error)'})`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm w-8 text-right" style={{ color: 'var(--text-muted)' }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Monthly Sessions</h3>
                    <div className="flex items-end gap-3 h-48">
                        {analytics?.monthlySessionTrend?.map((m) => {
                            const height = (m.count / maxMonthly) * 100;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.count}</span>
                                    <div className="w-full relative" style={{ height: '140px' }}>
                                        <div
                                            className="absolute bottom-0 w-full rounded-t-lg transition-all duration-500"
                                            style={{
                                                height: `${Math.max(height, 4)}%`,
                                                background: 'var(--gradient-primary)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {m.month.split('-')[1]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="card p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Student Reviews</h3>
                </div>
                {(!analytics?.recentRatings || analytics.recentRatings.length === 0) ? (
                    <div className="text-center py-8">
                        <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Complete sessions to receive student feedback!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {analytics.recentRatings.map((rating) => (
                            <div
                                key={rating.ratingId}
                                className="p-4 rounded-xl border transition-all hover:shadow-sm"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-0.5">
                                            {renderStars(rating.starRating)}
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {rating.starRating.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {rating.scoreDelta !== 0 && (
                                            <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${rating.scoreDelta > 0
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-red-50 text-red-500'
                                                }`}>
                                                <TrendingUp className="h-3 w-3" />
                                                {rating.scoreDelta > 0 ? '+' : ''}{(rating.scoreDelta * 100).toFixed(0)}%
                                            </span>
                                        )}
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                                        </span>
                                    </div>
                                </div>
                                {rating.feedback && (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        &ldquo;{rating.feedback}&rdquo;
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Subject Breakdown */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Subject Breakdown</h3>
                </div>
                {(!analytics?.subjectBreakdown || analytics.subjectBreakdown.length === 0) ? (
                    <div className="text-center py-8">
                        <p style={{ color: 'var(--text-muted)' }}>No subject data yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.subjectBreakdown.map((s) => {
                            const maxSubject = Math.max(...analytics.subjectBreakdown.map((x) => x.count), 1);
                            const pct = (s.count / maxSubject) * 100;
                            return (
                                <div key={s.subject} className="p-4 rounded-xl" style={{ background: 'var(--bg)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.subject}</span>
                                        <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{s.count}</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                background: 'var(--gradient-primary)',
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
