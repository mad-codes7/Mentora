'use client';

import { useState, useEffect, useRef } from 'react';
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Timestamp;
}

interface ChatBoxProps {
    sessionId: string;
}

export default function ChatBox({ sessionId }: ChatBoxProps) {
    const { firebaseUser, mentoraUser } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'sessions', sessionId, 'chat'),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ChatMessage[];
            setMessages(msgs);

            // Auto-scroll
            setTimeout(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth',
                });
            }, 100);
        });

        return () => unsubscribe();
    }, [sessionId]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !firebaseUser) return;

        try {
            await addDoc(collection(db, 'sessions', sessionId, 'chat'), {
                senderId: firebaseUser.uid,
                senderName:
                    mentoraUser?.profile?.fullName || firebaseUser.email || 'User',
                text: newMessage.trim(),
                timestamp: Timestamp.now(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="flex flex-1 min-h-0 flex-col border-l border-slate-200 bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Chat</h3>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {messages.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">
                        No messages yet. Say hi! 👋
                    </p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === firebaseUser?.uid;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${isMe
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-900'
                                        }`}
                                >
                                    {!isMe && (
                                        <p className="mb-0.5 text-xs font-semibold text-blue-600">
                                            {msg.senderName}
                                        </p>
                                    )}
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="border-t border-slate-200 p-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                    >
                        ↑
                    </button>
                </div>
            </form>
        </div>
    );
}
