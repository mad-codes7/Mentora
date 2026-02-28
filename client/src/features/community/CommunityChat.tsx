'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/common/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { CommunityMessage, Game } from '@/config/types';
import { Send, Loader2, Gamepad2, Plus, Users, Play, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface CommunityChatProps {
    communityId: string;
    isAMember: boolean;
}

export default function CommunityChat({ communityId, isAMember }: CommunityChatProps) {
    const { firebaseUser, mentoraUser } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [showGamesMenu, setShowGamesMenu] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [loadingGames, setLoadingGames] = useState(false);
    const [creatingGame, setCreatingGame] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const gamesMenuRef = useRef<HTMLDivElement>(null);

    // Real-time messages listener
    useEffect(() => {
        if (!communityId) return;
        const q = query(
            collection(db, 'communities', communityId, 'messages'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityMessage[];
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [communityId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (gamesMenuRef.current && !gamesMenuRef.current.contains(e.target as Node)) {
                setShowGamesMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSend = async () => {
        if (!text.trim() || !firebaseUser || !mentoraUser || !isAMember) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'communities', communityId, 'messages'), {
                senderId: firebaseUser.uid,
                senderName: mentoraUser.profile?.fullName || 'User',
                senderRole: mentoraUser.roles.includes('tutor') ? 'tutor' : 'student',
                text: text.trim(),
                createdAt: Timestamp.now(),
            });
            setText('');
        } catch (err) {
            console.error('Send failed:', err);
        }
        setSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const fetchGames = async () => {
        setLoadingGames(true);
        try {
            const res = await fetch(`${API}/game/${communityId}`);
            if (res.ok) {
                const { data } = await res.json();
                setGames(data || []);
            }
        } catch { /* silent */ }
        setLoadingGames(false);
    };

    const handleToggleGames = () => {
        if (!showGamesMenu) fetchGames();
        setShowGamesMenu(!showGamesMenu);
    };

    const handleCreateGame = async () => {
        if (!firebaseUser || !mentoraUser) return;
        setCreatingGame(true);
        try {
            const res = await fetch(`${API}/game/${communityId}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creatorUid: firebaseUser.uid,
                    creatorName: mentoraUser.profile?.fullName || firebaseUser.displayName,
                }),
            });
            if (res.ok) {
                const { data } = await res.json();
                setShowGamesMenu(false);
                router.push(`/community/${communityId}/game/${data.gameId}`);
            }
        } catch (err) {
            console.error('Create game failed:', err);
        }
        setCreatingGame(false);
    };

    const handleJoinGame = (gameId: string) => {
        setShowGamesMenu(false);
        router.push(`/community/${communityId}/game/${gameId}`);
    };

    // Group messages by date
    const groupedMessages: { date: string; msgs: CommunityMessage[] }[] = [];
    let lastDate = '';
    (messages || []).forEach(msg => {
        const msgDate = msg.createdAt?.toDate
            ? msg.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : typeof msg.createdAt === 'object' && 'seconds' in msg.createdAt
                ? new Date((msg.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Today';

        if (msgDate !== lastDate) {
            groupedMessages.push({ date: msgDate, msgs: [] });
            lastDate = msgDate;
        }
        groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    });

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="text-4xl mb-2">💬</span>
                        <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
                    </div>
                )}

                {groupedMessages.map((group, gi) => (
                    <div key={gi}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[11px] font-medium text-slate-400 px-2">{group.date}</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {group.msgs.map((msg, i) => {
                            const isMine = msg.senderId === firebaseUser?.uid;
                            const isSystem = msg.senderId === 'system';
                            const isGameInvite = msg.type === 'game_invite';

                            if (isSystem || isGameInvite) {
                                return (
                                    <div key={i} className="flex justify-center my-3">
                                        <div className={`rounded-xl px-4 py-2.5 text-center max-w-md ${isGameInvite
                                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200'
                                                : 'bg-slate-50 border border-slate-100'
                                            }`}>
                                            <p className={`text-xs font-medium ${isGameInvite ? 'text-amber-700' : 'text-slate-500'}`}>
                                                {msg.text}
                                            </p>
                                            {isGameInvite && msg.gameId && (
                                                <button
                                                    onClick={() => handleJoinGame(msg.gameId!)}
                                                    className="mt-2 flex items-center gap-1 mx-auto px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                                                >
                                                    <Gamepad2 className="h-3 w-3" />
                                                    Join Game
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                                    <div className={`max-w-[75%]`}>
                                        {!isMine && (
                                            <p className="text-[10px] font-semibold text-slate-400 mb-0.5 ml-1">
                                                {msg.senderName}
                                                <span className="ml-1 text-[9px] text-slate-300">
                                                    {msg.senderRole === 'tutor' ? '🎓' : '📚'}
                                                </span>
                                            </p>
                                        )}
                                        <div className={`rounded-2xl px-4 py-2.5 ${isMine
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                        </div>
                                        <p className={`text-[10px] text-slate-300 mt-0.5 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                                            {msg.createdAt?.toDate
                                                ? msg.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                : typeof msg.createdAt === 'object' && 'seconds' in msg.createdAt
                                                    ? new Date((msg.createdAt as { seconds: number }).seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                    : ''}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {isAMember ? (
                <div className="border-t border-slate-200 p-3 bg-white relative">
                    <div className="flex items-center gap-2">
                        {/* Games Button */}
                        <div className="relative" ref={gamesMenuRef}>
                            <button
                                onClick={handleToggleGames}
                                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${showGamesMenu
                                        ? 'bg-amber-100 text-amber-600'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                title="Speed Concept Battle"
                            >
                                <Gamepad2 className="h-5 w-5" />
                            </button>

                            {/* Games Dropdown */}
                            {showGamesMenu && (
                                <div className="absolute bottom-12 left-0 w-72 bg-white rounded-xl border border-slate-200 p-3 shadow-xl z-20">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-slate-700">⚡ Speed Concept Battle</h4>
                                    </div>

                                    {/* Create New Game */}
                                    <button
                                        onClick={handleCreateGame}
                                        disabled={creatingGame}
                                        className="w-full flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:from-amber-100 hover:to-yellow-100 transition-all mb-3 disabled:opacity-50"
                                    >
                                        {creatingGame ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                        Create New Game
                                    </button>

                                    {/* Active Games */}
                                    {loadingGames ? (
                                        <div className="flex justify-center py-3">
                                            <Loader2 className="h-4 w-4 text-slate-300 animate-spin" />
                                        </div>
                                    ) : games.filter(g => g.status === 'lobby' || g.status === 'in_progress' || g.status === 'topic_selection').length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Active Games</p>
                                            {games
                                                .filter(g => g.status === 'lobby' || g.status === 'in_progress' || g.status === 'topic_selection')
                                                .map(g => (
                                                    <button
                                                        key={g.gameId}
                                                        onClick={() => handleJoinGame(g.gameId)}
                                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                                    >
                                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${g.status === 'lobby' ? 'bg-emerald-100' : 'bg-amber-100'
                                                            }`}>
                                                            {g.status === 'lobby' ? (
                                                                <Users className="h-4 w-4 text-emerald-600" />
                                                            ) : (
                                                                <Play className="h-4 w-4 text-amber-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-slate-700 truncate">
                                                                {g.createdByName}&apos;s game
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {g.participants?.length || 0} players · {g.status === 'lobby' ? 'Waiting' : 'In Progress'}
                                                            </p>
                                                        </div>
                                                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                                                    </button>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-slate-400 py-2">No active games</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!text.trim() || sending}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-slate-200 p-4 bg-slate-50 text-center">
                    <p className="text-sm text-slate-400">Join this community to send messages</p>
                </div>
            )}
        </div>
    );
}
