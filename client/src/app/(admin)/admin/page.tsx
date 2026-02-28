'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/common/AuthContext';
import {
    DollarSign, Users, TrendingUp, Wallet, CreditCard, ArrowDownCircle,
    ArrowUpCircle, Shield, BarChart3, Briefcase, Loader2, RefreshCcw,
    CheckCircle2, Clock, XCircle, Coins
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface DashboardData {
    finance: {
        totalRevenue: number;
        totalCommission: number;
        totalTransferred: number;
        totalHeld: number;
        heldPayments: number;
        transferredPayments: number;
        totalPointsInCirculation: number;
    };
    payments: {
        sessionId: string;
        amount: number;
        commission: number;
        tutorShare: number;
        status: string;
        tutorTransferred: boolean;
        studentId: string;
        createdAt: { _seconds: number } | string;
    }[];
    tutorWallets: {
        tutorId: string;
        tutorName: string;
        points: number;
        totalEarned: number;
        totalCommission: number;
        totalRedeemed: number;
    }[];
    sessions: {
        total: number;
        completed: number;
        active: number;
        cancelled: number;
    };
    users: {
        totalStudents: number;
        totalTutors: number;
    };
}

export default function AdminDashboard() {
    const { firebaseUser } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API}/admin/dashboard`);
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchData();
    }, [firebaseUser]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatDate = (ts: { _seconds: number } | string) => {
        if (!ts) return '';
        if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (typeof ts === 'object' && '_seconds' in ts) return new Date(ts._seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-red-400 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <Shield className="h-10 w-10 text-red-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Failed to load dashboard</p>
                <button onClick={handleRefresh} className="mt-3 btn-primary text-sm">Retry</button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-sm">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-sm text-slate-400">Platform financials & analytics</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Finance Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <div className="card p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-emerald-700">Total Revenue</p>
                    </div>
                    <p className="text-3xl font-black text-emerald-700">₹{data.finance.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 mt-1">{data.payments.length} payments total</p>
                </div>

                <div className="card p-5 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                            <TrendingUp className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-sm font-medium text-red-700">Commission Earned</p>
                    </div>
                    <p className="text-3xl font-black text-red-700">₹{data.finance.totalCommission.toLocaleString()}</p>
                    <p className="text-xs text-red-500 mt-1">10% of all transactions</p>
                </div>

                <div className="card p-5 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                            <Coins className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-amber-700">Points in Circulation</p>
                    </div>
                    <p className="text-3xl font-black text-amber-700">{data.finance.totalPointsInCirculation.toLocaleString()}</p>
                    <p className="text-xs text-amber-500 mt-1">= ₹{data.finance.totalPointsInCirculation.toLocaleString()}</p>
                </div>

                <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                            <Wallet className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-blue-700">Currently Held</p>
                    </div>
                    <p className="text-3xl font-black text-blue-700">₹{data.finance.totalHeld.toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-1">{data.finance.heldPayments} pending transfers</p>
                </div>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="stat-card flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                        <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{data.users.totalStudents}</p>
                        <p className="text-xs text-slate-400">Students</p>
                    </div>
                </div>
                <div className="stat-card flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{data.users.totalTutors}</p>
                        <p className="text-xs text-slate-400">Tutors</p>
                    </div>
                </div>
                <div className="stat-card flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{data.sessions.completed}</p>
                        <p className="text-xs text-slate-400">Completed</p>
                    </div>
                </div>
                <div className="stat-card flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                        <BarChart3 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{data.sessions.total}</p>
                        <p className="text-xs text-slate-400">Total Sessions</p>
                    </div>
                </div>
            </div>

            {/* Two-column: Tutor Wallets + Recent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tutor Wallets */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-amber-500" />
                        Tutor Wallets
                    </h2>
                    {data.tutorWallets.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">No tutor wallets yet</p>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {data.tutorWallets.map((w) => (
                                <div key={w.tutorId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold flex-shrink-0">
                                        {w.tutorName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{w.tutorName}</p>
                                        <p className="text-[10px] text-slate-400">
                                            Earned: {w.totalEarned} · Commission: {w.totalCommission} · Redeemed: {w.totalRedeemed || 0}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-amber-600">{w.points} pts</p>
                                        <p className="text-[10px] text-slate-300">= ₹{w.points}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Payments */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-emerald-500" />
                        Recent Payments
                    </h2>
                    {data.payments.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">No payments yet</p>
                    ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto">
                            {data.payments.slice(0, 20).map((p) => (
                                <div key={p.sessionId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${p.tutorTransferred
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-amber-100 text-amber-600'
                                        }`}>
                                        {p.tutorTransferred ? <ArrowUpCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-700 truncate">
                                            Session: {p.sessionId.slice(0, 12)}...
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {formatDate(p.createdAt)} · Commission: ₹{p.commission}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-slate-900">₹{p.amount}</p>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.tutorTransferred
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {p.tutorTransferred ? 'Transferred' : 'Held'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
