'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { CommunityMessage } from '@/config/types';
import { Send, Megaphone, BookOpen, MessageCircle } from 'lucide-react';

interface CommunityChatProps {
    communityId: string;
    isAMember: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CommunityChat({ communityId, isAMember }: CommunityChatProps) {
    const { mentoraUser } = useAuth();
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!communityId) return;
        const messagesRef = collection(db, 'communities', communityId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: CommunityMessage[] = snapshot.docs.map((doc) => ({
                messageId: doc.id,
                ...doc.data(),
            })) as CommunityMessage[];
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [communityId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !mentoraUser || sending) return;
        setSending(true);
        try {
            const userRole = mentoraUser.roles.includes('tutor') ? 'tutor' : 'student';
            await fetch(`${API}/community/${communityId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: mentoraUser.uid,
                    senderName: mentoraUser.profile.fullName,
                    senderRole: userRole,
                    text: newMessage.trim(),
                    type: 'text',
                }),
            });
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
        setSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timestamp: Timestamp | any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: Timestamp | any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const groupedMessages: { date: string; messages: CommunityMessage[] }[] = [];
    messages.forEach((msg) => {
        const dateStr = formatDate(msg.createdAt);
        const lastGroup = groupedMessages[groupedMessages.length - 1];
        if (lastGroup && lastGroup.date === dateStr) {
            lastGroup.messages.push(msg);
        } else {
            groupedMessages.push({ date: dateStr, messages: [msg] });
        }
    });

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const getAvatarColor = (name: string) => {
        const colors = ['#6366F1', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
        return colors[name.charCodeAt(0) % colors.length];
    };

    return (
        <div className="flex flex-col h-full" id="community-chat">
            {/* Messages */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 community-chat-scroll"
                style={{ minHeight: 0 }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <MessageCircle className="h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-slate-400 text-sm">No messages yet</p>
                        <p className="text-slate-300 text-xs mt-0.5">Start the conversation!</p>
                    </div>
                )}

                {groupedMessages.map((group) => (
                    <div key={group.date}>
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-[11px] text-slate-400 font-medium">{group.date}</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        {group.messages.map((msg) => {
                            const isOwn = msg.senderId === mentoraUser?.uid;
                            const isSystem = msg.senderId === 'system';

                            if (isSystem) {
                                return (
                                    <div key={msg.messageId} className="flex justify-center my-2">
                                        <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                                            {msg.type === 'announcement' ? <Megaphone className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.messageId} className={`flex mb-2.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    {!isOwn && (
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mr-2 mt-4"
                                            style={{ backgroundColor: getAvatarColor(msg.senderName) }}
                                        >
                                            {getInitials(msg.senderName)}
                                        </div>
                                    )}
                                    <div className={`max-w-[70%]`}>
                                        {!isOwn && (
                                            <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                                <span className="text-xs font-medium text-slate-600">{msg.senderName}</span>
                                                <span className={`text-[10px] font-medium ${msg.senderRole === 'tutor' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                                    {msg.senderRole}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`px-3.5 py-2 rounded-xl text-[13px] leading-relaxed ${isOwn
                                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                                : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                                            }`}>
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                            <span className={`text-[10px] mt-1 block text-right ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {isAMember ? (
                <div className="border-t border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                            id="community-message-input"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            className="h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            id="community-send-btn"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-slate-100 px-4 py-3 text-center bg-slate-50">
                    <p className="text-sm text-slate-400">Join the community to start chatting</p>
                </div>
            )}
        </div>
    );
}
