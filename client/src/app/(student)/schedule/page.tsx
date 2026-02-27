'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

function ScheduleContent() {
    const searchParams = useSearchParams();
    const topic = searchParams.get('topic') || '';
    const assessmentId = searchParams.get('assessmentId') || '';
    const tutorId = searchParams.get('tutorId') || '';
    const router = useRouter();
    const { firebaseUser } = useAuth();

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [loading, setLoading] = useState(false);
    const [tutorName, setTutorName] = useState('');
    const [tutorPrice, setTutorPrice] = useState(0);

    // Load tutor info if tutorId is provided
    useEffect(() => {
        if (!tutorId) return;
        const loadTutor = async () => {
            try {
                const tutorDoc = await getDoc(doc(db, 'users', tutorId));
                if (tutorDoc.exists()) {
                    const data = tutorDoc.data();
                    setTutorName(data.displayName || data.profile?.fullName || 'Tutor');
                    setTutorPrice(data.tutorData?.hourlyRate || 200);
                }
            } catch (err) {
                console.error('Error loading tutor:', err);
            }
        };
        loadTutor();
    }, [tutorId]);

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;
        setLoading(true);

        try {
            const scheduledTime = new Date(`${date}T${time}`);

            const sessionDoc = await addDoc(collection(db, 'sessions'), {
                studentId: firebaseUser.uid,
                studentName: firebaseUser.displayName || 'Student',
                tutorId: tutorId || '',
                topic,
                meetingType: 'scheduled',
                status: tutorId ? 'pending_tutor_approval' : 'searching',
                scheduledStartTime: Timestamp.fromDate(scheduledTime),
                actualStartTime: null,
                endTime: null,
                durationLimitMinutes: duration,
                paymentTransactionId: '',
                paymentStatus: 'pending',
                preAssessmentId: assessmentId,
                postAssessmentId: '',
                ratingId: '',
                sharedDocuments: [],
                createdAt: Timestamp.now(),
            });

            if (tutorId) {
                // Booking request sent to specific tutor
                alert('Booking request sent! The tutor will review and accept your request.');
            }

            router.push('/dashboard');
        } catch (error) {
            console.error('Error scheduling session:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate min date (today)
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {tutorId ? 'Request a Session' : 'Schedule a Session'}
                </h1>
                <p className="mt-1 text-slate-500">
                    {tutorId
                        ? `Send a booking request to ${tutorName || 'the tutor'} for "${topic || 'your selected topic'}"`
                        : `Book a tutoring session for ${topic || 'your selected topic'}`}
                </p>
            </div>

            {/* Tutor Info Card */}
            {tutorId && tutorName && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                        {tutorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{tutorName}</h3>
                        <p className="text-sm text-slate-500">₹{tutorPrice}/hr</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Awaiting Approval
                    </span>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleSchedule} className="space-y-5">
                    {/* Topic Display */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Topic
                        </label>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700">
                            {topic || 'General'}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={today}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            required
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Preferred Time
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            required
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Duration
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[30, 60, 90].map((mins) => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => setDuration(mins)}
                                    className={`rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${duration === mins
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {mins} min
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Estimate */}
                    {tutorPrice > 0 && (
                        <div className="rounded-lg bg-slate-50 p-3 flex items-center justify-between border border-slate-100">
                            <span className="text-sm text-slate-500">Estimated Cost</span>
                            <span className="text-lg font-bold text-slate-900">
                                ₹{Math.round(tutorPrice * (duration / 60))}
                            </span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading
                            ? 'Sending...'
                            : tutorId
                                ? '📩 Send Booking Request'
                                : '📅 Schedule Session'}
                    </button>
                </form>
            </div>

            <button
                onClick={() => router.back()}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
                ← Back to tutor list
            </button>
        </div>
    );
}

export default function SchedulePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
            }
        >
            <ScheduleContent />
        </Suspense>
    );
}
