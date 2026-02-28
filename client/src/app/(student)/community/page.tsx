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
            {/* Header bar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800">Communities</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Connect, learn, and grow with peers</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    id="create-community-btn"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Community</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Users className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-slate-800">{myCommunities.length}</p>
                        <p className="text-[11px] text-slate-400">My Clans</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Compass className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-slate-800">{allCommunities.length}</p>
                        <p className="text-[11px] text-slate-400">Total</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Search className="h-4.5 w-4.5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-slate-800">{discoverCommunities.length}</p>
                        <p className="text-[11px] text-slate-400">Discover</p>
                    </div>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'my'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        id="my-communities-tab"
                    >
                        <Users className="h-4 w-4" />
                        My Clans
                        {myCommunities.length > 0 && (
                            <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTab === 'my' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {myCommunities.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${activeTab === 'discover'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        id="discover-tab"
                    >
                        <Compass className="h-4 w-4" />
                        Discover
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                        id="community-search"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
                </div>
            ) : (
                <>
                    {activeTab === 'my' && (
                        <div>
                            {filteredMy.length === 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 text-center py-16 px-8">
                                    <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <h3 className="text-base font-semibold text-slate-600 mb-1">
                                        {searchQuery ? 'No matching communities' : 'No communities yet'}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-5 max-w-sm mx-auto">
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : 'Create your own learning clan or discover existing ones.'
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                                                <Plus className="h-4 w-4" /> Create
                                            </button>
                                            <button onClick={() => setActiveTab('discover')} className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                                <Compass className="h-4 w-4" /> Discover
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredMy.map((community) => (
                                        <CommunityCard key={community.communityId} community={community} isMember={true} onJoin={handleJoin} onClick={handleClick} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'discover' && (
                        <div>
                            {filteredDiscover.length === 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 text-center py-16 px-8">
                                    <Compass className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <h3 className="text-base font-semibold text-slate-600 mb-1">
                                        {searchQuery ? 'No results found' : 'No communities to discover'}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {searchQuery ? 'Try different keywords' : 'Be the first to create a community!'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredDiscover.map((community) => (
                                        <CommunityCard key={community.communityId} community={community} isMember={false} onJoin={handleJoin} onClick={handleClick} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <CreateCommunityModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchData} />
        </div>
    );
}
