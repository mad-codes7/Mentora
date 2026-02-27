'use client';

import { useState, useEffect, useCallback, use } from 'react';
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
    MonitorUp, MonitorOff, BookOpen, Timer, Plus, Info, Shield
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
        isConnected,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
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
        if (!authLoading && !firebaseUser) router.push('/login');
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
    useEffect(() => {
        if (!isCallEnded || !session) return;

        // Save student notes if applicable
        const saveAndRedirect = async () => {
            if (isStudent && notes.trim()) {
                await updateDoc(doc(db, 'sessions', sessionId), {
                    studentNotes: notes,
                });
            }
            await updateDoc(doc(db, 'sessions', sessionId), {
                status: 'completed',
                endTime: Timestamp.now(),
            });

            // Small delay to show "Call ended" overlay
            setTimeout(() => {
                if (isTutor) {
                    router.push('/tutor/sessions');
                } else {
                    // Student goes to post-assessment quiz first, then to rating page
                    const topic = encodeURIComponent(session.topic || 'General');
                    router.push(`/assessment?type=post_session&topic=${topic}&sessionId=${sessionId}`);
                }
            }, 2000);
        };

        saveAndRedirect().catch(console.error);
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
        // endCall writes to Firestore signal → both sides detect via onSnapshot
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

    // ── CALL ENDED OVERLAY ──
    if (isCallEnded) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="text-center animate-fade-in">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                        <PhoneOff className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Call Ended</h2>
                    <p className="text-sm text-slate-400">
                        {endedBy === firebaseUser?.uid
                            ? 'You ended the session.'
                            : `${isTutor ? 'Student' : 'Tutor'} ended the session.`}
                    </p>
                    <p className="mt-3 text-xs text-slate-500 animate-pulse">Redirecting...</p>
                </div>
            </div>
        );
    }

    // ── Loading states ──
    if (authLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>;
    }
    if (!session) {
        return <div className="flex h-screen items-center justify-center bg-slate-900"><div className="flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /><p className="text-sm text-slate-400">Joining classroom...</p></div></div>;
    }
    if (!isTutor && !isStudent) {
        return <div className="flex h-screen items-center justify-center bg-slate-900"><div className="text-center"><p className="text-xl text-white font-bold mb-2">Access Denied</p><p className="text-slate-400 text-sm">You are not part of this session.</p></div></div>;
    }

    // ── WAITING ROOM ──
    if (!callStarted) {
        const isPaidWaiting = session.status === 'paid_waiting';
        const isInProgress = session.status === 'in_progress';
        const tutorHasJoined = isInProgress || !!session.tutorJoinedAt;

        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="w-full max-w-md text-center px-6">
                    <div className="mb-8">
                        <span className="text-5xl block mb-4">🎓</span>
                        <h1 className="text-2xl font-bold text-white mb-2">{session.topic}</h1>
                        <p className="text-slate-400 text-sm">{session.durationLimitMinutes} min session</p>
                        <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full ${isTutor ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isTutor ? '👨‍🏫 Tutor' : '🎒 Student'}
                        </span>
                        {/* Media status note */}
                        <div className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
                            <p className="text-[11px] text-slate-400">
                                🎥 Mic & camera will be <strong className="text-emerald-400">ON</strong> when you join.
                                <br />You can turn them off during the call.
                            </p>
                        </div>
                    </div>

                    {isTutor && (
                        <div className="space-y-6">
                            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6">
                                <UserCheck className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                                <p className="text-white font-semibold mb-1">{isPaidWaiting ? 'Student is waiting for you' : 'Session is active'}</p>
                                <p className="text-xs text-slate-500">{isPaidWaiting ? 'Click below to start the video session' : 'Rejoin the video call'}</p>
                            </div>
                            <button onClick={handleTutorJoin} className="w-full rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all hover:shadow-xl">
                                <Video className="h-5 w-5" />{isPaidWaiting ? 'Start Session' : 'Rejoin Call'}
                            </button>
                        </div>
                    )}

                    {isStudent && (
                        <div className="space-y-6">
                            {isPaidWaiting && !tutorHasJoined && (
                                <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
                                    <p className="text-white font-semibold mb-1">Waiting for tutor to join...</p>
                                    <p className="text-slate-400 text-xs">Your tutor has been notified.</p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Waiting {Math.floor(waitingSeconds / 60)}:{String(waitingSeconds % 60).padStart(2, '0')}</span>
                                    </div>
                                    {waitingSeconds >= 300 && waitingSeconds < 600 && <p className="mt-3 text-amber-400 text-xs animate-pulse">⏰ Tutor has been reminded</p>}
                                </div>
                            )}
                            {tutorHasJoined && (
                                <>
                                    <div className="rounded-2xl bg-slate-800/80 border border-emerald-700/50 p-6">
                                        <UserCheck className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                                        <p className="text-emerald-400 font-semibold mb-1">Tutor is ready! 🎉</p>
                                        <p className="text-slate-400 text-xs">Join now to start your session</p>
                                    </div>
                                    <button onClick={handleStudentJoin} className="w-full rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 animate-pulse transition-all">
                                        <Video className="h-5 w-5" />Join Call
                                    </button>
                                </>
                            )}
                            {isStudent && waitingSeconds >= 600 && !tutorHasJoined && (
                                <div className="rounded-2xl bg-red-900/20 border border-red-800/40 p-4">
                                    <p className="text-red-400 text-sm font-medium mb-3">Tutor hasn&apos;t joined after 10 minutes</p>
                                    <button onClick={handleCancelSession} className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 flex items-center justify-center gap-2">
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

    // ── ACTIVE CALL ──
    const activeSidePanel = showChat ? 'chat' : showDocs ? 'docs' : showNotes ? 'notes' : showSessionInfo ? 'info' : null;

    const closePanels = () => { setShowChat(false); setShowDocs(false); setShowNotes(false); setShowSessionInfo(false); };
    const openPanel = (panel: string) => {
        closePanels();
        if (panel === 'chat') setShowChat(true);
        else if (panel === 'docs') setShowDocs(true);
        else if (panel === 'notes') setShowNotes(true);
        else if (panel === 'info') setShowSessionInfo(true);
    };

    return (
        <div className="flex h-screen flex-col bg-slate-900">
            {/* ── TOP BAR ── */}
            <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/90 backdrop-blur-sm px-4 py-2">
                {/* Left: Session info */}
                <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isTutor ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                        <BookOpen className={`h-4 w-4 ${isTutor ? 'text-emerald-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-white">{session.topic}</h1>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={isConnected ? 'text-emerald-400' : 'text-amber-400'}>
                                {isConnected ? '● Connected' : '● Connecting...'}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className={isTutor ? 'text-emerald-400/70' : 'text-blue-400/70'}>
                                {isTutor ? '👨‍🏫 Tutor' : '🎒 Student'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: Timer */}
                {startTime && (
                    <div className="flex items-center gap-2">
                        <SessionTimer durationMinutes={session.durationLimitMinutes} startTime={startTime} onTimeUp={handleTimeUp} />
                        {isTutor && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowExtendMenu(!showExtendMenu)}
                                    className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-emerald-400 hover:bg-slate-600 transition-colors flex items-center gap-1"
                                    title="Extend time"
                                >
                                    <Plus className="h-3 w-3" />
                                    <Timer className="h-3 w-3" />
                                </button>
                                {showExtendMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExtendMenu(false)} />
                                        <div className="absolute top-full right-0 z-50 mt-1 w-40 rounded-xl bg-slate-800 border border-slate-700 py-1 shadow-xl">
                                            {[5, 10, 15, 30].map(m => (
                                                <button key={m} onClick={() => handleExtendTime(m)} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
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
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-400 animate-pulse mr-2">
                            <Hand className="h-3.5 w-3.5" />
                            {isTutor ? 'Student' : 'Tutor'} raised hand!
                        </div>
                    )}

                    <button onClick={() => activeSidePanel === 'chat' ? closePanels() : openPanel('chat')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSidePanel === 'chat' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        <MessageSquare className="h-3.5 w-3.5" />Chat
                    </button>
                    <button onClick={() => activeSidePanel === 'docs' ? closePanels() : openPanel('docs')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSidePanel === 'docs' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        <FileText className="h-3.5 w-3.5" />Docs
                    </button>
                    {isStudent && (
                        <button onClick={() => activeSidePanel === 'notes' ? closePanels() : openPanel('notes')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSidePanel === 'notes' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                            <StickyNote className="h-3.5 w-3.5" />Notes
                        </button>
                    )}
                    {isTutor && (
                        <button onClick={() => activeSidePanel === 'info' ? closePanels() : openPanel('info')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${activeSidePanel === 'info' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                            <Info className="h-3.5 w-3.5" />Info
                        </button>
                    )}
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Whiteboard / Main area */}
                <div className="relative flex-1 overflow-hidden">
                    {showWhiteboard ? (
                        <Whiteboard sessionId={sessionId} role={isTutor ? 'tutor' : 'student'} />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-slate-800">
                            <p className="text-slate-500 text-sm">Whiteboard hidden</p>
                        </div>
                    )}
                    <VideoFeed
                        localStream={localStream}
                        remoteStream={remoteStream}
                        isConnected={isConnected}
                        isVideoOff={isVideoOff}
                        localLabel={isTutor ? 'You (Tutor)' : 'You (Student)'}
                        remoteLabel={isTutor ? 'Student' : 'Tutor'}
                    />
                </div>

                {/* Side panels */}
                {activeSidePanel && (
                    <div className="w-80 border-l border-slate-700 flex flex-col min-h-0 overflow-hidden bg-slate-900">
                        {activeSidePanel === 'chat' && <ChatBox sessionId={sessionId} />}
                        {activeSidePanel === 'docs' && (
                            <DocumentViewer
                                sessionId={sessionId}
                                isTutor={isTutor}
                                isStudent={isStudent}
                            />
                        )}
                        {activeSidePanel === 'notes' && (
                            <div className="flex flex-1 min-h-0 flex-col">
                                <div className="border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                                    <StickyNote className="h-4 w-4 text-purple-400" />
                                    <h3 className="text-sm font-semibold text-white">My Notes</h3>
                                    <span className="ml-auto text-[10px] text-slate-500">Auto-saved</span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={"Take notes during the session...\n\n• Key concepts\n• Questions to ask\n• Homework reminders"}
                                    className="flex-1 resize-none bg-slate-800/50 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono leading-relaxed"
                                />
                                <div className="border-t border-slate-700 px-4 py-2 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-600">{notes.length} chars</span>
                                    <span className="text-[10px] text-slate-600">Saved when session ends</span>
                                </div>
                            </div>
                        )}
                        {activeSidePanel === 'info' && (
                            <div className="flex flex-1 min-h-0 flex-col">
                                <div className="border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-emerald-400" />
                                    <h3 className="text-sm font-semibold text-white">Session Info</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="rounded-xl bg-slate-800 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Topic</span>
                                            <span className="text-xs font-semibold text-white">{session.topic}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Duration</span>
                                            <span className="text-xs font-semibold text-white">{session.durationLimitMinutes} min</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Type</span>
                                            <span className="text-xs font-semibold text-white">{session.meetingType === 'on_demand' ? 'On Demand' : 'Scheduled'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Session ID</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{sessionId.slice(0, 12)}...</span>
                                        </div>
                                    </div>
                                    {session.preAssessmentId && (
                                        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                                            <p className="text-xs font-semibold text-blue-400 mb-1">📝 Pre-Assessment Taken</p>
                                            <p className="text-[11px] text-slate-400">Student completed a pre-assessment before this session. Check the assessment results for focus areas.</p>
                                        </div>
                                    )}
                                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                        <p className="text-xs font-semibold text-emerald-400 mb-2">💡 Teaching Tips</p>
                                        <ul className="space-y-1.5 text-[11px] text-slate-400">
                                            <li>• Start with what the student already knows</li>
                                            <li>• Use the whiteboard for diagrams</li>
                                            <li>• Check understanding frequently</li>
                                            <li>• Summarize key points at the end</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── BOTTOM CONTROLS ── */}
            <div className="border-t border-slate-700/50 bg-slate-800/90 backdrop-blur-sm px-4 py-3">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    {/* Left controls */}
                    <div className="flex items-center gap-2">
                        {/* Whiteboard toggle — both roles */}
                        <button onClick={() => setShowWhiteboard(!showWhiteboard)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${showWhiteboard ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                            <PenTool className="h-3.5 w-3.5" />{showWhiteboard ? 'Whiteboard' : 'Show Board'}
                        </button>

                        {/* Student: Raise hand */}
                        {isStudent && (
                            <button onClick={toggleHandRaise}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${handRaised ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                <Hand className="h-3.5 w-3.5" />{handRaised ? 'Hand Up ✋' : 'Raise Hand'}
                            </button>
                        )}
                    </div>

                    {/* Center: Main call controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={toggleAudio}
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${isAudioMuted ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                            title={isAudioMuted ? 'Unmute' : 'Mute'}>
                            {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                        <button onClick={toggleVideo}
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}>
                            {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                        </button>
                        {/* Flip camera (mobile front/back) */}
                        <button onClick={flipCamera}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-all"
                            title={isFrontCamera ? 'Switch to back camera' : 'Switch to front camera'}>
                            <SwitchCamera className="h-4 w-4" />
                        </button>
                        <button onClick={handleEndSession}
                            className="flex h-10 items-center gap-1.5 rounded-full bg-red-600 px-5 text-xs font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg"
                            title="End session">
                            <PhoneOff className="h-4 w-4" />End
                        </button>
                    </div>

                    {/* Right: Screen share */}
                    <div className="flex items-center gap-2">
                        {isTutor && (
                            <button
                                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${isScreenSharing
                                    ? 'bg-blue-600 text-white ring-1 ring-blue-400/50'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {isScreenSharing
                                    ? <><MonitorOff className="h-3.5 w-3.5" />Stop Sharing</>
                                    : <><MonitorUp className="h-3.5 w-3.5" />Share Screen</>
                                }
                            </button>
                        )}
                        {isStudent && (
                            <button
                                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${isScreenSharing
                                    ? 'bg-blue-600 text-white ring-1 ring-blue-400/50'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
