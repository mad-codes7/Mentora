'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { doc, updateDoc, Timestamp, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import useWebRTC from '@/features/classroom/useWebRTC';
import VideoFeed from '@/features/classroom/VideoFeed';
import Whiteboard from '@/features/classroom/Whiteboard';
import ChatBox from '@/features/classroom/ChatBox';
import DocumentViewer from '@/features/classroom/DocumentViewer';
import SessionTimer from '@/features/classroom/SessionTimer';
import { Session } from '@/config/types';
import {
    Loader2, Video, Clock, UserCheck, XCircle,
    Mic, MicOff, Camera, CameraOff, PhoneOff, SwitchCamera,
    MessageSquare, FileText, PenTool, Hand, StickyNote,
    MonitorUp, MonitorOff, BookOpen, Timer, Plus, Info, Shield,
    ChevronRight, Sparkles, Users
} from 'lucide-react';

interface RoomPageProps {
    params: Promise<{ sessionId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
    const resolvedParams = use(params);
    const sessionId = resolvedParams.sessionId;
    const router = useRouter();
    const { firebaseUser, mentoraUser, loading: authLoading } = useAuth();

    const [session, setSession] = useState<Session | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(true);
    const [showSessionInfo, setShowSessionInfo] = useState(false);
    const [callStarted, setCallStarted] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [waitingSeconds, setWaitingSeconds] = useState(0);
    const [handRaised, setHandRaised] = useState(false);
    const [notes, setNotes] = useState('');
    const [remoteHandRaised, setRemoteHandRaised] = useState(false);
    const [showExtendMenu, setShowExtendMenu] = useState(false);

    const isTutor = !!session && session.tutorId === firebaseUser?.uid;
    const isStudent = !!session && session.studentId === firebaseUser?.uid;
    const isCaller = isTutor;

    const {
        localStream,
        remoteStream,
        screenStream,
        isConnected,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        remoteScreenSharing,
        isFrontCamera,
        isCallEnded,
        endedBy,
        toggleAudio,
        toggleVideo,
        startCall,
        endCall,
        startScreenShare,
        stopScreenShare,
        flipCamera,
    } = useWebRTC({
        sessionId,
        userId: firebaseUser?.uid || '',
        isCaller,
    });

    // ── Redirect if not logged in ──
    useEffect(() => {
        if (!authLoading && !firebaseUser) router.push('/');
    }, [authLoading, firebaseUser, router]);

    // ── Subscribe to session doc ──
    useEffect(() => {
        if (!firebaseUser) return;
        const unsubscribe = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
            if (snap.exists()) {
                const data = { sessionId: snap.id, ...snap.data() } as Session;
                setSession(data);
                if (data.actualStartTime) setStartTime(data.actualStartTime.toDate());
            }
        });
        return () => unsubscribe();
    }, [sessionId, firebaseUser]);

    // ── Listen for hand raise signals ──
    useEffect(() => {
        if (!firebaseUser) return;
        const unsubscribe = onSnapshot(
            doc(db, 'sessions', sessionId, 'signals', 'handRaise'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.userId !== firebaseUser.uid) {
                        setRemoteHandRaised(data.raised || false);
                    }
                }
            }
        );
        return () => unsubscribe();
    }, [sessionId, firebaseUser]);

    // ── SYNCED END CALL: redirect both parties ──
    const hasRedirectedRef = useRef(false);
    useEffect(() => {
        if (!isCallEnded || !session || hasRedirectedRef.current) return;
        hasRedirectedRef.current = true;

        const currentTopic = session.topic || 'General';
        const currentNotes = notes;

        (async () => {
            try {
                if (isStudent && currentNotes.trim()) {
                    await updateDoc(doc(db, 'sessions', sessionId), {
                        studentNotes: currentNotes,
                    });
                }
                await updateDoc(doc(db, 'sessions', sessionId), {
                    status: 'completed',
                    endTime: Timestamp.now(),
                });
            } catch (err) {
                console.error('Error saving session end data:', err);
            }
        })();

        setTimeout(() => {
            if (isTutor) {
                router.push('/tutor/sessions');
            } else {
                if (session.preAssessmentId) {
                    const topic = encodeURIComponent(currentTopic);
                    router.push(`/assessment?type=post_session&topic=${topic}&sessionId=${sessionId}`);
                } else {
                    router.push(`/post-session/${sessionId}`);
                }
            }
        }, 1000);
    }, [isCallEnded, session, isStudent, isTutor, notes, sessionId, router]);

    // ── Waiting timer ──
    useEffect(() => {
        if (callStarted) return;
        const interval = setInterval(() => setWaitingSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [callStarted]);

    const handleTutorJoin = useCallback(async () => {
        await updateDoc(doc(db, 'sessions', sessionId), {
            status: 'in_progress', tutorJoinedAt: Timestamp.now(), actualStartTime: Timestamp.now(),
        });
        await startCall();
        setCallStarted(true);
    }, [startCall, sessionId]);

    const handleStudentJoin = useCallback(async () => {
        await startCall();
        setCallStarted(true);
    }, [startCall]);

    const handleEndSession = useCallback(async () => {
        endCall();
    }, [endCall]);

    const handleTimeUp = useCallback(() => handleEndSession(), [handleEndSession]);

    const handleCancelSession = useCallback(async () => {
        await updateDoc(doc(db, 'sessions', sessionId), {
            status: 'cancelled', endTime: Timestamp.now(),
        });
        router.push(isTutor ? '/tutor/sessions' : '/dashboard');
    }, [sessionId, router, isTutor]);

    const toggleHandRaise = useCallback(async () => {
        const newState = !handRaised;
        setHandRaised(newState);
        try {
            await setDoc(doc(db, 'sessions', sessionId, 'signals', 'handRaise'), {
                userId: firebaseUser?.uid, raised: newState, timestamp: Timestamp.now(),
            });
        } catch (e) { console.error(e); }
    }, [handRaised, sessionId, firebaseUser]);

    const handleExtendTime = useCallback(async (minutes: number) => {
        if (!session) return;
        await updateDoc(doc(db, 'sessions', sessionId), {
            durationLimitMinutes: session.durationLimitMinutes + minutes,
        });
        setShowExtendMenu(false);
    }, [session, sessionId]);

    // ═══════════════════════════════════════
    //  CALL ENDED
    // ═══════════════════════════════════════
    if (isCallEnded) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/5">
                        <PhoneOff className="h-9 w-9 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Session Ended</h2>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                        {endedBy === firebaseUser?.uid
                            ? 'You ended the session.'
                            : `${isTutor ? 'Student' : 'Tutor'} ended the session.`}
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                        <p className="text-xs text-slate-500">Redirecting...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  LOADING STATES
    // ═══════════════════════════════════════
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    <p className="text-xs text-slate-500">Authenticating...</p>
                </div>
            </div>
        );
    }
    if (!session) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <div className="absolute inset-0 h-10 w-10 rounded-full bg-blue-500/20 animate-ping" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Joining classroom...</p>
                </div>
            </div>
        );
    }
    if (!isTutor && !isStudent) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center rounded-2xl bg-slate-800/50 border border-slate-700/50 p-8">
                    <Shield className="h-10 w-10 text-red-400 mx-auto mb-4" />
                    <p className="text-xl text-white font-bold mb-2">Access Denied</p>
                    <p className="text-slate-400 text-sm">You are not part of this session.</p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  WAITING ROOM
    // ═══════════════════════════════════════
    if (!callStarted) {
        const isPaidWaiting = session.status === 'paid_waiting';
        const isInProgress = session.status === 'in_progress';
        const tutorHasJoined = isInProgress || !!session.tutorJoinedAt;

        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-r from-blue-600/8 via-indigo-500/8 to-purple-600/8 blur-3xl pointer-events-none" />

                <div className="w-full max-w-lg text-center px-6 relative z-10">
                    {/* Session card */}
                    <div className="mb-8 rounded-3xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 p-8">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20">
                            <BookOpen className="h-7 w-7 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">{session.topic}</h1>
                        <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{session.durationLimitMinutes} min</span>
                            </div>
                            <span className="text-slate-600">•</span>
                            <span className={`font-semibold ${isTutor ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {isTutor ? '👨‍🏫 Tutor' : '🎒 Student'}
                            </span>
                        </div>

                        <div className="mt-5 rounded-xl bg-slate-900/50 border border-slate-700/30 p-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                                <Video className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="text-[12px] text-slate-400 text-left">
                                Camera & microphone will be <strong className="text-emerald-400">enabled</strong> when you join. You can toggle them during the session.
                            </p>
                        </div>
                    </div>

                    {/* Tutor join */}
                    {isTutor && (
                        <div className="space-y-5">
                            <div className="rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 p-6">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                                    <Users className="h-6 w-6 text-emerald-400" />
                                </div>
                                <p className="text-white font-semibold mb-1">{isPaidWaiting ? 'Student is waiting' : 'Session is active'}</p>
                                <p className="text-xs text-slate-500">{isPaidWaiting ? 'Click below to start the video session' : 'Rejoin the video call'}</p>
                            </div>
                            <button
                                onClick={handleTutorJoin}
                                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 font-semibold text-white shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Video className="h-5 w-5" />
                                {isPaidWaiting ? 'Start Session' : 'Rejoin Call'}
                                <ChevronRight className="h-4 w-4 opacity-60" />
                            </button>
                        </div>
                    )}

                    {/* Student waiting / join */}
                    {isStudent && (
                        <div className="space-y-5">
                            {isPaidWaiting && !tutorHasJoined && (
                                <div className="rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 p-6">
                                    <div className="mx-auto mb-3 relative">
                                        <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
                                    </div>
                                    <p className="text-white font-semibold mb-1">Waiting for tutor...</p>
                                    <p className="text-slate-400 text-xs">Your tutor has been notified and will join soon</p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs bg-slate-900/50 rounded-lg py-2 px-3 mx-auto w-fit">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="font-mono">{Math.floor(waitingSeconds / 60)}:{String(waitingSeconds % 60).padStart(2, '0')}</span>
                                    </div>
                                    {waitingSeconds >= 300 && waitingSeconds < 600 && (
                                        <p className="mt-3 text-amber-400 text-xs animate-pulse flex items-center justify-center gap-1.5">
                                            <Sparkles className="h-3 w-3" />Tutor has been reminded
                                        </p>
                                    )}
                                </div>
                            )}
                            {tutorHasJoined && (
                                <>
                                    <div className="rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-emerald-700/30 p-6">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                                            <UserCheck className="h-6 w-6 text-emerald-400" />
                                        </div>
                                        <p className="text-emerald-400 font-semibold mb-1">Tutor is ready! 🎉</p>
                                        <p className="text-slate-400 text-xs">Join now to start your session</p>
                                    </div>
                                    <button
                                        onClick={handleStudentJoin}
                                        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 font-semibold text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        <Video className="h-5 w-5" />Join Session
                                        <ChevronRight className="h-4 w-4 opacity-60" />
                                    </button>
                                </>
                            )}
                            {isStudent && waitingSeconds >= 600 && !tutorHasJoined && (
                                <div className="rounded-2xl bg-red-950/30 border border-red-800/30 p-5">
                                    <p className="text-red-400 text-sm font-medium mb-4">Tutor hasn&apos;t joined after 10 minutes</p>
                                    <button
                                        onClick={handleCancelSession}
                                        className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <XCircle className="h-4 w-4" />Cancel &amp; Request Refund
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  ACTIVE CALL
    // ═══════════════════════════════════════
    const activeSidePanel = showChat ? 'chat' : showDocs ? 'docs' : showNotes ? 'notes' : showSessionInfo ? 'info' : null;

    const closePanels = () => { setShowChat(false); setShowDocs(false); setShowNotes(false); setShowSessionInfo(false); };
    const openPanel = (panel: string) => {
        closePanels();
        if (panel === 'chat') setShowChat(true);
        else if (panel === 'docs') setShowDocs(true);
        else if (panel === 'notes') setShowNotes(true);
        else if (panel === 'info') setShowSessionInfo(true);
    };

    const ToolbarBtn = ({ active, onClick, icon, label, color = 'slate' }: {
        active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color?: string;
    }) => {
        const colorMap: Record<string, string> = {
            slate: active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white',
            purple: active ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white',
            emerald: active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white',
        };
        return (
            <button
                onClick={onClick}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 ${colorMap[color] || colorMap.slate}`}
            >
                {icon}{label}
            </button>
        );
    };

    return (
        <div className="flex h-screen flex-col bg-slate-950">
            {/* ───── TOP BAR ───── */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-sm px-4 py-2.5">
                {/* Left: Session info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isTutor ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-blue-500/10 ring-1 ring-blue-500/20'}`}>
                        <BookOpen className={`h-4 w-4 ${isTutor ? 'text-emerald-400' : 'text-blue-400'}`} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-white truncate">{session.topic}</h1>
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className={`flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                {isConnected ? 'Connected' : 'Connecting...'}
                            </span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">
                                {isTutor ? '👨‍🏫 Tutor' : '🎒 Student'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: Timer + extend */}
                {startTime && (
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-800/80 px-3 py-1.5 ring-1 ring-slate-700/50">
                            <SessionTimer durationMinutes={session.durationLimitMinutes} startTime={startTime} onTimeUp={handleTimeUp} />
                        </div>
                        {isTutor && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowExtendMenu(!showExtendMenu)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 text-emerald-400 hover:bg-slate-700 transition-colors ring-1 ring-slate-700/50"
                                    title="Extend time"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                                {showExtendMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExtendMenu(false)} />
                                        <div className="absolute top-full right-0 z-50 mt-2 w-44 rounded-2xl bg-slate-800 border border-slate-700/70 py-1.5 shadow-2xl shadow-black/40">
                                            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Extend Session</p>
                                            {[5, 10, 15, 30].map(m => (
                                                <button key={m} onClick={() => handleExtendTime(m)} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors flex items-center gap-2">
                                                    <Timer className="h-3 w-3 text-slate-500" />
                                                    +{m} minutes
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Right: Side panel toggles */}
                <div className="flex items-center gap-1.5">
                    {remoteHandRaised && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400 animate-pulse mr-1">
                            <Hand className="h-3.5 w-3.5" />
                            <span className="font-semibold">{isTutor ? 'Student' : 'Tutor'} raised hand!</span>
                        </div>
                    )}

                    <ToolbarBtn
                        active={activeSidePanel === 'chat'}
                        onClick={() => activeSidePanel === 'chat' ? closePanels() : openPanel('chat')}
                        icon={<MessageSquare className="h-3.5 w-3.5" />}
                        label="Chat"
                    />
                    <ToolbarBtn
                        active={activeSidePanel === 'docs'}
                        onClick={() => activeSidePanel === 'docs' ? closePanels() : openPanel('docs')}
                        icon={<FileText className="h-3.5 w-3.5" />}
                        label="Docs"
                    />
                    {isStudent && (
                        <ToolbarBtn
                            active={activeSidePanel === 'notes'}
                            onClick={() => activeSidePanel === 'notes' ? closePanels() : openPanel('notes')}
                            icon={<StickyNote className="h-3.5 w-3.5" />}
                            label="Notes"
                            color="purple"
                        />
                    )}
                    {isTutor && (
                        <ToolbarBtn
                            active={activeSidePanel === 'info'}
                            onClick={() => activeSidePanel === 'info' ? closePanels() : openPanel('info')}
                            icon={<Info className="h-3.5 w-3.5" />}
                            label="Info"
                            color="emerald"
                        />
                    )}
                </div>
            </div>

            {/* ───── MAIN CONTENT ───── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Main area */}
                <div className="relative flex-1 overflow-hidden bg-slate-950">
                    {/* Whiteboard (hidden during screen share) */}
                    {showWhiteboard && !isScreenSharing && !remoteScreenSharing ? (
                        <Whiteboard sessionId={sessionId} role={isTutor ? 'tutor' : 'student'} />
                    ) : !isScreenSharing && !remoteScreenSharing ? (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                            <div className="text-center">
                                <PenTool className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-600 text-sm font-medium">Whiteboard is hidden</p>
                                <p className="text-slate-700 text-xs mt-1">Click the whiteboard button to show it</p>
                            </div>
                        </div>
                    ) : null}

                    <VideoFeed
                        localStream={localStream}
                        remoteStream={remoteStream}
                        screenStream={screenStream}
                        isConnected={isConnected}
                        isVideoOff={isVideoOff}
                        isScreenSharing={isScreenSharing}
                        remoteScreenSharing={remoteScreenSharing}
                        localLabel={isTutor ? 'You (Tutor)' : 'You (Student)'}
                        remoteLabel={isTutor ? 'Student' : 'Tutor'}
                    />
                </div>

                {/* Side panels */}
                {activeSidePanel && (
                    <div className="w-80 border-l border-slate-800/80 flex flex-col min-h-0 overflow-hidden bg-slate-900/95 backdrop-blur-sm">
                        {activeSidePanel === 'chat' && <ChatBox sessionId={sessionId} />}
                        {activeSidePanel === 'docs' && (
                            <DocumentViewer sessionId={sessionId} isTutor={isTutor} isStudent={isStudent} />
                        )}
                        {activeSidePanel === 'notes' && (
                            <div className="flex flex-1 min-h-0 flex-col">
                                <div className="border-b border-slate-800 px-4 py-3.5 flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                                        <StickyNote className="h-3.5 w-3.5 text-purple-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-white">My Notes</h3>
                                    <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-md">Auto-saved</span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={"Take notes during the session...\n\n• Key concepts\n• Questions to ask\n• Homework reminders"}
                                    className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono leading-relaxed"
                                />
                                <div className="border-t border-slate-800 px-4 py-2.5 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-600 font-mono">{notes.length} chars</span>
                                    <span className="text-[10px] text-slate-600">Saved when session ends</span>
                                </div>
                            </div>
                        )}
                        {activeSidePanel === 'info' && (
                            <div className="flex flex-1 min-h-0 flex-col">
                                <div className="border-b border-slate-800 px-4 py-3.5 flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-white">Session Info</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4 space-y-3.5">
                                        {[
                                            { label: 'Topic', value: session.topic },
                                            { label: 'Duration', value: `${session.durationLimitMinutes} min` },
                                            { label: 'Type', value: session.meetingType === 'on_demand' ? 'On Demand' : 'Scheduled' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">{item.label}</span>
                                                <span className="text-xs font-semibold text-white">{item.value}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
                                            <span className="text-xs text-slate-500">Session ID</span>
                                            <span className="text-[10px] text-slate-600 font-mono bg-slate-900 px-2 py-0.5 rounded">{sessionId.slice(0, 12)}...</span>
                                        </div>
                                    </div>
                                    {session.preAssessmentId && (
                                        <div className="rounded-2xl bg-blue-500/5 border border-blue-500/15 p-4">
                                            <p className="text-xs font-semibold text-blue-400 mb-1.5">📝 Pre-Assessment Taken</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">Student completed a pre-assessment before this session. Check assessment results for focus areas.</p>
                                        </div>
                                    )}
                                    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-4">
                                        <p className="text-xs font-semibold text-emerald-400 mb-2.5">💡 Teaching Tips</p>
                                        <ul className="space-y-2 text-[11px] text-slate-400">
                                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span>Start with what the student already knows</li>
                                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span>Use the whiteboard for diagrams</li>
                                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span>Check understanding frequently</li>
                                            <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span>Summarize key points at the end</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ───── BOTTOM CONTROLS ───── */}
            <div className="border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-sm px-4 py-3">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    {/* Left: Whiteboard + Raise hand */}
                    <div className="flex items-center gap-2 min-w-[180px]">
                        <button
                            onClick={() => setShowWhiteboard(!showWhiteboard)}
                            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition-all duration-200 ${showWhiteboard
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white ring-1 ring-slate-700/50'
                                }`}
                        >
                            <PenTool className="h-3.5 w-3.5" />
                            {showWhiteboard ? 'Whiteboard' : 'Show Board'}
                        </button>

                        {isStudent && (
                            <button
                                onClick={toggleHandRaise}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition-all duration-200 ${handRaised
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white ring-1 ring-slate-700/50'
                                    }`}
                            >
                                <Hand className="h-3.5 w-3.5" />
                                {handRaised ? 'Hand Up ✋' : 'Raise Hand'}
                            </button>
                        )}
                    </div>

                    {/* Center: Core call controls */}
                    <div className="flex items-center gap-2.5">
                        {/* Mic */}
                        <button
                            onClick={toggleAudio}
                            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${isAudioMuted
                                ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25'
                                : 'bg-slate-800 text-white hover:bg-slate-700 ring-1 ring-slate-700/50'
                                }`}
                            title={isAudioMuted ? 'Unmute' : 'Mute'}
                        >
                            {isAudioMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
                        </button>

                        {/* Camera */}
                        <button
                            onClick={toggleVideo}
                            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${isVideoOff
                                ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25'
                                : 'bg-slate-800 text-white hover:bg-slate-700 ring-1 ring-slate-700/50'
                                }`}
                            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                        >
                            {isVideoOff ? <CameraOff className="h-[18px] w-[18px]" /> : <Camera className="h-[18px] w-[18px]" />}
                        </button>

                        {/* Flip camera */}
                        <button
                            onClick={flipCamera}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 ring-1 ring-slate-700/50 transition-all duration-200"
                            title={isFrontCamera ? 'Switch to back camera' : 'Switch to front camera'}
                        >
                            <SwitchCamera className="h-[18px] w-[18px]" />
                        </button>

                        {/* End session */}
                        <button
                            onClick={handleEndSession}
                            className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-6 text-xs font-bold text-white transition-all duration-200 hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/25 active:scale-95"
                            title="End session"
                        >
                            <PhoneOff className="h-[18px] w-[18px]" />
                            End
                        </button>
                    </div>

                    {/* Right: Screen share (tutor only) */}
                    <div className="flex items-center gap-2 min-w-[180px] justify-end">
                        {isTutor && (
                            <button
                                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition-all duration-200 ${isScreenSharing
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-1 ring-blue-400/30'
                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white ring-1 ring-slate-700/50'
                                    }`}
                            >
                                {isScreenSharing
                                    ? <><MonitorOff className="h-3.5 w-3.5" />Stop Sharing</>
                                    : <><MonitorUp className="h-3.5 w-3.5" />Share Screen</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
