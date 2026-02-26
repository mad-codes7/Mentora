'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Doubt } from '@/config/types';
import {
    HelpCircle, Image, Tag, Clock, CheckCircle2, Search as SearchIcon,
    UserCheck, Inbox,
} from 'lucide-react';
import Link from 'next/link';

export default function DoubtsPage() {
    const { firebaseUser } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'matched' | 'resolved'>('all');

    useEffect(() => {
        const fetchDoubts = async () => {
            if (!firebaseUser) return;

            try {
                const q = query(
                    collection(db, 'doubts'),
                    where('studentId', '==', firebaseUser.uid),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((doc) => ({
                    doubtId: doc.id,
                    ...doc.data(),
                })) as Doubt[];

                setDoubts(data);
            } catch (error) {
                console.error('Error fetching doubts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDoubts();
    }, [firebaseUser]);

    const filteredDoubts = filter === 'all'
        ? doubts
        : doubts.filter((d) => d.status === filter);

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            open: {
                bg: 'bg-amber-50',
                text: 'text-amber-600',
                icon: <Clock className="h-3.5 w-3.5" />,
                label: 'Open',
            },
            matched: {
                bg: 'bg-blue-50',
                text: 'text-blue-600',
                icon: <UserCheck className="h-3.5 w-3.5" />,
                label: 'Tutor Matched',
            },
            resolved: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                label: 'Resolved',
            },
        };
        return configs[status] || configs.open;
    };

    const statusCounts = {
        all: doubts.length,
        open: doubts.filter((d) => d.status === 'open').length,
        matched: doubts.filter((d) => d.status === 'matched').length,
        resolved: doubts.filter((d) => d.status === 'resolved').length,
    };

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'open', label: 'Open' },
        { key: 'matched', label: 'Matched' },
        { key: 'resolved', label: 'Resolved' },
    ] as const;

    return (
        <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                        <HelpCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Doubts</h1>
                        <p className="text-sm text-slate-400">
                            {doubts.length} doubt{doubts.length !== 1 ? 's' : ''} uploaded
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard"
                    className="btn-primary text-sm flex items-center gap-1.5 !py-2 !px-4"
                >
                    <SearchIcon className="h-3.5 w-3.5" />
                    New Doubt
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${filter === f.key
                            ? 'gradient-primary text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {f.label}
                        <span className="ml-1 opacity-70">({statusCounts[f.key]})</span>
                    </button>
                ))}
            </div>

            {/* Doubts List */}
            {loading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-10 w-10 rounded-2xl gradient-primary animate-pulse" />
                </div>
            ) : filteredDoubts.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-slate-50 mb-4">
                        <Inbox className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">No doubts found</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Upload a photo of your doubt from the dashboard!
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredDoubts.map((doubt) => {
                        const status = getStatusConfig(doubt.status);
                        const timeStr = doubt.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) || '';

                        return (
                            <div key={doubt.doubtId} className="card p-5 flex gap-4">
                                {/* Image Preview */}
                                {doubt.imageUrl && (
                                    <div className="shrink-0">
                                        <img
                                            src={doubt.imageUrl}
                                            alt="Doubt"
                                            className="h-20 w-20 rounded-xl object-cover border border-slate-100 bg-slate-50"
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}>
                                            {status.icon}
                                            {status.label}
                                        </span>
                                        {timeStr && (
                                            <span className="text-xs text-slate-400">{timeStr}</span>
                                        )}
                                    </div>

                                    <p className="text-sm font-medium text-slate-700 line-clamp-2 mt-1">
                                        {doubt.description || 'No description provided'}
                                    </p>

                                    {/* Tags */}
                                    {doubt.tags.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Tag className="h-3 w-3 text-slate-400" />
                                            <div className="flex flex-wrap gap-1">
                                                {doubt.tags.map((tag) => (
                                                    <span key={tag} className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-100">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Image indicator if no preview */}
                                    {!doubt.imageUrl && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                            <Image className="h-3 w-3" />
                                            Image attached
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
