'use client';

import { Community } from '@/config/types';
import { Users, ArrowRight, Crown } from 'lucide-react';

interface CommunityCardProps {
    community: Community;
    isMember: boolean;
    onJoin: (communityId: string) => void;
    onClick: (communityId: string) => void;
}

export default function CommunityCard({ community, isMember, onJoin, onClick }: CommunityCardProps) {
    return (
        <div
            className="card card-interactive cursor-pointer transition-all duration-300 overflow-hidden group"
            onClick={() => onClick(community.communityId)}
            id={`community-card-${community.communityId}`}
        >
            {/* Banner */}
            <div
                className="h-20 relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${community.bannerColor}dd, ${community.bannerColor}88)`,
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    {community.logoEmoji}
                </div>
            </div>

            {/* Body */}
            <div className="p-5 -mt-6 relative">
                {/* Logo badge */}
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-white mb-3"
                    style={{ background: `linear-gradient(135deg, ${community.bannerColor}, ${community.bannerColor}cc)` }}
                >
                    {community.logoEmoji}
                </div>

                {/* Title & Subject */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                    {community.name}
                </h3>
                <span className="badge badge-info text-xs mb-2">{community.subject}</span>

                {/* Description */}
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[40px]">
                    {community.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium">{community.memberCount}/{community.maxMembers}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-1 overflow-hidden">
                        {community.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Created by */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span>{community.createdByName}</span>
                    </div>

                    {isMember ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            Joined <ArrowRight className="h-3 w-3" />
                        </span>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onJoin(community.communityId);
                            }}
                            className="btn-primary text-xs !px-4 !py-1.5 !rounded-full"
                            id={`join-btn-${community.communityId}`}
                        >
                            Join
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
