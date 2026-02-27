'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User, Loader2, BookOpen } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
}

export default function AiTutorBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            content: "Hi there! 👋 I'm **MentorAI**, your personal study buddy. Ask me anything — I can explain concepts, solve problems, and even generate practice quizzes for you!\n\nTry asking:\n- *\"Explain photosynthesis simply\"*\n- *\"Generate 5 questions on Newton's laws\"*\n- *\"Help me understand quadratic equations\"*",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pulseCount, setPulseCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Pulse animation for the fab button
    useEffect(() => {
        if (!isOpen && pulseCount < 3) {
            const timer = setTimeout(() => setPulseCount(p => p + 1), 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, pulseCount]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Build message history for API
            const apiMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg].map(m => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });

            if (res.ok) {
                const { data } = await res.json();
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    content: data.reply,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                const err = await res.json().catch(() => ({ error: 'Something went wrong' }));
                setMessages(prev => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        content: `❌ Sorry, I ran into an error: ${err.error || 'Please try again.'}`,
                        timestamp: new Date(),
                    },
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    content: "❌ Couldn't reach MentorAI. Please check your connection and try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
        // Trigger send after a tick
        setTimeout(() => {
            const syntheticInput = prompt;
            setInput('');
            const userMsg: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: syntheticInput,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, userMsg]);
            setIsLoading(true);

            const apiMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg].map(m => ({
                role: m.role,
                content: m.content,
            }));

            fetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            })
                .then(res => res.json())
                .then(json => {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'model',
                            content: json.data?.reply || '❌ No response received',
                            timestamp: new Date(),
                        },
                    ]);
                })
                .catch(() => {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'model',
                            content: "❌ Couldn't reach MentorAI.",
                            timestamp: new Date(),
                        },
                    ]);
                })
                .finally(() => setIsLoading(false));
        }, 50);
    };

    // Simple markdown renderer
    const renderMarkdown = (text: string) => {
        // Handle code blocks
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                const lines = part.slice(3, -3).split('\n');
                const lang = lines[0]?.trim() || '';
                const code = (lang ? lines.slice(1) : lines).join('\n');
                return (
                    <pre
                        key={i}
                        className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-green-300 font-mono"
                    >
                        {lang && (
                            <span className="mb-1 block text-[10px] uppercase text-slate-500">
                                {lang}
                            </span>
                        )}
                        <code>{code}</code>
                    </pre>
                );
            }
            // Process inline markdown
            return (
                <span key={i}>
                    {part.split('\n').map((line, j) => {
                        // Bold
                        let processed = line.replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong>$1</strong>'
                        );
                        // Italic
                        processed = processed.replace(
                            /\*(.*?)\*/g,
                            '<em>$1</em>'
                        );
                        // Inline code
                        processed = processed.replace(
                            /`([^`]+)`/g,
                            '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-indigo-700">$1</code>'
                        );
                        // Bullet points
                        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                            processed = `<span class="flex gap-1.5"><span class="text-indigo-400 mt-0.5">•</span><span>${processed.replace(/^[-•]\s*/, '')}</span></span>`;
                        }
                        return (
                            <span key={j}>
                                <span dangerouslySetInnerHTML={{ __html: processed }} />
                                {j < part.split('\n').length - 1 && <br />}
                            </span>
                        );
                    })}
                </span>
            );
        });
    };

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95"
                    style={{
                        animation: pulseCount < 3 ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}
                >
                    <Sparkles className="h-6 w-6" />
                    {/* Notification dot */}
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-white border-2 border-white">
                        AI
                    </span>
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    style={{
                        height: 'min(600px, calc(100vh - 100px))',
                        animation: 'slideUp 0.3s ease-out',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">MentorAI</h3>
                                <div className="flex items-center gap-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                    </span>
                                    <span className="text-[11px] text-indigo-200">
                                        Online • Your AI tutor
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div
                                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${msg.role === 'user'
                                            ? 'bg-indigo-100'
                                            : 'bg-gradient-to-br from-purple-100 to-indigo-100'
                                        }`}
                                >
                                    {msg.role === 'user' ? (
                                        <User className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : (
                                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    )}
                                </div>

                                {/* Bubble */}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                                            : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm'
                                        }`}
                                >
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <div className="prose-sm">{renderMarkdown(msg.content)}</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-2.5">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600 animate-spin" />
                                </div>
                                <div className="rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                                        <span className="text-xs text-slate-400">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 1 && (
                        <div className="px-4 pb-2 flex gap-2 flex-wrap">
                            <button
                                onClick={() => handleQuickAction('Generate 5 questions on Photosynthesis')}
                                disabled={isLoading}
                                className="flex items-center gap-1 rounded-full bg-purple-50 border border-purple-100 px-3 py-1.5 text-[11px] font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50"
                            >
                                <BookOpen className="h-3 w-3" />
                                Quiz: Photosynthesis
                            </button>
                            <button
                                onClick={() => handleQuickAction('Explain Newton\'s 3 laws of motion in simple terms')}
                                disabled={isLoading}
                                className="flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                            >
                                <MessageCircle className="h-3 w-3" />
                                Newton&apos;s Laws
                            </button>
                            <button
                                onClick={() => handleQuickAction('Help me understand quadratic equations step by step')}
                                disabled={isLoading}
                                className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                                <Sparkles className="h-3 w-3" />
                                Quadratic Eq.
                            </button>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="border-t border-slate-100 px-3 py-3">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask me anything..."
                                disabled={isLoading}
                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-1.5 text-center text-[10px] text-slate-300">
                            Powered by Gemini AI • Responses may not always be accurate
                        </p>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes pulse {
                    0%,
                    100% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 0 12px rgba(99, 102, 241, 0);
                    }
                }
            `}</style>
        </>
    );
}
