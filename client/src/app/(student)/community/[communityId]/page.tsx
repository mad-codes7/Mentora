'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { Community, CommunityMember } from '@/config/types';
import CommunityChat from '@/features/community/CommunityChat';
import MemberList from '@/features/community/MemberList';
import {
    ArrowLeft, Users, LogOut, UserPlus, Crown,
    MessageCircle, ChevronRight, Loader2, Hash, Globe,
    BookOpen, Atom, FlaskConical, Code, Calculator, Microscope,
    Languages, History, BarChart3, Lightbulb, Palette
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
    'Mathematics': <Calculator className="h-6 w-6" />,
    'Physics': <Atom className="h-6 w-6" />,
    'Chemistry': <FlaskConical className="h-6 w-6" />,
    'Biology': <Microscope className="h-6 w-6" />,
    'Computer Science': <Code className="h-6 w-6" />,
    'English': <Languages className="h-6 w-6" />,
    'History': <History className="h-6 w-6" />,
    'Geography': <Globe className="h-6 w-6" />,
    'Economics': <BarChart3 className="h-6 w-6" />,
    'General Knowledge': <Lightbulb className="h-6 w-6" />,
    'Mixed / Other': <BookOpen className="h-6 w-6" />,
};

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
                setIsMember((Array.isArray(memData) ? memData : []).some((m: CommunityMember) => m.uid === mentoraUser.uid));
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
                body: JSON.stringify({ uid: mentoraUser.uid, displayName: mentoraUser.profile.fullName, userRole }),
            });
            await fetchCommunity();
        } catch (err) {
            console.error('Failed to join:', err);
        }
        setActionLoading(false);
    };

    const handleLeave = async () => {
        if (!mentoraUser || !confirm('Are you sure you want to leave this community?')) return;
        setActionLoading(true);
        try {
            await fetch(`${API}/community/${communityId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: mentoraUser.uid }),
            });
            router.push('/community');
        } catch (err) {
            console.error('Failed to leave:', err);
        }
        setActionLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="text-center py-20">
                <p className="text-base font-semibold text-slate-600 mb-1">Community not found</p>
                <p className="text-sm text-slate-400 mb-4">It may have been removed.</p>
                <button onClick={() => router.push('/community')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                    Back to Communities
                </button>
            </div>
        );
    }

    const SubjectIcon = SUBJECT_ICONS[community.subject] || <BookOpen className="h-6 w-6" />;

    return (
        <div className="animate-fade-in-up" id="community-detail-page">
            {/* Header */}
            <div className="bg-white rounded-lg border border-slate-200 mb-5">
                <div className="p-5">
                    {/* Top row: back + actions */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.push('/community')}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Communities
                        </button>
                        <div className="flex gap-2">
                            {isMember ? (
                                <button
                                    onClick={handleLeave}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    Leave
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Join
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Community info */}
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${community.bannerColor}12`, color: community.bannerColor }}
                        >
                            {SubjectIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-semibold text-slate-800">{community.name}</h1>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                <span style={{ color: community.bannerColor }} className="font-medium">{community.subject}</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {community.memberCount}/{community.maxMembers}</span>
                                <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-500" /> {community.createdByName}</span>
                                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {community.isPublic ? 'Public' : 'Private'}</span>
                            </div>
                            {community.description && (
                                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{community.description}</p>
                            )}
                            {community.tags?.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap mt-2">
                                    {community.tags.map((tag) => (
                                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 flex items-center gap-0.5">
                                            <Hash className="h-2.5 w-2.5" />{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Member count */}
                        <div className="hidden sm:flex flex-col items-center bg-slate-50 rounded-lg px-5 py-3 flex-shrink-0">
                            <p className="text-xl font-semibold text-slate-800">{community.memberCount}</p>
                            <p className="text-[11px] text-slate-400">members</p>
                            <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden" style={{ width: '60px' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.round((community.memberCount / community.maxMembers) * 100)}%`, backgroundColor: community.bannerColor }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat + Members layout */}
            <div className="flex gap-4" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
                {/* Chat */}
                <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Chat</span>
                        </div>
                        <button
                            onClick={() => setShowMembers(!showMembers)}
                            className="lg:hidden flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                        >
                            <Users className="h-3.5 w-3.5" />
                            {members.length}
                            <ChevronRight className={`h-3 w-3 transition-transform ${showMembers ? 'rotate-90' : ''}`} />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0">
                        <CommunityChat communityId={communityId} isAMember={isMember} />
                    </div>
                </div>

                {/* Members sidebar */}
                <div className={`bg-white rounded-lg border border-slate-200 overflow-y-auto w-64 flex-shrink-0 ${showMembers ? 'block' : 'hidden lg:block'}`}>
                    <MemberList members={members} currentUserId={mentoraUser?.uid} />
                </div>
            </div>

            {/* Mobile member overlay */}
            {showMembers && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMembers(false)}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-lg animate-slide-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-medium text-slate-700">Members</span>
                            <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                        </div>
                        <MemberList members={members} currentUserId={mentoraUser?.uid} />
                    </div>
                </div>
            )}
        </div>
    );
}
