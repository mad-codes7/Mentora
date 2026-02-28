'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Game, GameRanking } from '@/config/types';
import {
    Trophy, Medal, Timer, Zap, ArrowRight, Users, Crown, Loader2,
    BookOpen, Target, Star, ChevronRight, Play, CheckCircle2, X, Sparkles
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GamePage() {
    const params = useParams();
    const communityId = params.communityId as string;
    const gameId = params.gameId as string;
    const router = useRouter();
    const { firebaseUser, mentoraUser } = useAuth();

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Real-time game state listener
    useEffect(() => {
        if (!communityId || !gameId) return;

        const unsubscribe = onSnapshot(
            doc(db, 'communities', communityId, 'games', gameId),
            (snapshot) => {
                if (snapshot.exists()) {
                    setGame({ gameId: snapshot.id, communityId, ...snapshot.data() } as unknown as Game);
                } else {
                    setError('Game not found');
                }
                setLoading(false);
            },
            (err) => {
                console.error('Game listener error:', err);
                setError('Failed to load game');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [communityId, gameId]);

    // Fallback: poll via API if Firestore listener doesn't work
    useEffect(() => {
        if (game) return;
        const fetchGame = async () => {
            try {
                const res = await fetch(`${API}/game/${communityId}/${gameId}`);
                if (res.ok) {
                    const { data } = await res.json();
                    setGame(data);
                }
            } catch { /* silent */ }
            setLoading(false);
        };
        const interval = setInterval(fetchGame, 3000);
        fetchGame();
        return () => clearInterval(interval);
    }, [communityId, gameId, game]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                    <p className="text-slate-400 text-sm">Loading game...</p>
                </div>
            </div>
        );
    }

    if (error || !game) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="card max-w-sm p-8 text-center">
                    <X className="h-10 w-10 text-red-300 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-900">Game Not Found</h2>
                    <p className="text-sm text-slate-400 mt-1">{error}</p>
                    <button
                        onClick={() => router.push(`/community/${communityId}`)}
                        className="mt-4 btn-primary text-sm"
                    >
                        Back to Community
                    </button>
                </div>
            </div>
        );
    }

    const uid = firebaseUser?.uid || '';
    const displayName = mentoraUser?.profile?.fullName || firebaseUser?.displayName || 'Player';

    switch (game.status) {
        case 'lobby':
            return <GameLobby game={game} uid={uid} displayName={displayName} communityId={communityId} />;
        case 'topic_selection':
            return <TopicSelection game={game} uid={uid} communityId={communityId} />;
        case 'in_progress':
            return <GamePlay game={game} uid={uid} displayName={displayName} communityId={communityId} />;
        case 'completed':
            return <GameResults game={game} uid={uid} communityId={communityId} />;
        default:
            return <div>Unknown game state</div>;
    }
}

// ─── Game Lobby ──────────────────────────────────────────────

function GameLobby({ game, uid, displayName, communityId }: {
    game: Game; uid: string; displayName: string; communityId: string;
}) {
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);

    const isCreator = game.createdBy === uid;
    const isParticipant = game.participants.some(p => p.uid === uid);
    const canStart = isCreator && game.participants.length >= 2;

    const handleJoin = async () => {
        setJoining(true);
        try {
            await fetch(`${API}/game/${communityId}/${game.gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, displayName }),
            });
        } catch (err) {
            console.error('Join failed:', err);
        }
        setJoining(false);
    };

    const handleStart = async () => {
        setStarting(true);
        try {
            await fetch(`${API}/game/${communityId}/${game.gameId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creatorUid: uid }),
            });
        } catch (err) {
            console.error('Start failed:', err);
        }
        setStarting(false);
    };

    return (
        <div className="mx-auto max-w-lg animate-fade-in-up">
            <div className="text-center mb-8">
                <div className="flex h-16 w-16 items-center justify-center mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-3xl shadow-lg mb-4 animate-bounce">
                    🎮
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Speed Concept Battle</h1>
                <p className="mt-2 text-slate-400 text-sm">Waiting for players to join...</p>
            </div>

            <div className="card p-6 space-y-6">
                {/* Participants */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Players ({game.participants.length}/10)
                        </h3>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                            <Users className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        {game.participants.map((p, i) => (
                            <div key={p.uid} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-bold">
                                    {p.displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 text-sm font-medium text-slate-700">{p.displayName}</span>
                                {i === 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <Crown className="h-3 w-3" /> Host
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {!isParticipant && (
                        <button
                            onClick={handleJoin}
                            disabled={joining}
                            className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            Join Game
                        </button>
                    )}
                    {isCreator && (
                        <button
                            onClick={handleStart}
                            disabled={!canStart || starting}
                            className={`w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${canStart
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md hover:shadow-lg'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            {canStart ? 'Start Game!' : `Need ${2 - game.participants.length} more player(s)`}
                        </button>
                    )}
                </div>

                <p className="text-center text-xs text-slate-300">
                    Each player picks a topic · AI generates questions · Fastest correct answer wins!
                </p>
            </div>
        </div>
    );
}

// ─── Topic Selection ─────────────────────────────────────────

function TopicSelection({ game, uid, communityId }: {
    game: Game; uid: string; communityId: string;
}) {
    const [topics, setTopics] = useState<string[]>([]);
    const [selecting, setSelecting] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('');

    const currentRound = game.rounds?.[game.currentRound];
    const isMyTurn = currentRound?.topicChosenBy === uid;
    const currentChooser = game.participants.find(p => p.uid === currentRound?.topicChosenBy);

    useEffect(() => {
        fetch(`${API}/game/topics`)
            .then(res => res.json())
            .then(data => setTopics(data.data || []))
            .catch(() => setTopics(['Algebra', 'Physics', 'Chemistry', 'Biology', 'History']));
    }, []);

    const handleSelectTopic = async (topic: string) => {
        setSelectedTopic(topic);
        setSelecting(true);
        try {
            await fetch(`${API}/game/${communityId}/${game.gameId}/select-topic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, topic }),
            });
        } catch (err) {
            console.error('Topic selection failed:', err);
        }
        setSelecting(false);
    };

    return (
        <div className="mx-auto max-w-lg animate-fade-in-up">
            <div className="text-center mb-6">
                <div className="flex h-14 w-14 items-center justify-center mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg mb-4">
                    <BookOpen className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                    Round {game.currentRound + 1} / {game.totalRounds}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    {isMyTurn ? 'Your turn! Pick a topic for this round' : `Waiting for ${currentChooser?.displayName || 'player'} to pick a topic...`}
                </p>
            </div>

            {isMyTurn ? (
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">Choose a Topic</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                        {topics.map(topic => (
                            <button
                                key={topic}
                                onClick={() => handleSelectTopic(topic)}
                                disabled={selecting}
                                className={`p-3 rounded-xl text-sm font-medium text-left transition-all border ${selectedTopic === topic
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                                    } disabled:opacity-50`}
                            >
                                {selecting && selectedTopic === topic ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Generating...
                                    </span>
                                ) : topic}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center animate-pulse">
                            <Target className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm">
                            <strong>{currentChooser?.displayName}</strong> is choosing the topic...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Game Play ───────────────────────────────────────────────

function GamePlay({ game, uid, displayName, communityId }: {
    game: Game; uid: string; displayName: string; communityId: string;
}) {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ score: number; isCorrect: boolean } | null>(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [startTime] = useState(Date.now());

    const currentRound = game.rounds?.[game.currentRound];
    const question = currentRound?.question;
    const alreadyAnswered = currentRound?.responses?.some((r: { uid: string }) => r.uid === uid);
    const allAnswered = currentRound?.responses?.length === game.participants.length;

    // Timer
    useEffect(() => {
        if (submitted || alreadyAnswered) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, 20 - elapsed);
            setTimeLeft(remaining);
            if (remaining === 0) {
                clearInterval(interval);
                // Auto-submit no answer
                handleSubmit('');
            }
        }, 100);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitted, alreadyAnswered, startTime]);

    const handleSubmit = async (answer: string) => {
        if (submitted || alreadyAnswered) return;
        setSubmitted(true);
        setSubmitting(true);
        const timeTakenMs = Date.now() - startTime;

        try {
            const res = await fetch(`${API}/game/${communityId}/${game.gameId}/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, displayName, answer, timeTakenMs }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.data);
            }
        } catch (err) {
            console.error('Submit failed:', err);
        }
        setSubmitting(false);
    };

    const handleAdvance = async () => {
        try {
            await fetch(`${API}/game/${communityId}/${game.gameId}/advance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (err) {
            console.error('Advance failed:', err);
        }
    };

    // Auto-advance when all answered
    useEffect(() => {
        if (allAnswered && game.createdBy === uid) {
            const timer = setTimeout(handleAdvance, 3000);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allAnswered]);

    if (!question) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

    const timerPercent = (timeLeft / 20) * 100;

    return (
        <div className="mx-auto max-w-2xl animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        Round {game.currentRound + 1} / {game.totalRounds}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">{currentRound?.topic}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-slate-400" />
                    <div className="relative w-12 h-12">
                        <svg className="transform -rotate-90 w-12 h-12">
                            <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                            <circle
                                cx="24" cy="24" r="20"
                                stroke={timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#6366f1'}
                                strokeWidth="3" fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerPercent / 100)}`}
                                className="transition-all duration-100"
                            />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-slate-700'
                            }`}>
                            {timeLeft}
                        </span>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="card p-6 mb-6">
                <p className="text-lg font-semibold text-slate-900 mb-6">{question.text}</p>

                <div className="space-y-3">
                    {question.options.map((option: string, i: number) => {
                        const letter = String.fromCharCode(65 + i);
                        const isSelected = selectedAnswer === option;
                        const showResults = submitted || alreadyAnswered;
                        const isCorrect = option === question.correctAnswer;

                        return (
                            <button
                                key={i}
                                onClick={() => {
                                    if (!submitted && !alreadyAnswered) {
                                        setSelectedAnswer(option);
                                        handleSubmit(option);
                                    }
                                }}
                                disabled={submitted || alreadyAnswered}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all border ${showResults
                                        ? isCorrect
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : isSelected && !isCorrect
                                                ? 'bg-red-50 border-red-300 text-red-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-500'
                                        : isSelected
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                                    } disabled:cursor-default`}
                            >
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${showResults && isCorrect
                                        ? 'bg-emerald-200 text-emerald-800'
                                        : showResults && isSelected && !isCorrect
                                            ? 'bg-red-200 text-red-800'
                                            : isSelected
                                                ? 'bg-indigo-200 text-indigo-800'
                                                : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {letter}
                                </span>
                                <span className="flex-1 text-sm font-medium">{option}</span>
                                {showResults && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                {showResults && isSelected && !isCorrect && <X className="h-5 w-5 text-red-400" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className={`card p-4 mb-4 animate-scale-in ${result.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                        {result.isCorrect ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                            <X className="h-6 w-6 text-red-400" />
                        )}
                        <div>
                            <p className={`text-sm font-bold ${result.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                {result.isCorrect ? 'Correct!' : 'Wrong!'}
                            </p>
                            <p className={`text-xs ${result.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                                {result.score > 0 ? `+${result.score}` : result.score} points
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Scoreboard */}
            <div className="card p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Live Scores</h3>
                <div className="space-y-2">
                    {[...game.participants]
                        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                        .map((p, i) => (
                            <div key={p.uid} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">
                                        {p.displayName} {p.uid === uid && '(You)'}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-indigo-600">{p.totalScore || 0} pts</span>
                            </div>
                        ))}
                </div>
                {allAnswered && (
                    <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
                        Moving to next round...
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Game Results ────────────────────────────────────────────

function GameResults({ game, uid, communityId }: {
    game: Game; uid: string; communityId: string;
}) {
    const router = useRouter();
    const rankings = game.rankings || [];
    const myRanking = rankings.find(r => r.uid === uid);
    const isTopThree = myRanking && myRanking.rank <= 3;

    const podiumColors = [
        'from-yellow-400 to-amber-500',   // 1st - Gold
        'from-slate-300 to-slate-400',     // 2nd - Silver
        'from-amber-600 to-orange-700',    // 3rd - Bronze
    ];

    const podiumIcons = [
        <Trophy key="1" className="h-8 w-8 text-yellow-400" />,
        <Medal key="2" className="h-8 w-8 text-slate-400" />,
        <Medal key="3" className="h-8 w-8 text-amber-600" />,
    ];

    const handleBookSession = () => {
        const worstTopic = myRanking?.worstTopic || 'General';
        router.push(`/find-tutor?topic=${encodeURIComponent(worstTopic)}`);
    };

    return (
        <div className="mx-auto max-w-lg animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="text-5xl mb-3">🏆</div>
                <h1 className="text-2xl font-bold text-slate-900">Game Over!</h1>
                <p className="text-sm text-slate-400 mt-1">Here are the final standings</p>
            </div>

            {/* Podium - Top 3 */}
            {rankings.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-8">
                    {/* 2nd place */}
                    <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm mb-2">
                            {podiumIcons[1]}
                        </div>
                        <p className="text-xs font-bold text-slate-600 text-center max-w-[80px] truncate">{rankings[1].displayName}</p>
                        <p className="text-xs text-slate-400">{rankings[1].avgScore} avg</p>
                        <div className="mt-2 w-20 h-16 rounded-t-xl bg-gradient-to-b from-slate-200 to-slate-300 flex items-center justify-center">
                            <span className="text-xl font-black text-slate-500">2</span>
                        </div>
                    </div>
                    {/* 1st place */}
                    <div className="flex flex-col items-center -mt-4">
                        <div className="animate-bounce">
                            <Crown className="h-6 w-6 text-amber-400 mx-auto mb-1" />
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg mb-2">
                            {podiumIcons[0]}
                        </div>
                        <p className="text-sm font-bold text-slate-900 text-center max-w-[80px] truncate">{rankings[0].displayName}</p>
                        <p className="text-xs text-amber-500 font-semibold">{rankings[0].avgScore} avg</p>
                        <div className="mt-2 w-20 h-24 rounded-t-xl bg-gradient-to-b from-amber-300 to-amber-400 flex items-center justify-center shadow-inner">
                            <span className="text-2xl font-black text-amber-700">1</span>
                        </div>
                    </div>
                    {/* 3rd place */}
                    <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm mb-2">
                            {podiumIcons[2]}
                        </div>
                        <p className="text-xs font-bold text-slate-600 text-center max-w-[80px] truncate">{rankings[2].displayName}</p>
                        <p className="text-xs text-slate-400">{rankings[2].avgScore} avg</p>
                        <div className="mt-2 w-20 h-12 rounded-t-xl bg-gradient-to-b from-amber-500 to-orange-600 flex items-center justify-center">
                            <span className="text-xl font-black text-amber-200">3</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Leaderboard */}
            <div className="card p-5 mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Full Leaderboard</h3>
                <div className="space-y-2">
                    {rankings.map((r) => (
                        <div
                            key={r.uid}
                            className={`flex items-center gap-3 p-3 rounded-xl ${r.uid === uid
                                    ? 'bg-indigo-50 border border-indigo-200'
                                    : 'bg-slate-50'
                                }`}
                        >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${r.rank <= 3
                                    ? `bg-gradient-to-br ${podiumColors[r.rank - 1]} text-white`
                                    : 'bg-slate-200 text-slate-600'
                                }`}>
                                {r.rank}
                            </span>
                            <span className="flex-1 text-sm font-medium text-slate-700">
                                {r.displayName} {r.uid === uid && <span className="text-indigo-500">(You)</span>}
                            </span>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">{r.totalScore} pts</p>
                                <p className="text-[10px] text-slate-400">avg {r.avgScore}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Book Session for non-top-3 */}
            {!isTopThree && myRanking && (
                <div className="card p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 animate-scale-in">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-indigo-900">Want to improve?</h4>
                            <p className="text-xs text-indigo-600/80 mt-1">
                                You scored lowest on <strong>{myRanking.worstTopic || 'a topic'}</strong>.
                                Book a session with a tutor to master it!
                            </p>
                            <button
                                onClick={handleBookSession}
                                className="mt-3 flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                            >
                                <BookOpen className="h-4 w-4" />
                                Book a Session on {myRanking.worstTopic || 'this topic'}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back button */}
            <button
                onClick={() => router.push(`/community/${communityId}`)}
                className="w-full mt-4 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
                Back to Community
            </button>
        </div>
    );
}
