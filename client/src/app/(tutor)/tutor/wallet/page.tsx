'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { Wallet, Inbox, TrendingUp, Coins, ArrowDownCircle, ArrowUpCircle, AlertCircle, Banknote, Gift, Lock } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface PointTransaction {
    id: string;
    type: 'credit' | 'redemption';
    amount: number;
    sessionId?: string;
    description: string;
    createdAt: { _seconds: number } | string;
}

interface WalletData {
    points: number;
    totalEarned: number;
    totalCommission: number;
    totalRedeemed: number;
    canRedeem: boolean;
    minRedeemPoints: number;
    transactions: PointTransaction[];
    completedSessions: number;
}

export default function TutorWalletPage() {
    const { firebaseUser } = useAuth();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [redeemError, setRedeemError] = useState('');
    const [redeemSuccess, setRedeemSuccess] = useState('');
    const [showRedeemModal, setShowRedeemModal] = useState(false);

    const fetchWallet = async () => {
        if (!firebaseUser) return;
        try {
            const res = await fetch(`${API_BASE}/api/tutor/wallet/${firebaseUser.uid}`);
            if (res.ok) {
                const { data } = await res.json();
                setWallet(data);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, [firebaseUser]);

    const handleRedeem = async () => {
        if (!firebaseUser || !redeemAmount) return;
        const amount = parseInt(redeemAmount);
        if (isNaN(amount) || amount <= 0) {
            setRedeemError('Enter a valid amount');
            return;
        }
        setRedeeming(true);
        setRedeemError('');
        setRedeemSuccess('');
        try {
            const res = await fetch(`${API}/payment/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tutorId: firebaseUser.uid, amount }),
            });
            const data = await res.json();
            if (res.ok) {
                setRedeemSuccess(data.data?.message || 'Redeemed successfully!');
                setRedeemAmount('');
                setShowRedeemModal(false);
                await fetchWallet();
            } else {
                setRedeemError(data.error || 'Redemption failed');
            }
        } catch {
            setRedeemError('Network error. Try again.');
        }
        setRedeeming(false);
    };

    const formatDate = (ts: { _seconds: number } | string) => {
        if (!ts) return '';
        if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        if (typeof ts === 'object' && '_seconds' in ts) return new Date(ts._seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        return '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    const points = wallet?.points || 0;
    const canRedeem = points >= (wallet?.minRedeemPoints || 1000);
    const progressToRedeem = Math.min((points / (wallet?.minRedeemPoints || 1000)) * 100, 100);

    return (
        <div className="max-w-5xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Wallet Points</h1>
                    <p className="text-slate-500">Earn points from sessions · 1 point = ₹1</p>
                </div>
            </div>

            {/* Points Balance — Hero Card */}
            <div className="card p-8 mb-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-10">
                    <Coins className="h-32 w-32 text-amber-500" />
                </div>
                <div className="relative">
                    <p className="text-sm font-medium text-amber-700 mb-1">Available Points</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-amber-600">{points.toLocaleString()}</span>
                        <span className="text-lg font-medium text-amber-400">pts</span>
                    </div>
                    <p className="text-sm text-amber-600/70 mt-1">= ₹{points.toLocaleString()}</p>

                    {/* Progress to redeem */}
                    {!canRedeem && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-amber-600/80 mb-1">
                                <span>Progress to redeem</span>
                                <span>{points} / {wallet?.minRedeemPoints || 1000} pts</span>
                            </div>
                            <div className="w-full bg-amber-200/50 rounded-full h-2">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                                    style={{ width: `${progressToRedeem}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Need {(wallet?.minRedeemPoints || 1000) - points} more points to redeem
                            </p>
                        </div>
                    )}

                    {/* Redeem button */}
                    <button
                        onClick={() => { setShowRedeemModal(true); setRedeemError(''); setRedeemSuccess(''); }}
                        disabled={!canRedeem}
                        className={`mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${canRedeem
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:shadow-lg hover:scale-105'
                                : 'bg-amber-200/50 text-amber-400 cursor-not-allowed'
                            }`}
                    >
                        <Gift className="h-4 w-4" />
                        {canRedeem ? 'Redeem Points' : `Redeem (min ${wallet?.minRedeemPoints || 1000} pts)`}
                    </button>
                </div>
            </div>

            {/* Redeem Success Message */}
            {redeemSuccess && (
                <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 animate-fade-in-up">
                    <ArrowUpCircle className="h-4 w-4" />
                    {redeemSuccess}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8 stagger-children">
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                        {(wallet?.totalEarned || 0).toLocaleString()} pts
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Commission Paid</p>
                    <p className="text-2xl font-bold text-rose-500">
                        {(wallet?.totalCommission || 0).toLocaleString()} pts
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Redeemed</p>
                    <p className="text-2xl font-bold text-indigo-500">
                        ₹{(wallet?.totalRedeemed || 0).toLocaleString()}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Sessions</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                        {wallet?.completedSessions || 0}
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Transaction History</h2>
                {(!wallet?.transactions || wallet.transactions.length === 0) ? (
                    <div className="text-center py-12">
                        <div className="flex flex-col items-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                                <Inbox className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="mt-4 text-xl font-semibold text-slate-900">No transactions yet</h3>
                            <p className="mt-2 text-sm text-slate-500">Complete sessions to start earning points</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {wallet.transactions.map((txn) => (
                            <div key={txn.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${txn.type === 'credit'
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-rose-100 text-rose-600'
                                    }`}>
                                    {txn.type === 'credit' ? (
                                        <ArrowDownCircle className="h-5 w-5" />
                                    ) : (
                                        <ArrowUpCircle className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{txn.description}</p>
                                    <p className="text-xs text-slate-400">{formatDate(txn.createdAt)}</p>
                                </div>
                                <div className={`text-right`}>
                                    <p className={`text-sm font-bold ${txn.type === 'credit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {txn.type === 'credit' ? '+' : ''}{txn.amount} pts
                                    </p>
                                    <p className={`text-[10px] font-medium uppercase ${txn.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {txn.type}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Redeem Modal */}
            {showRedeemModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowRedeemModal(false)}>
                    <div className="card max-w-md w-full mx-4 p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                                <Banknote className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Redeem Points</h3>
                                <p className="text-xs text-slate-400">Available: {points.toLocaleString()} pts (= ₹{points.toLocaleString()})</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount to redeem (₹)</label>
                            <input
                                type="number"
                                value={redeemAmount}
                                onChange={(e) => { setRedeemAmount(e.target.value); setRedeemError(''); }}
                                placeholder={`Enter amount (max ₹${points})`}
                                className="input-styled w-full"
                                min={1}
                                max={points}
                            />
                        </div>

                        {redeemError && (
                            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {redeemError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRedeemModal(false)}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRedeem}
                                disabled={redeeming || !redeemAmount}
                                className="flex-1 btn-primary text-sm !py-2.5 disabled:opacity-50"
                            >
                                {redeeming ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Processing...
                                    </div>
                                ) : 'Redeem'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
