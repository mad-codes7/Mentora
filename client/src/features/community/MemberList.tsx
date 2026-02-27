'use client';

import { CommunityMember } from '@/config/types';
import { Crown, Shield, User } from 'lucide-react';

interface MemberListProps {
    members: CommunityMember[];
    currentUserId?: string;
}

export default function MemberList({ members, currentUserId }: MemberListProps) {
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown className="h-3 w-3 text-amber-500" />;
            case 'admin': return <Shield className="h-3 w-3 text-indigo-500" />;
            default: return null;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'admin': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            default: return '';
        }
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const getAvatarColor = (name: string) => {
        const colors = [
            '#4F46E5', '#2563EB', '#7C3AED', '#DB2777',
            '#059669', '#D97706', '#DC2626', '#0891B2',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Sort: owner first, then admins, then members
    const sorted = [...members].sort((a, b) => {
        const order = { owner: 0, admin: 1, member: 2 };
        return (order[a.communityRole] || 2) - (order[b.communityRole] || 2);
    });

    return (
        <div className="p-4" id="community-members">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                Members ({members.length})
            </h3>

            <div className="space-y-1.5">
                {sorted.map((member) => (
                    <div
                        key={member.uid}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-slate-50 ${member.uid === currentUserId ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : ''
                            }`}
                    >
                        {/* Avatar */}
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: getAvatarColor(member.displayName) }}
                        >
                            {getInitials(member.displayName)}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-slate-800 truncate">
                                    {member.displayName}
                                    {member.uid === currentUserId && (
                                        <span className="text-xs text-slate-400 ml-1">(you)</span>
                                    )}
                                </span>
                                {getRoleIcon(member.communityRole)}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`community-role-badge ${member.userRole === 'tutor' ? 'community-role-tutor' : 'community-role-student'
                                    }`}>
                                    {member.userRole}
                                </span>
                                {member.communityRole !== 'member' && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getRoleBadge(member.communityRole)}`}>
                                        {member.communityRole}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
