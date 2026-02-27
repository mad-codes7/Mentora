'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { Star, CheckCircle2, Send } from 'lucide-react';

export default function PostSessionPage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = use(params);
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('assessmentId') || '';
    const { firebaseUser } = useAuth();
    const router = useRouter();

    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [session, setSession] = useState<any>(null);
    const [preScore, setPreScore] = useState<{ total: number; max: number } | null>(null);
    const [postScore, setPostScore] = useState<{ total: number; max: number } | null>(null);

    useEffect(() => {
        const loadSession = async () => {
            const snap = await getDoc(doc(db, 'sessions', sessionId));
            if (snap.exists()) {
                const sData = snap.data();
                setSession(sData);

                // Load pre-assessment score
                if (sData.preAssessmentId) {
                    const preSnap = await getDoc(doc(db, 'assessments', sData.preAssessmentId));
                    if (preSnap.exists()) {
                        const d = preSnap.data();
                        setPreScore({ total: d.scoreData.totalScore, max: d.scoreData.maxScore });
                    }
                }

                // Load post-assessment score
                const postId = assessmentId || sData.postAssessmentId;
                if (postId) {
                    const postSnap = await getDoc(doc(db, 'assessments', postId));
                    if (postSnap.exists()) {
                        const d = postSnap.data();
                        setPostScore({ total: d.scoreData.totalScore, max: d.scoreData.maxScore });
                    }
                }
            }
        };
        loadSession();
    }, [sessionId, assessmentId]);

    const handleSubmit = async () => {
        if (!firebaseUser || !session || rating === 0) return;
        setSubmitting(true);

        try {
            let preTestScore = 0,
                postTestScore = 0;

            if (assessmentId) {
                const assessSnap = await getDoc(doc(db, 'assessments', assessmentId));
                if (assessSnap.exists()) {
                    const data = assessSnap.data();
                    postTestScore = data.scoreData.totalScore / data.scoreData.maxScore;
                }
            }

            const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
            if (sessionSnap.exists()) {
                const sData = sessionSnap.data();
                if (sData.preAssessmentId) {
                    const preSnap = await getDoc(doc(db, 'assessments', sData.preAssessmentId));
                    if (preSnap.exists()) {
                        const preData = preSnap.data();
                        preTestScore = preData.scoreData.totalScore / preData.scoreData.maxScore;
                    }
                }
            }

            const scoreDelta = postTestScore - preTestScore;
            // If no assessments taken, rating is purely star-based
            const hasAssessments = preTestScore > 0 || postTestScore > 0;
            const normalizedDelta = hasAssessments
                ? Math.max(0, Math.min(5, ((scoreDelta + 1) / 2) * 5))
                : rating; // fallback to star rating if no assessments
            const finalCalculatedRating = hasAssessments
                ? 0.6 * rating + 0.4 * normalizedDelta
                : rating;

            const ratingDoc = await addDoc(collection(db, 'ratings'), {
                sessionId,
                tutorId: session.tutorId,
                studentId: firebaseUser.uid,
                metrics: {
                    studentStarRating: rating,
                    feedbackText: feedback,
                    preTestScore: Math.round(preTestScore * 20),
                    postTestScore: Math.round(postTestScore * 20),
                    scoreDelta: Math.round(scoreDelta * 20),
                    finalCalculatedRating: Math.round(finalCalculatedRating * 100) / 100,
                },
                createdAt: Timestamp.now(),
            });

            await updateDoc(doc(db, 'sessions', sessionId), {
                ratingId: ratingDoc.id,
                status: 'completed',
            });

            setSubmitted(true);
            setTimeout(() => router.push('/dashboard'), 2500);
        } catch (err) {
            console.error('Error submitting rating:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="card max-w-sm w-full p-8 text-center animate-bounce-in">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Thanks for your feedback!</h2>
                    <p className="mt-2 text-slate-400 text-sm">
                        Your rating helps us improve. Redirecting...
                    </p>
                    <div className="mt-4 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                                key={i}
                                className={`h-6 w-6 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    <p className="text-sm text-slate-400">Loading session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex h-14 w-14 items-center justify-center mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg mb-4">
                    <Star className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Rate Your Session</h1>
                <p className="mt-2 text-slate-400 text-sm">How was your learning experience?</p>
            </div>

            {/* Score Comparison — only shown if assessments were taken */}
            {(preScore || postScore) && (
                <div className="card overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3">
                        <h3 className="text-sm font-semibold text-white">📊 Your Progress</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-around">
                            {/* Pre Score */}
                            <div className="text-center">
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Before</p>
                                <p className="text-3xl font-black text-slate-700">
                                    {preScore ? `${preScore.total}/${preScore.max}` : '—'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">Pre-Assessment</p>
                            </div>

                            {/* Arrow / Delta */}
                            <div className="text-center px-4">
                                {preScore && postScore ? (() => {
                                    const delta = postScore.total - preScore.total;
                                    const color = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-blue-500';
                                    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
                                    const label = delta > 0 ? 'Improved!' : delta < 0 ? 'Needs work' : 'Consistent';
                                    return (
                                        <>
                                            <p className={`text-2xl font-black ${color}`}>
                                                {arrow} {delta > 0 ? '+' : ''}{delta}
                                            </p>
                                            <p className={`text-[10px] font-semibold ${color}`}>{label}</p>
                                        </>
                                    );
                                })() : (
                                    <p className="text-xl text-slate-300">→</p>
                                )}
                            </div>

                            {/* Post Score */}
                            <div className="text-center">
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">After</p>
                                <p className="text-3xl font-black text-slate-700">
                                    {postScore ? `${postScore.total}/${postScore.max}` : '—'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">Post-Assessment</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card p-6 space-y-6">
                {/* Star Rating */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">
                        Tap to rate your tutor
                    </label>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className={`transition-all duration-200 ${star <= (hoveredRating || rating)
                                    ? 'scale-110 drop-shadow-md'
                                    : 'opacity-40 hover:opacity-60'
                                    }`}
                            >
                                <Star
                                    className={`h-10 w-10 ${star <= (hoveredRating || rating)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-300'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-center mt-2 text-sm font-medium text-indigo-600 animate-fade-in">
                            {rating === 5 ? 'Outstanding!' :
                                rating === 4 ? 'Great session!' :
                                    rating === 3 ? 'Good experience' :
                                        rating === 2 ? 'Could be better' :
                                            'Needs improvement'}
                        </p>
                    )}
                </div>

                {/* Feedback */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Share your feedback <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        placeholder="What did you like? What could be improved?"
                        className="input-styled resize-none text-sm"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="btn-primary w-full text-center text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {submitting ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" />
                            Submit Rating
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
