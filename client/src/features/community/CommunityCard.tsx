'use client';

import { Community } from '@/config/types';
import { Users, ArrowRight, Crown, BookOpen, Atom, FlaskConical, Code, Calculator, Globe, History, Palette, Dumbbell, BarChart3, Lightbulb, Microscope, Languages } from 'lucide-react';

interface CommunityCardProps {
    community: Community;
    isMember: boolean;
    onJoin: (communityId: string) => void;
    onClick: (communityId: string) => void;
}

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
    'Mathematics': <Calculator className="h-5 w-5" />,
    'Physics': <Atom className="h-5 w-5" />,
    'Chemistry': <FlaskConical className="h-5 w-5" />,
    'Biology': <Microscope className="h-5 w-5" />,
    'Computer Science': <Code className="h-5 w-5" />,
    'English': <Languages className="h-5 w-5" />,
    'History': <History className="h-5 w-5" />,
    'Geography': <Globe className="h-5 w-5" />,
    'Economics': <BarChart3 className="h-5 w-5" />,
    'General Knowledge': <Lightbulb className="h-5 w-5" />,
    'Mixed / Other': <BookOpen className="h-5 w-5" />,
};

function getSubjectIcon(subject: string) {
    return SUBJECT_ICONS[subject] || <BookOpen className="h-5 w-5" />;
}

export default function CommunityCard({ community, isMember, onJoin, onClick }: CommunityCardProps) {
    return (
        <div
            className="bg-white rounded-xl border border-slate-200 cursor-pointer transition-all duration-200 overflow-hidden group hover:border-slate-300 hover:shadow-sm"
            onClick={() => onClick(community.communityId)}
            id={`community-card-${community.communityId}`}
        >
            <div className="p-5">
                <div className="flex items-start gap-3.5 mb-3">
                    {/* Icon */}
                    <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${community.bannerColor}12`, color: community.bannerColor }}
                    >
                        {getSubjectIcon(community.subject)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {community.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{community.subject}</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {community.description || 'A community for learning and collaboration.'}
                </p>

                {/* Tags */}
                {community.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                        {community.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Members bar */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-400">
                            <span className="font-medium text-slate-600">{community.memberCount}</span> / {community.maxMembers} members
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${Math.round((community.memberCount / community.maxMembers) * 100)}%`,
                                backgroundColor: community.bannerColor,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Crown className="h-3 w-3 text-amber-500" />
                    <span>{community.createdByName}</span>
                </div>

                {isMember ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                        Joined <ArrowRight className="h-3 w-3" />
                    </span>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onJoin(community.communityId);
                        }}
                        className="text-xs font-medium text-white px-3.5 py-1.5 rounded-md transition-colors"
                        style={{ backgroundColor: community.bannerColor }}
                        id={`join-btn-${community.communityId}`}
                    >
                        Join
                    </button>
                )}
            </div>
        </div>
    );
}
