'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/common/AuthContext';
import { CreditCard, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';

function PaymentContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId') || '';
    const paymentStatus = searchParams.get('status'); // from Stripe redirect
    const { firebaseUser } = useAuth();
    const router = useRouter();

    const [tutorName, setTutorName] = useState('');
    const [tutorPrice, setTutorPrice] = useState<number>(0);
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [paid, setPaid] = useState(false);

    // Handle Stripe redirect back
    useEffect(() => {
        if (paymentStatus === 'success' && sessionId) {
            const updateSession = async () => {
                try {
                    await updateDoc(doc(db, 'sessions', sessionId), {
                        status: 'paid_waiting',
                        paymentStatus: 'success',
                        paymentTimestamp: Timestamp.now(),
                        paymentTransactionId: `STRIPE_${Date.now()}`,
                    });
                } catch (err) {
                    console.error('Error updating session:', err);
                }
            };
            updateSession();
            setPaid(true);
            setLoading(false);
            setTimeout(() => router.push(`/room/${sessionId}`), 2500);
        }
    }, [paymentStatus, sessionId, router]);

    useEffect(() => {
        const loadSession = async () => {
            if (!sessionId || paymentStatus === 'success') return;
            try {
                const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
                if (sessionDoc.exists()) {
                    const data = sessionDoc.data();
                    setTopic(data.topic || 'General');
                    setDuration(data.durationLimitMinutes || 30);

                    if (data.tutorId) {
                        const tutorDoc = await getDoc(doc(db, 'users', data.tutorId));
                        if (tutorDoc.exists()) {
                            const tutor = tutorDoc.data();
                            setTutorName(tutor?.displayName || tutor?.profile?.fullName || 'Tutor');
                            setTutorPrice(tutor?.tutorData?.hourlyRate || tutor?.tutorData?.sessionPrice || 200);
                        } else {
                            setTutorName('Tutor');
                            setTutorPrice(200);
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading session:', err);
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, [sessionId, paymentStatus]);

    const handlePayment = async () => {
        if (!firebaseUser || !sessionId) return;
        setPaying(true);

        const stripeEnabled = process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

        try {
            if (stripeEnabled) {
                // Real Stripe Checkout
                const res = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: tutorPrice || 200,
                        topic,
                        sessionId,
                    }),
                });
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                    return; // redirecting to Stripe
                } else {
                    throw new Error(data.error || 'Failed to create checkout session');
                }
            } else {
                // Simulated payment (dev mode) — update session directly
                await updateDoc(doc(db, 'sessions', sessionId), {
                    status: 'paid_waiting',
                    paymentStatus: 'success',
                    paymentTimestamp: Timestamp.now(),
                    paymentTransactionId: `SIM_${Date.now()}`,
                });
                setPaid(true);
                setTimeout(() => router.push(`/room/${sessionId}`), 2000);
            }
        } catch (err) {
            console.error('Payment error:', err);
            alert('Payment failed. Please try again.');
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-12 w-12 rounded-2xl gradient-primary animate-pulse" />
            </div>
        );
    }

    if (paid || paymentStatus === 'success') {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="card max-w-sm w-full p-8 text-center animate-bounce-in">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                    <p className="mt-2 text-slate-400 text-sm">
                        Your session has been confirmed. Redirecting to classroom...
                    </p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'cancelled') {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="card max-w-sm w-full p-8 text-center animate-fade-in-up">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 mb-6">
                        <CreditCard className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Payment Cancelled</h2>
                    <p className="mt-2 text-slate-400 text-sm">
                        You can try again or go back to the dashboard.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={handlePayment}
                            className="flex-1 btn-primary text-sm !py-2.5"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex h-14 w-14 items-center justify-center mx-auto rounded-2xl gradient-primary text-white shadow-lg mb-4">
                    <CreditCard className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Complete Payment</h1>
                <p className="mt-2 text-slate-400 text-sm">Secure your tutoring session</p>
            </div>

            <div className="card p-6 space-y-6">
                {/* Tutor Info */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-warm text-xl font-bold text-white shadow-sm">
                        {tutorName ? tutorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {tutorName || 'Finding tutor...'}
                        </h3>
                        <p className="text-sm text-slate-400">Expert Tutor</p>
                    </div>
                </div>

                {/* Session Details */}
                <div className="space-y-4 rounded-2xl bg-slate-50 p-5">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Topic</span>
                        <span className="text-sm font-semibold text-slate-900">
                            <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600">
                                {topic}
                            </span>
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Duration</span>
                        <span className="text-sm font-semibold text-slate-900">{duration} minutes</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Session Type</span>
                        <span className="text-sm font-semibold text-slate-900">1-on-1 Live</span>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Total</span>
                            <span className="text-3xl font-black gradient-text">
                                ₹{tutorPrice || 200}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pay Button */}
                <button
                    onClick={handlePayment}
                    disabled={paying}
                    className="btn-primary w-full text-center text-sm flex items-center justify-center gap-2 !py-4 disabled:opacity-50"
                >
                    {paying ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Processing Payment...
                        </>
                    ) : (
                        <>
                            <Lock className="h-4 w-4" />
                            Pay ₹{tutorPrice || 200} Securely
                        </>
                    )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Powered by Stripe · 256-bit SSL Encrypted
                </div>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl gradient-primary animate-pulse" />
                </div>
            }
        >
            <PaymentContent />
        </Suspense>
    );
}
