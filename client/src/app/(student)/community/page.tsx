'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/common/AuthContext';
import { useRouter } from 'next/navigation';
import { Community } from '@/config/types';
import CommunityCard from '@/features/community/CommunityCard';
import CreateCommunityModal from '@/features/community/CreateCommunityModal';
import { Plus, Search, Users, Compass, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CommunityPage() {
    const { mentoraUser } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
    const [myCommunities, setMyCommunities] = useState<Community[]>([]);
    const [allCommunities, setAllCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);

    const fetchData = async () => {
        if (!mentoraUser) return;
        setLoading(true);
        try {
            const [myRes, allRes] = await Promise.all([
                fetch(`${API}/community/user/${mentoraUser.uid}`),
                fetch(`${API}/community`),
            ]);
            const myData = await myRes.json();
            const allData = await allRes.json();
            setMyCommunities(Array.isArray(myData) ? myData : []);
            setAllCommunities(Array.isArray(allData) ? allData : []);
        } catch (err) {
            console.error('Failed to fetch communities:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [mentoraUser]);

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
            await fetchData();
        } catch (err) {
            console.error('Failed to join community:', err);
        }
        setJoining(null);
    };

    const handleClick = (communityId: string) => {
        router.push(`/community/${communityId}`);
    };

    const myIds = new Set(myCommunities.map((c) => c.communityId));
    const discoverCommunities = allCommunities.filter((c) => !myIds.has(c.communityId));

    const filteredDiscover = searchQuery
        ? discoverCommunities.filter(
            (c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : discoverCommunities;

    const filteredMy = searchQuery
        ? myCommunities.filter(
            (c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.subject.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : myCommunities;

    return (
        <div className="animate-fade-in-up" id="community-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Community Hub
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Join learning clans, discuss ideas, and grow together
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2 !rounded-xl"
                        id="create-community-btn"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Create Community</span>
                    </button>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`tab-btn flex items-center gap-1.5 !rounded-lg !px-4 !py-2 ${activeTab === 'my' ? 'active' : ''}`}
                        id="my-communities-tab"
                    >
                        <Users className="h-4 w-4" />
                        My Clans
                        {myCommunities.length > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-bold flex items-center justify-center">
                                {myCommunities.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`tab-btn flex items-center gap-1.5 !rounded-lg !px-4 !py-2 ${activeTab === 'discover' ? 'active' : ''}`}
                        id="discover-tab"
                    >
                        <Compass className="h-4 w-4" />
                        Discover
                    </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search communities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-styled !pl-10 !py-2 !text-sm"
                        id="community-search"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* My Communities */}
                    {activeTab === 'my' && (
                        <div>
                            {filteredMy.length === 0 ? (
                                <div className="card text-center py-16 px-8">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                                        <Users className="h-10 w-10 text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">
                                        {searchQuery ? 'No matching communities' : 'No communities yet'}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : 'Create your own learning clan or explore the Discover tab to find communities to join!'
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="btn-primary flex items-center gap-2 !rounded-xl"
                                            >
                                                <Plus className="h-4 w-4" /> Create One
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('discover')}
                                                className="btn-secondary flex items-center gap-2 !rounded-xl"
                                            >
                                                <Compass className="h-4 w-4" /> Discover
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                                    {filteredMy.map((community) => (
                                        <CommunityCard
                                            key={community.communityId}
                                            community={community}
                                            isMember={true}
                                            onJoin={handleJoin}
                                            onClick={handleClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Discover */}
                    {activeTab === 'discover' && (
                        <div>
                            {filteredDiscover.length === 0 ? (
                                <div className="card text-center py-16 px-8">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                                        <Compass className="h-10 w-10 text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">
                                        {searchQuery ? 'No results found' : 'No communities to discover'}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {searchQuery
                                            ? 'Try different keywords'
                                            : 'Be the first to create a community!'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
                                    {filteredDiscover.map((community) => (
                                        <CommunityCard
                                            key={community.communityId}
                                            community={community}
                                            isMember={false}
                                            onJoin={handleJoin}
                                            onClick={handleClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            <CreateCommunityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={fetchData}
            />
        </div>
    );
}
