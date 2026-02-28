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
import AskCommunityModal from '@/features/student/AskCommunityModal';
import { CalendarDays, WifiOff, Users } from 'lucide-react';

interface AvailabilitySlot {
    day: string;
    startTime: string;
    endTime: string;
}

interface TutorInfo {
    uid: string;
    name: string;
    subjects: string[];
    rating: number;
    price: number;
    isOnline: boolean;
    isMatched: boolean;
    matchedSubjects: string[];
    availability: AvailabilitySlot[];
    qualification?: string;
}

function FindTutorContent() {
    const searchParams = useSearchParams();
    const topic = searchParams.get('topic') || '';
    const assessmentId = searchParams.get('assessmentId') || '';
    const tagsParam = searchParams.get('tags') || '';
    const mode = searchParams.get('mode') || ''; // 'connect' = online-only
    const doubtTags = tagsParam ? tagsParam.split(',') : [];
    const router = useRouter();
    const { firebaseUser } = useAuth();

    const [tutors, setTutors] = useState<TutorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);
    const [searchSeconds, setSearchSeconds] = useState(0);
    const [showCommunityModal, setShowCommunityModal] = useState(false);

    // All search tags = topic + doubt tags
    const searchTags = [...(topic ? [topic] : []), ...doubtTags];

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
                // Query ALL registered tutors (not just verified)
                const q = query(
                    collection(db, 'users'),
                    where('roles', 'array-contains', 'tutor')
                );

                const snapshot = await getDocs(q);
                const now = new Date();
                const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                // Fetch actual ratings from the ratings collection for accurate display
                const ratingsSnap = await getDocs(collection(db, 'ratings'));
                const ratingsByTutor: Record<string, { total: number; count: number }> = {};
                ratingsSnap.docs.forEach(rDoc => {
                    const rd = rDoc.data();
                    const tid = rd.tutorId;
                    const star = rd.metrics?.studentStarRating || 0;
                    if (tid && star > 0) {
                        if (!ratingsByTutor[tid]) ratingsByTutor[tid] = { total: 0, count: 0 };
                        ratingsByTutor[tid].total += star;
                        ratingsByTutor[tid].count += 1;
                    }
                });

                const tutorList: TutorInfo[] = snapshot.docs
                    .filter((doc) => doc.id !== firebaseUser?.uid)
                    .map((doc) => {
                        const data = doc.data();
                        const availability: AvailabilitySlot[] = data.tutorData?.availability || [];
                        const tutorSubjects: string[] = data.tutorData?.subjects || [];

                        // Check if tutor is available now
                        let isAvailableNow = availability.length === 0;
                        if (availability.length > 0) {
                            isAvailableNow = availability.some(
                                (slot: AvailabilitySlot) =>
                                    slot.day === currentDay &&
                                    currentTime >= slot.startTime &&
                                    currentTime <= slot.endTime
                            );
                        }

                        // Check subject match using doTagsMatch
                        const matchedSubjects: string[] = [];
                        if (searchTags.length > 0) {
                            for (const tutorSubject of tutorSubjects) {
                                for (const searchTag of searchTags) {
                                    if (doTagsMatch(searchTag, tutorSubject)) {
                                        if (!matchedSubjects.includes(tutorSubject)) {
                                            matchedSubjects.push(tutorSubject);
                                        }
                                    }
                                }
                            }
                        }

                        // isActive = tutor has toggled "Active" in their dashboard
                        const tutorIsActive = data.tutorData?.isActive === true;

                        // Use real average rating from ratings collection, fall back to aggregateRating
                        const tutorRating = ratingsByTutor[doc.id];
                        const avgRating = tutorRating
                            ? Math.round((tutorRating.total / tutorRating.count) * 10) / 10
                            : (data.tutorData?.aggregateRating || 0);

                        return {
                            uid: doc.id,
                            name: data.displayName || data.profile?.fullName || 'Tutor',
                            subjects: tutorSubjects,
                            rating: avgRating,
                            price: data.tutorData?.hourlyRate || data.tutorData?.sessionPrice || 200,
                            isOnline: tutorIsActive,
                            isMatched: matchedSubjects.length > 0,
                            matchedSubjects,
                            availability,
                            qualification: data.tutorData?.qualification || '',
                        };
                    });

                // Filter and sort tutors
                let filteredTutors = tutorList;

                // If in connect mode, show only ACTIVE tutors (who toggled 'Active' in their dashboard)
                if (mode === 'connect') {
                    filteredTutors = filteredTutors.filter(t => t.isOnline);
                }

                // Sort: subject match first, then rating descending
                if (searchTags.length > 0) {
                    const matched = filteredTutors.filter(t => t.isMatched);
                    const unmatched = filteredTutors.filter(t => !t.isMatched);

                    // Sort matched by rating descending
                    matched.sort((a, b) => b.rating - a.rating);

                    // Sort unmatched by rating descending
                    unmatched.sort((a, b) => b.rating - a.rating);

                    if (mode === 'connect' && matched.length > 0) {
                        filteredTutors = matched;
                    } else {
                        filteredTutors = [...matched, ...unmatched];
                    }
                } else {
                    // No search tags: sort by rating descending
                    filteredTutors.sort((a, b) => b.rating - a.rating);
                }

                setTutors(filteredTutors);
            } catch (error) {
                console.error('Error fetching tutors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTutors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleRequestTutor = (tutorId: string) => {
        // Navigate to schedule page with this specific tutor pre-selected
        router.push(
            `/schedule?topic=${encodeURIComponent(topic)}&assessmentId=${assessmentId}&tutorId=${tutorId}`
        );
    };

    // Separate matched vs unmatched for display
    const matchedTutors = tutors.filter(t => t.isMatched);
    const unmatchedTutors = tutors.filter(t => !t.isMatched);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {mode === 'connect' ? 'Connect with a Tutor' : 'Find a Tutor'}
                    </h1>
                    <p className="mt-1 text-slate-500">
                        {mode === 'connect'
                            ? `Online tutors available for "${topic}"`
                            : topic
                                ? `Available tutors for "${topic}" — sorted by rating`
                                : doubtTags.length > 0
                                    ? 'Tutors matching your doubt'
                                    : 'Browse all available tutors — sorted by rating'}
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
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center animate-pulse">
                                <span className="text-3xl animate-bounce">🔍</span>
                            </div>
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 border-2 border-white animate-ping" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {mode === 'connect'
                                    ? 'Finding online tutors for you...'
                                    : 'Finding the best tutor for you...'}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{searchMessage}</p>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear"
                                style={{ width: `${Math.min((searchSeconds / 60) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Checking availability & subject match... {60 - searchSeconds}s
                        </p>
                        {/* Ask into Community button */}
                        <button
                            onClick={() => setShowCommunityModal(true)}
                            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                        >
                            <Users className="h-4 w-4" />
                            Ask into Community
                        </button>
                        <p className="text-[11px] text-slate-300 mt-1">Post your doubt in a matching community for quick help</p>
                    </div>
                </div>
            ) : tutors.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-12 px-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-5">
                        {mode === 'connect' ? (
                            <WifiOff className="h-8 w-8 text-slate-300" />
                        ) : (
                            <span className="text-3xl">😔</span>
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        {mode === 'connect'
                            ? 'No tutors are online right now'
                            : 'No tutors available right now'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                        {mode === 'connect'
                            ? 'All tutors for this subject are currently offline. You can book a slot and a matching tutor will be assigned to you.'
                            : 'Don\'t worry! You can schedule a session for when a tutor is free.'}
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() =>
                                router.push(`/schedule?topic=${encodeURIComponent(topic)}&assessmentId=${assessmentId}`)
                            }
                            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Book a Slot for Later
                        </button>
                        {mode === 'connect' && (
                            <button
                                onClick={() =>
                                    router.push(`/find-tutor?topic=${encodeURIComponent(topic)}&assessmentId=${assessmentId}`)
                                }
                                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm flex items-center justify-center gap-2"
                            >
                                👀 View All Tutors
                            </button>
                        )}
                        <button
                            onClick={() => setShowCommunityModal(true)}
                            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <Users className="h-4 w-4" />
                            Ask into Community
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Matched tutors section */}
                    {searchTags.length > 0 && matchedTutors.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Best Matches for &ldquo;{topic || doubtTags.join(', ')}&rdquo;
                                </h3>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                    {matchedTutors.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {matchedTutors.map((tutor) => (
                                    <TutorCard
                                        key={tutor.uid}
                                        tutorId={tutor.uid}
                                        name={tutor.name}
                                        subjects={tutor.subjects}
                                        rating={tutor.rating}
                                        price={tutor.price}
                                        isOnline={tutor.isOnline}
                                        onBook={handleBookTutor}
                                        onRequest={handleRequestTutor}
                                        isBooking={bookingTutorId === tutor.uid}
                                        isMatched={true}
                                        matchedSubjects={tutor.matchedSubjects}
                                        availability={tutor.availability}
                                        qualification={tutor.qualification}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unmatched tutors section */}
                    {unmatchedTutors.length > 0 && mode !== 'connect' && (
                        <div>
                            {matchedTutors.length > 0 && (
                                <div className="flex items-center gap-2 mb-3 mt-2">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        Other Tutors
                                    </h3>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                        {unmatchedTutors.length}
                                    </span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {unmatchedTutors.map((tutor) => (
                                    <TutorCard
                                        key={tutor.uid}
                                        tutorId={tutor.uid}
                                        name={tutor.name}
                                        subjects={tutor.subjects}
                                        rating={tutor.rating}
                                        price={tutor.price}
                                        isOnline={tutor.isOnline}
                                        onBook={handleBookTutor}
                                        onRequest={handleRequestTutor}
                                        isBooking={bookingTutorId === tutor.uid}
                                        availability={tutor.availability}
                                        qualification={tutor.qualification}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Show only unmatched if no search tags */}
                    {searchTags.length === 0 && (
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
                                    onRequest={handleRequestTutor}
                                    isBooking={bookingTutorId === tutor.uid}
                                    availability={tutor.availability}
                                    qualification={tutor.qualification}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ask into Community Modal */}
            <AskCommunityModal
                isOpen={showCommunityModal}
                onClose={() => setShowCommunityModal(false)}
                searchTags={searchTags}
                doubtDescription={topic || doubtTags.join(', ')}
            />
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
