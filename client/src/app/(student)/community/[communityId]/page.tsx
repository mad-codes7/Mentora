'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { Community, CommunityMember } from '@/config/types';
import CommunityChat from '@/features/community/CommunityChat';
import MemberList from '@/features/community/MemberList';
import {
    ArrowLeft, Users, LogOut, UserPlus, Crown, Info,
    MessageCircle, ChevronRight, Loader2
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CommunityDetailPage() {
    const { communityId } = useParams<{ communityId: string }>();
    const { mentoraUser } = useAuth();
    const router = useRouter();

    const [community, setCommunity] = useState<Community | null>(null);
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchCommunity = async () => {
        try {
            const [comRes, memRes] = await Promise.all([
                fetch(`${API}/community/${communityId}`),
                fetch(`${API}/community/${communityId}/members`),
            ]);
            const comData = await comRes.json();
            const memData = await memRes.json();

            setCommunity(comData);
            setMembers(Array.isArray(memData) ? memData : []);

            if (mentoraUser) {
                const memberCheck = (Array.isArray(memData) ? memData : [])
                    .some((m: CommunityMember) => m.uid === mentoraUser.uid);
                setIsMember(memberCheck);
            }
        } catch (err) {
            console.error('Failed to fetch community:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (communityId) fetchCommunity();
    }, [communityId, mentoraUser]);

    const handleJoin = async () => {
        if (!mentoraUser) return;
        setActionLoading(true);
        try {
            const userRole = mentoraUser.roles.includes('tutor') ? 'tutor' : 'student';
            await fetch(`${API}/community/${communityId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: mentoraUser.uid,
                    displayName: mentoraUser.profile.fullName,
                    userRole,
                }),
            });
            await fetchCommunity();
        } catch (err) {
            console.error('Failed to join community:', err);
        }
        setActionLoading(false);
    };

    const handleLeave = async () => {
        if (!mentoraUser) return;
        if (!confirm('Are you sure you want to leave this community?')) return;
        setActionLoading(true);
        try {
            await fetch(`${API}/community/${communityId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: mentoraUser.uid }),
            });
            router.push('/community');
        } catch (err) {
            console.error('Failed to leave community:', err);
        }
        setActionLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="text-center py-20">
                <p className="text-lg font-bold text-slate-700">Community not found</p>
                <button onClick={() => router.push('/community')} className="btn-primary mt-4 !rounded-xl">
                    Back to Communities
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up" id="community-detail-page">
            {/* Header */}
            <div className="card overflow-hidden mb-6">
                {/* Banner */}
                <div
                    className="h-32 sm:h-40 relative overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${community.bannerColor}ee, ${community.bannerColor}88, ${community.bannerColor}44)`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="absolute -bottom-6 -right-6 text-8xl opacity-15 transform rotate-12">
                        {community.logoEmoji}
                    </div>

                    {/* Back button */}
                    <button
                        onClick={() => router.push('/community')}
                        className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                </div>

                {/* Info bar */}
                <div className="p-5 -mt-8 relative">
                    <div className="flex items-end gap-4 mb-4">
                        {/* Logo */}
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-3 border-white"
                            style={{ background: `linear-gradient(135deg, ${community.bannerColor}, ${community.bannerColor}cc)` }}
                        >
                            {community.logoEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-slate-900 truncate">{community.name}</h1>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="badge badge-info">{community.subject}</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {community.memberCount} members
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Crown className="h-3 w-3 text-amber-500" />
                                    {community.createdByName}
                                </span>
                            </div>
                        </div>

                        {/* Action button */}
                        <div className="flex gap-2 flex-shrink-0">
                            {isMember ? (
                                <button
                                    onClick={handleLeave}
                                    disabled={actionLoading}
                                    className="btn-secondary flex items-center gap-1.5 !rounded-xl !py-2 !px-3 text-sm text-red-500 border-red-200 hover:bg-red-50 hover:!text-red-600 hover:!border-red-300"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    Leave
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={actionLoading}
                                    className="btn-primary flex items-center gap-1.5 !rounded-xl !py-2 !px-4 text-sm"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Join
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {community.description && (
                        <p className="text-sm text-slate-500 mb-3">{community.description}</p>
                    )}

                    {/* Tags */}
                    {community.tags?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                            {community.tags.map((tag) => (
                                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content area: Chat + Member sidebar */}
            <div className="flex gap-5" style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}>
                {/* Chat panel */}
                <div className="flex-1 card overflow-hidden flex flex-col">
                    {/* Chat header */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-bold text-slate-700">Chat</span>
                        </div>
                        {/* Mobile members toggle */}
                        <button
                            onClick={() => setShowMembers(!showMembers)}
                            className="lg:hidden flex items-center gap-1 text-xs text-indigo-600 font-medium"
                        >
                            <Users className="h-3.5 w-3.5" />
                            {members.length}
                            <ChevronRight className={`h-3 w-3 transition-transform ${showMembers ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    {/* Chat body */}
                    <div className="flex-1 min-h-0">
                        <CommunityChat communityId={communityId} isAMember={isMember} />
                    </div>
                </div>

                {/* Member Sidebar - desktop */}
                <div className={`card overflow-y-auto w-72 flex-shrink-0 ${showMembers ? 'block' : 'hidden lg:block'}`}>
                    <MemberList members={members} currentUserId={mentoraUser?.uid} />
                </div>
            </div>

            {/* Mobile member overlay */}
            {showMembers && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMembers(false)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-slide-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-900">Members</span>
                            <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <MemberList members={members} currentUserId={mentoraUser?.uid} />
                    </div>
                </div>
            )}
        </div>
    );
}
