'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { fetchQuizQuestions, QuizApiQuestion } from '@/config/mockQuizApi';
import QuizCard from '@/features/student/QuizCard';
import { FileText, Crosshair } from 'lucide-react';

function AssessmentContent() {
    const searchParams = useSearchParams();
    const topic = searchParams.get('topic') || 'General';
    const sessionId = searchParams.get('sessionId') || '';
    const type = (searchParams.get('type') || 'pre_session') as 'pre_session' | 'post_session';

    const { firebaseUser } = useAuth();
    const router = useRouter();

    const [questions, setQuestions] = useState<QuizApiQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState({ total: 0, max: 0 });
    const [timeLeft, setTimeLeft] = useState(300);
    const TOTAL_TIME = 300;

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const q = await fetchQuizQuestions(topic, 5);
                setQuestions(q);
            } catch (error) {
                console.error('Failed to fetch questions:', error);
            } finally {
                setLoading(false);
            }
        };
        loadQuestions();
    }, [topic]);

    useEffect(() => {
        if (submitted || loading) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitted, loading]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const timerProgress = (timeLeft / TOTAL_TIME) * 100;
    const circumference = 2 * Math.PI * 28;
    const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

    const handleSelectAnswer = (answer: string) => {
        setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
    };

    const handleSubmit = async () => {
        if (!firebaseUser) return;

        let totalScore = 0;
        const quizPayload = questions.map((q, idx) => {
            const studentAnswer = answers[idx] || '';
            const isCorrect = studentAnswer === q.correctAnswer;
            if (isCorrect) totalScore++;
            return {
                questionText: q.questionText,
                options: q.options,
                studentAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect,
            };
        });

        setScore({ total: totalScore, max: questions.length });
        setSubmitted(true);

        try {
            const docRef = await addDoc(collection(db, 'assessments'), {
                sessionId: sessionId || 'standalone',
                userId: firebaseUser.uid,
                type,
                topic,
                scoreData: {
                    totalScore,
                    maxScore: questions.length,
                },
                quizPayload,
                takenAt: Timestamp.now(),
            });

            if (type === 'pre_session' && !sessionId) {
                setTimeout(() => {
                    router.push(
                        `/find-tutor?topic=${encodeURIComponent(topic)}&assessmentId=${docRef.id}`
                    );
                }, 2000);
            }

            if (type === 'post_session' && sessionId) {
                // Link the post-assessment to the session
                await updateDoc(doc(db, 'sessions', sessionId), {
                    postAssessmentId: docRef.id,
                });
                setTimeout(() => {
                    router.push(`/post-session/${sessionId}?assessmentId=${docRef.id}`);
                }, 2000);
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="relative">
                        <div className="h-14 w-14 rounded-2xl gradient-primary animate-pulse" />
                        <div className="absolute inset-0 h-14 w-14 rounded-2xl gradient-primary opacity-30 animate-ping" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Loading quiz for <span className="text-indigo-600 font-bold">{topic}</span>...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        {type === 'pre_session' ? (
                            <FileText className="h-6 w-6 text-indigo-600" />
                        ) : (
                            <Crosshair className="h-6 w-6 text-indigo-600" />
                        )}
                        <h1 className="text-2xl font-bold text-slate-900">
                            {type === 'pre_session' ? 'Pre-Assessment' : 'Post-Assessment'}
                        </h1>
                    </div>
                    <p className="text-slate-400 flex items-center gap-1.5">
                        <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                            {topic}
                        </span>
                    </p>
                </div>
                {!submitted && (
                    <div className="relative flex items-center justify-center">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                            <circle
                                cx="32" cy="32" r="28" fill="none"
                                stroke={timeLeft <= 60 ? '#EF4444' : '#4F46E5'}
                                strokeWidth="4" strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <span className={`absolute text-sm font-bold ${timeLeft <= 60 ? 'text-red-500' : 'text-indigo-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full gradient-primary transition-all duration-500"
                    style={{
                        width: `${submitted ? 100 : ((Object.keys(answers).length) / questions.length) * 100}%`,
                    }}
                />
                {!submitted && (
                    <div
                        className="absolute inset-0 animate-shimmer rounded-full"
                        style={{
                            width: `${((Object.keys(answers).length) / questions.length) * 100}%`,
                        }}
                    />
                )}
            </div>

            {/* Score Result */}
            {submitted && (
                <div className="card overflow-hidden animate-bounce-in">
                    <div className="gradient-primary p-6 text-center text-white">
                        <p className="text-sm font-medium text-indigo-200">Your Score</p>
                        <p className="mt-2 text-5xl font-black">
                            {score.total}/{score.max}
                        </p>
                        <p className="mt-3 text-sm font-medium text-indigo-100">
                            {score.total / score.max >= 0.8
                                ? 'Excellent! You nailed it!'
                                : score.total / score.max >= 0.5
                                    ? 'Good effort! Keep practicing!'
                                    : 'Keep going! You\'ll get better!'}
                        </p>
                        {type === 'pre_session' && !sessionId && (
                            <p className="mt-3 text-xs text-indigo-200">
                                Redirecting to find a tutor...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Quiz Card */}
            {questions[currentIndex] && (
                <QuizCard
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                    questionText={questions[currentIndex].questionText}
                    options={questions[currentIndex].options}
                    selectedAnswer={answers[currentIndex] || null}
                    onSelectAnswer={handleSelectAnswer}
                    showResult={submitted}
                    correctAnswer={submitted ? questions[currentIndex].correctAnswer : undefined}
                />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-30"
                >
                    ← Previous
                </button>

                {/* Question dots */}
                <div className="flex gap-2">
                    {questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-3 w-3 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? 'gradient-primary scale-125 shadow-sm'
                                : answers[idx]
                                    ? 'bg-indigo-300'
                                    : 'bg-slate-200'
                                }`}
                        />
                    ))}
                </div>

                {currentIndex < questions.length - 1 ? (
                    <button
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        className="btn-primary text-sm !py-2.5 !px-5"
                    >
                        Next →
                    </button>
                ) : !submitted ? (
                    <button
                        onClick={handleSubmit}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                    >
                        Submit ✓
                    </button>
                ) : (
                    <div />
                )}
            </div>
        </div>
    );
}

export default function AssessmentPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl gradient-primary animate-pulse" />
                </div>
            }
        >
            <AssessmentContent />
        </Suspense>
    );
}
