'use client';

import { CommunityMember } from '@/config/types';
import { Crown, Shield, GraduationCap, BookOpenCheck } from 'lucide-react';

interface MemberListProps {
    members: CommunityMember[];
    currentUserId?: string;
}

export default function MemberList({ members, currentUserId }: MemberListProps) {
    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const getAvatarColor = (name: string) => {
        const colors = ['#6366F1', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
        return colors[name.charCodeAt(0) % colors.length];
    };

    // Sort: owner first, then admins, then members
    const sorted = [...members].sort((a, b) => {
        const order = { owner: 0, admin: 1, member: 2 };
        return (order[a.communityRole] || 2) - (order[b.communityRole] || 2);
    });

    return (
        <div className="p-4" id="community-members">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-semibold text-slate-700">Members</h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {members.length}
                </span>
            </div>

            <div className="space-y-0.5">
                {sorted.map((member) => (
                    <div
                        key={member.uid}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-slate-50 ${member.uid === currentUserId ? 'bg-indigo-50/50' : ''
                            }`}
                    >
                        {/* Avatar */}
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(member.displayName) }}
                        >
                            {getInitials(member.displayName)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-slate-700 truncate">
                                    {member.displayName}
                                </span>
                                {member.uid === currentUserId && (
                                    <span className="text-[10px] text-slate-400">(you)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {member.userRole === 'tutor' ? (
                                    <span className="flex items-center gap-0.5 text-[10px] text-indigo-500">
                                        <BookOpenCheck className="h-2.5 w-2.5" />
                                        Tutor
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-500">
                                        <GraduationCap className="h-2.5 w-2.5" />
                                        Student
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Role badge */}
                        {member.communityRole === 'owner' && (
                            <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        {member.communityRole === 'admin' && (
                            <Shield className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
