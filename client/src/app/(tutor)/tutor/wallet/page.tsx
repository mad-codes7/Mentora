'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { Wallet, Inbox, TrendingUp, Clock, CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface Transaction {
    sessionId: string;
    amount: number;
    studentName: string;
    topic: string;
    date: string;
    status: string;
}

interface WalletData {
    totalEarnings: number;
    pendingAmount: number;
    completedSessions: number;
    transactions: Transaction[];
}

export default function TutorWalletPage() {
    const { firebaseUser } = useAuth();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firebaseUser) return;
        const fetchWallet = async () => {
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
        fetchWallet();
    }, [firebaseUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Wallet</h1>
                    <p className="text-slate-500">Track your earnings and transactions</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 stagger-children">
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Earnings</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                        ₹{wallet?.totalEarnings?.toLocaleString() || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Pending</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
                        ₹{wallet?.pendingAmount?.toLocaleString() || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Paid Sessions</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>
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
                            <p className="mt-2 text-sm text-slate-500">Complete sessions to start earning</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Topic</th>
                                    <th>Student</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wallet.transactions.map((txn, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--text-primary)' }}>{txn.topic}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{txn.studentName}</td>
                                        <td className="font-semibold" style={{ color: 'var(--success)' }}>₹{txn.amount}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(txn.date).toLocaleDateString()}</td>
                                        <td><span className="badge badge-success">Completed</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
