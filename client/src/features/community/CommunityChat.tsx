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

    // Real-time listener on the messages subcollection
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

    // Auto-scroll to bottom on new messages
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

    // Group messages by date
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

    const getMessageIcon = (type: string) => {
        switch (type) {
            case 'announcement': return <Megaphone className="h-3 w-3" />;
            case 'resource': return <BookOpen className="h-3 w-3" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full" id="community-chat">
            {/* Chat messages area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 community-chat-scroll"
                style={{ minHeight: 0 }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                            <MessageCircle className="h-8 w-8 text-indigo-400" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No messages yet</p>
                        <p className="text-slate-300 text-xs mt-1">Start the conversation!</p>
                    </div>
                )}

                {groupedMessages.map((group) => (
                    <div key={group.date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs text-slate-400 font-medium px-2">{group.date}</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {group.messages.map((msg) => {
                            const isOwn = msg.senderId === mentoraUser?.uid;
                            const isSystem = msg.senderId === 'system';

                            if (isSystem) {
                                return (
                                    <div key={msg.messageId} className="flex justify-center my-2">
                                        <div className="community-system-msg">
                                            {getMessageIcon(msg.type)}
                                            <span>{msg.text}</span>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={msg.messageId}
                                    className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                        {/* Sender name (for others' messages) */}
                                        {!isOwn && (
                                            <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                                <span className="text-xs font-semibold text-slate-600">{msg.senderName}</span>
                                                <span className={`community-role-badge ${msg.senderRole === 'tutor' ? 'community-role-tutor' : 'community-role-student'}`}>
                                                    {msg.senderRole}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`community-chat-bubble ${isOwn ? 'community-chat-own' : 'community-chat-other'}`}>
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                            <span className={`text-[10px] mt-1 block ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
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

            {/* Message input */}
            {isAMember ? (
                <div className="border-t border-slate-200 p-3 bg-white/80 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="input-styled flex-1 !py-2.5 !rounded-xl !text-sm"
                            id="community-message-input"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            className="h-10 w-10 rounded-xl flex items-center justify-center gradient-primary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            id="community-send-btn"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-slate-200 p-4 text-center bg-slate-50">
                    <p className="text-sm text-slate-400">Join the community to start chatting</p>
                </div>
            )}
        </div>
    );
}
