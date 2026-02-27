'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/common/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
    Star, MessageSquare, TrendingUp, Inbox, UserCheck, Calendar
} from 'lucide-react';

interface ReviewEntry {
    ratingId: string;
    sessionId: string;
    tutorId: string;
    tutorName: string;
    starRating: number;
    feedback: string;
    scoreDelta: number;
    createdAt: string;
    studentName: string;
}

export default function ParentReviewsPage() {
    const { mentoraUser } = useAuth();
    const [reviews, setReviews] = useState<ReviewEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!mentoraUser) return;
            const linkedIds = mentoraUser.parentData?.linkedStudentIds || [];
            if (linkedIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const ratingsQuery = query(
                    collection(db, 'ratings'),
                    where('studentId', 'in', linkedIds)
                );
                const ratingsSnap = await getDocs(ratingsQuery);

                const reviewsList: ReviewEntry[] = await Promise.all(
                    ratingsSnap.docs.map(async (rDoc) => {
                        const data = rDoc.data();
                        let tutorName = 'Unknown Tutor';
                        let studentName = 'Student';

                        // Fetch tutor name
                        if (data.tutorId) {
                            try {
                                const tutorDoc = await getDoc(doc(db, 'users', data.tutorId));
                                if (tutorDoc.exists()) {
                                    const tutor = tutorDoc.data();
                                    tutorName = tutor?.profile?.fullName || tutor?.displayName || 'Tutor';
                                }
                            } catch { /* skip */ }
                        }

                        // Fetch student name
                        if (data.studentId) {
                            try {
                                const studentDoc = await getDoc(doc(db, 'users', data.studentId));
                                if (studentDoc.exists()) {
                                    const student = studentDoc.data();
                                    studentName = student?.profile?.fullName || student?.displayName || 'Student';
                                }
                            } catch { /* skip */ }
                        }

                        return {
                            ratingId: rDoc.id,
                            sessionId: data.sessionId || '',
                            tutorId: data.tutorId || '',
                            tutorName,
                            starRating: data.metrics?.studentStarRating || 0,
                            feedback: data.metrics?.feedbackText || '',
                            scoreDelta: data.metrics?.scoreDelta || 0,
                            createdAt: data.createdAt || '',
                            studentName,
                        };
                    })
                );

                // Sort by createdAt desc
                reviewsList.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
                setReviews(reviewsList);
            } catch (err) {
                console.error('Error fetching reviews:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [mentoraUser]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                    />
                ))}
                <span className="ml-1.5 text-sm font-bold text-slate-900">{rating.toFixed(1)}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#d97706' }} />
                    <p className="text-sm text-slate-400">Loading reviews...</p>
                </div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 mb-6 animate-float">
                    <Inbox className="h-10 w-10 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No Reviews Yet</h2>
                <p className="text-sm text-slate-500 max-w-md">
                    Reviews will appear here once your child rates their tutoring sessions.
                </p>
            </div>
        );
    }

    // Summary
    const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length
        : 0;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-amber-600" />
                    Tutor Review Audit
                </h1>
                <p className="text-sm text-slate-500 mt-1">See the ratings and feedback your child has given to tutors</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                            <Star className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Avg Rating Given</p>
                            <p className="text-xl font-bold text-slate-900">{avgRating.toFixed(1)} / 5</p>
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Total Reviews</p>
                            <p className="text-xl font-bold text-slate-900">{reviews.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Positive Reviews</p>
                            <p className="text-xl font-bold text-slate-900">{reviews.filter(r => r.starRating >= 4).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <div key={review.ratingId} className="card p-6 card-interactive">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                    {review.tutorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{review.tutorName}</p>
                                    <p className="text-xs text-slate-400">Reviewed by {review.studentName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {renderStars(review.starRating)}
                            </div>
                        </div>

                        {review.feedback && (
                            <div className="bg-slate-50 rounded-xl p-4 mb-3">
                                <p className="text-sm text-slate-600 leading-relaxed italic">
                                    &quot;{review.feedback}&quot;
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            {review.scoreDelta !== 0 && (
                                <span className={`flex items-center gap-1 font-semibold ${review.scoreDelta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <TrendingUp className="h-3 w-3" />
                                    {review.scoreDelta > 0 ? '+' : ''}{review.scoreDelta} score delta
                                </span>
                            )}
                            {review.createdAt && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
