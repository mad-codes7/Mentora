'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { Community } from '@/config/types';
import {
    X, Users, MessageSquare, Hash, Loader2, ArrowRight,
    Sparkles, ExternalLink,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AskCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchTags: string[];
    doubtDescription?: string;
}

export default function AskCommunityModal({
    isOpen,
    onClose,
    searchTags,
    doubtDescription,
}: AskCommunityModalProps) {
    const { mentoraUser } = useAuth();
    const router = useRouter();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<string | null>(null);
    const [posting, setPosting] = useState<string | null>(null);
    const [posted, setPosted] = useState<Set<string>>(new Set());
    const [userCommunityIds, setUserCommunityIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen || !mentoraUser) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [allRes, myRes] = await Promise.all([
                    fetch(`${API}/community`),
                    fetch(`${API}/community/user/${mentoraUser.uid}`),
                ]);
                const allData = await allRes.json();
                const myData = await myRes.json();

                const allCommunities: Community[] = Array.isArray(allData) ? allData : [];
                const myCommunities: Community[] = Array.isArray(myData) ? myData : [];

                setUserCommunityIds(new Set(myCommunities.map(c => c.communityId)));

                // Filter communities by tag match
                const lowerTags = searchTags.map(t => t.toLowerCase());
                const matched = allCommunities.filter(c =>
                    c.tags?.some(tag =>
                        lowerTags.some(st =>
                            tag.toLowerCase().includes(st) || st.includes(tag.toLowerCase())
                        )
                    ) ||
                    lowerTags.some(st =>
                        c.subject?.toLowerCase().includes(st) || st.includes(c.subject?.toLowerCase())
                    )
                );

                // Show matched first, then all others
                const matchedIds = new Set(matched.map(c => c.communityId));
                const others = allCommunities.filter(c => !matchedIds.has(c.communityId));

                setCommunities([...matched, ...others]);
            } catch (err) {
                console.error('Failed to fetch communities:', err);
            }
            setLoading(false);
        };

        fetchData();
    }, [isOpen, mentoraUser, searchTags]);

    const handleJoin = async (communityId: string) => {
        if (!mentoraUser) return;
        setJoining(communityId);
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
            setUserCommunityIds(prev => new Set([...prev, communityId]));
        } catch (err) {
            console.error('Failed to join community:', err);
        }
        setJoining(null);
    };

    const handlePostDoubt = async (communityId: string) => {
        if (!mentoraUser) return;
        setPosting(communityId);
        try {
            const userRole = mentoraUser.roles.includes('tutor') ? 'tutor' : 'student';
            const tagsText = searchTags.length > 0 ? `\n📌 Tags: ${searchTags.join(', ')}` : '';
            const message = `🆘 **Urgent Doubt**\n${doubtDescription || 'I need help with this topic!'}${tagsText}\n\n_Posted via Instant Doubt — Can anyone help?_`;

            await fetch(`${API}/community/${communityId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: mentoraUser.uid,
                    senderName: mentoraUser.profile.fullName,
                    senderRole: userRole,
                    text: message,
                    type: 'text',
                }),
            });
            setPosted(prev => new Set([...prev, communityId]));
        } catch (err) {
            console.error('Failed to post doubt:', err);
        }
        setPosting(null);
    };

    const handleGoToCommunity = (communityId: string) => {
        onClose();
        router.push(`/community/${communityId}`);
    };

    if (!isOpen) return null;

    // Determine which communities are tag-matched
    const lowerTags = searchTags.map(t => t.toLowerCase());
    const isMatched = (c: Community) =>
        c.tags?.some(tag => lowerTags.some(st => tag.toLowerCase().includes(st) || st.includes(tag.toLowerCase()))) ||
        lowerTags.some(st => c.subject?.toLowerCase().includes(st) || st.includes(c.subject?.toLowerCase()));

    const matchedCommunities = communities.filter(isMatched);
    const otherCommunities = communities.filter(c => !isMatched(c));

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div
                className="card max-w-lg w-full mx-4 max-h-[80vh] flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Ask into Community</h3>
                            <p className="text-xs text-slate-400">Post your doubt to a matching community</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                {/* Tags */}
                {searchTags.length > 0 && (
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                        <Hash className="h-3.5 w-3.5 text-slate-400" />
                        {searchTags.map(tag => (
                            <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 border border-indigo-100">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                        </div>
                    ) : communities.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No communities found</p>
                            <p className="text-sm text-slate-400 mt-1">Create a community from the Communities page!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Matched communities */}
                            {matchedCommunities.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matching Communities</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {matchedCommunities.map(community => (
                                            <CommunityRow
                                                key={community.communityId}
                                                community={community}
                                                isMember={userCommunityIds.has(community.communityId)}
                                                isPosted={posted.has(community.communityId)}
                                                isJoining={joining === community.communityId}
                                                isPosting={posting === community.communityId}
                                                onJoin={() => handleJoin(community.communityId)}
                                                onPost={() => handlePostDoubt(community.communityId)}
                                                onGo={() => handleGoToCommunity(community.communityId)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other communities */}
                            {otherCommunities.length > 0 && (
                                <div>
                                    {matchedCommunities.length > 0 && (
                                        <div className="flex items-center gap-2 mb-3 mt-4">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Communities</span>
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        {otherCommunities.slice(0, 10).map(community => (
                                            <CommunityRow
                                                key={community.communityId}
                                                community={community}
                                                isMember={userCommunityIds.has(community.communityId)}
                                                isPosted={posted.has(community.communityId)}
                                                isJoining={joining === community.communityId}
                                                isPosting={posting === community.communityId}
                                                onJoin={() => handleJoin(community.communityId)}
                                                onPost={() => handlePostDoubt(community.communityId)}
                                                onGo={() => handleGoToCommunity(community.communityId)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CommunityRow({
    community,
    isMember,
    isPosted,
    isJoining,
    isPosting,
    onJoin,
    onPost,
    onGo,
}: {
    community: Community;
    isMember: boolean;
    isPosted: boolean;
    isJoining: boolean;
    isPosting: boolean;
    onJoin: () => void;
    onPost: () => void;
    onGo: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            {/* Emoji */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl flex-shrink-0"
                style={{ backgroundColor: community.bannerColor + '20' }}>
                {community.logoEmoji || '📚'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{community.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{community.memberCount} members</span>
                    {community.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-2">
                {isPosted ? (
                    <button onClick={onGo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                        <ExternalLink className="h-3 w-3" /> View
                    </button>
                ) : isMember ? (
                    <button
                        onClick={onPost}
                        disabled={isPosting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isPosting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <MessageSquare className="h-3 w-3" />
                        )}
                        Post Doubt
                    </button>
                ) : (
                    <button
                        onClick={onJoin}
                        disabled={isJoining}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        {isJoining ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <ArrowRight className="h-3 w-3" />
                        )}
                        Join
                    </button>
                )}
            </div>
        </div>
    );
}
