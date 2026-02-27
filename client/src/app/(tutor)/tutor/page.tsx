'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/common/AuthContext';
import { useTutor } from '@/hooks/useTutor';
import {
    BookOpen, Users, Star, Zap, BarChart3, Wallet,
    CalendarDays, UserCircle, TrendingUp, Bell, Video, Inbox
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface DashboardStats {
    totalSessions: number;
    completedSessions: number;
    averageRating: number;
    totalStudents: number;
}

interface WalletData {
    totalEarnings: number;
    pendingAmount: number;
}

interface SessionItem {
    sessionId: string;
    topic: string;
    status: string;
    studentName?: string;
    createdAt: string;
    meetingType: string;
}

export default function TutorDashboard() {
    const { firebaseUser, mentoraUser } = useAuth();
    const { profile, loading: profileLoading } = useTutor();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [recentSessions, setRecentSessions] = useState<SessionItem[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const firstName = mentoraUser?.profile?.fullName?.split(' ')[0] || firebaseUser?.displayName?.split(' ')[0] || 'Tutor';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        if (!firebaseUser) return;

        const fetchData = async () => {
            try {
                const [analyticsRes, walletRes, sessionsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/tutor/analytics/${firebaseUser.uid}`),
                    fetch(`${API_BASE}/api/tutor/wallet/${firebaseUser.uid}`),
                    fetch(`${API_BASE}/api/tutor/sessions/${firebaseUser.uid}`),
                ]);

                if (analyticsRes.ok) {
                    const { data } = await analyticsRes.json();
                    setStats(data);
                }
                if (walletRes.ok) {
                    const { data } = await walletRes.json();
                    setWallet(data);
                }
                if (sessionsRes.ok) {
                    const { data } = await sessionsRes.json();
                    setRecentSessions((data || []).slice(0, 5));
                    setPendingCount((data || []).filter((s: SessionItem) => s.status === 'searching').length);
                }
            } catch {
                // Silent fail for dashboard
            }
        };

        fetchData();
    }, [firebaseUser]);

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    if (!profile?.tutorData?.isVerified) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="card p-10 text-center max-w-lg animate-fade-in-up">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg mb-6">
                        <BookOpen className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 text-slate-900">
                        Welcome to Mentora!
                    </h1>
                    <p className="mb-6 text-base text-slate-500">
                        Complete your tutor registration and verification quiz to start teaching on the platform.
                    </p>
                    <Link href="/tutor/register" className="btn-primary inline-block">
                        Start Registration →
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
        searching: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
        pending_payment: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
        paid_waiting: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
        in_progress: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
        completed: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
        cancelled: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
    };

    return (
        <div className="space-y-8">
            {/* ── Hero Card ── */}
            <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white shadow-xl animate-fade-in-up">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
                <div className="absolute top-6 right-8 w-20 h-20 rounded-2xl bg-white/10 rotate-12 animate-float" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium">{greeting}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight">
                            {firstName}, let&apos;s teach today!
                        </h1>
                        <p className="mt-2 text-indigo-200 max-w-lg">
                            Manage your sessions, connect with students, and grow your tutoring career.
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-center flex flex-col items-center">
                            <BookOpen className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Sessions</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <Users className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Students</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <Star className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || '0.0'}</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Rating</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link href="/tutor/sessions" className="card p-5 card-interactive group text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Sessions</p>
                        {pendingCount > 0 && (
                            <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                                {pendingCount}
                            </span>
                        )}
                    </Link>
                    <Link href="/tutor/profile" className="card p-5 card-interactive group text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <UserCircle className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Profile</p>
                    </Link>
                    <Link href="/tutor/wallet" className="card p-5 card-interactive group text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Earnings</p>
                        {wallet && (
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">₹{wallet.totalEarnings || 0}</p>
                        )}
                    </Link>
                    <Link href="/tutor/analytics" className="card p-5 card-interactive group text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">Analytics</p>
                    </Link>
                </div>
            </section>

            {/* ── Activity ── */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Activity</h2>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-sm">
                            <CalendarDays className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Recent Sessions</h3>
                        <Link href="/tutor/sessions" className="ml-auto text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                            View all →
                        </Link>
                    </div>

                    {recentSessions.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                                <Inbox className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-500">No sessions yet</p>
                            <p className="mt-1 text-xs text-slate-400">
                                Sessions will appear here when students book with you
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentSessions.map((session) => {
                                const sc = statusConfig[session.status] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
                                return (
                                    <Link
                                        key={session.sessionId}
                                        href={`/tutor/sessions/${session.sessionId}`}
                                        className="flex items-center justify-between rounded-2xl p-4 transition-all duration-200 hover:bg-slate-50 group border border-slate-100 hover:border-indigo-100 hover:shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="h-10 w-1 rounded-full gradient-primary opacity-60" />
                                            <div>
                                                <p className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                                    {session.topic}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {session.studentName || 'Student'} · {session.meetingType === 'on_demand' ? 'On Demand' : 'Scheduled'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                                {session.status.replace(/_/g, ' ')}
                                            </span>
                                            {(session.status === 'paid_waiting' || session.status === 'in_progress') && (
                                                <span
                                                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        window.location.href = `/room/${session.sessionId}`;
                                                    }}
                                                >
                                                    <Video className="h-3 w-3 inline mr-1" />
                                                    Join
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
