'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { doTagsMatch } from '@/config/subjects';
import TutorCard from '@/features/student/TutorCard';

interface TutorInfo {
    uid: string;
    name: string;
    subjects: string[];
    rating: number;
    price: number;
    isOnline: boolean;
}

function FindTutorContent() {
    const searchParams = useSearchParams();
    const topic = searchParams.get('topic') || '';
    const assessmentId = searchParams.get('assessmentId') || '';
    const tagsParam = searchParams.get('tags') || '';
    const doubtTags = tagsParam ? tagsParam.split(',') : [];
    const router = useRouter();
    const { firebaseUser } = useAuth();

    const [tutors, setTutors] = useState<TutorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);
    const [searchSeconds, setSearchSeconds] = useState(0);

    const searchMessages = [
        'Scanning available tutors...',
        'Checking subject expertise...',
        'Matching your topic with tutors...',
        'Verifying tutor availability...',
        'Almost there, hang tight!',
        'Looking across all time zones...',
        'Checking tutor ratings...',
        'Finalizing best matches...',
    ];
    const searchMessage = searchMessages[Math.floor(searchSeconds / 8) % searchMessages.length];

    // Timer for search animation
    useEffect(() => {
        if (loading || tutors.length > 0) return;
        const interval = setInterval(() => {
            setSearchSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [loading, tutors.length]);

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('roles', 'array-contains', 'tutor'),
                    where('tutorData.isVerified', '==', true)
                );

                const snapshot = await getDocs(q);
                const now = new Date();
                const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                const tutorList: TutorInfo[] = snapshot.docs
                    .filter((doc) => doc.id !== firebaseUser?.uid)
                    .map((doc) => {
                        const data = doc.data();
                        const availability = data.tutorData?.availability || [];

                        // Check if tutor is available now
                        // If no availability is set, consider them available (new tutors)
                        let isAvailableNow = availability.length === 0;
                        if (availability.length > 0) {
                            isAvailableNow = availability.some(
                                (slot: { day: string; startTime: string; endTime: string }) =>
                                    slot.day === currentDay &&
                                    currentTime >= slot.startTime &&
                                    currentTime <= slot.endTime
                            );
                        }

                        return {
                            uid: doc.id,
                            name: data.displayName || data.profile?.fullName || 'Tutor',
                            subjects: data.tutorData?.subjects || [],
                            rating: data.tutorData?.aggregateRating || 4.0,
                            price: data.tutorData?.hourlyRate || data.tutorData?.sessionPrice || 200,
                            isOnline: isAvailableNow,
                        };
                    })
                    .filter((tutor) => tutor.uid !== 'self'); // show all tutors for now

                setTutors(tutorList);
            } catch (error) {
                console.error('Error fetching tutors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTutors();
    }, [firebaseUser]);

    const handleBookTutor = async (tutorId: string) => {
        if (booking) return;
        if (!firebaseUser) {
            alert('Please log in to book a session.');
            router.push('/login');
            return;
        }
        setBooking(true);
        setBookingTutorId(tutorId);

        try {
            // Generate a doc ref manually so we can use setDoc
            const sessionRef = doc(collection(db, 'sessions'));
            const sessionData = {
                studentId: firebaseUser.uid,
                studentName: firebaseUser.displayName || 'Student',
                tutorId,
                topic,
                meetingType: 'on_demand' as const,
                status: 'pending_payment' as const,
                scheduledStartTime: null,
                actualStartTime: null,
                endTime: null,
                durationLimitMinutes: 60,
                paymentTransactionId: '',
                paymentStatus: 'pending' as const,
                preAssessmentId: assessmentId,
                postAssessmentId: '',
                ratingId: '',
                sharedDocuments: [] as string[],
                createdAt: Timestamp.now(),
            };

            // Race against a 10s timeout — prevents silent hang from Firestore rules
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Firestore write timed out')), 10000)
            );
            await Promise.race([setDoc(sessionRef, sessionData), timeout]);

            window.location.href = `/payment?sessionId=${sessionRef.id}`;
        } catch (error: unknown) {
            console.error('Error creating session:', error);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to book session: ${msg}`);
            setBooking(false);
            setBookingTutorId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Find a Tutor</h1>
                    <p className="mt-1 text-slate-500">
                        {topic
                            ? `Available tutors for "${topic}"`
                            : doubtTags.length > 0
                                ? 'Tutors matching your doubt'
                                : 'Browse all available tutors'}
                    </p>
                    {doubtTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {doubtTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() =>
                        router.push(`/schedule?topic=${encodeURIComponent(topic)}&assessmentId=${assessmentId}`)
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                    📅 Schedule for Later
                </button>
            </div>

            {/* Tutor List */}
            {loading || (tutors.length === 0 && searchSeconds < 60) ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-5 max-w-sm text-center">
                        {/* Animated search icon */}
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center animate-pulse">
                                <span className="text-3xl animate-bounce">🔍</span>
                            </div>
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 border-2 border-white animate-ping" />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Finding the best tutor for you...</h3>
                            <p className="mt-1 text-sm text-slate-500">{searchMessage}</p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear"
                                style={{ width: `${Math.min((searchSeconds / 60) * 100, 100)}%` }}
                            />
                        </div>

                        <p className="text-xs text-slate-400">
                            Checking availability & subject match... {60 - searchSeconds}s
                        </p>
                    </div>
                </div>
            ) : tutors.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-12 px-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-5">
                        <span className="text-3xl">😔</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        No tutors available right now
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                        Don&apos;t worry! You can get AI-powered insights on your topic, or schedule a session for when a tutor is free.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() =>
                                router.push(`/assessment?topic=${encodeURIComponent(topic)}&mode=ai-insight`)
                            }
                            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <span>✨</span> Get AI Insight
                        </button>
                        <button
                            onClick={() =>
                                router.push(
                                    `/schedule?topic=${encodeURIComponent(topic)}&assessmentId=${assessmentId}`
                                )
                            }
                            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm flex items-center justify-center gap-2"
                        >
                            <span>📅</span> Schedule for Later
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {tutors.map((tutor) => (
                        <TutorCard
                            key={tutor.uid}
                            tutorId={tutor.uid}
                            name={tutor.name}
                            subjects={tutor.subjects}
                            rating={tutor.rating}
                            price={tutor.price}
                            isOnline={tutor.isOnline}
                            onBook={handleBookTutor}
                            isBooking={bookingTutorId === tutor.uid}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FindTutorPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
            }
        >
            <FindTutorContent />
        </Suspense>
    );
}
