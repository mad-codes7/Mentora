'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/common/AuthContext';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MentoraUser } from '@/config/types';
import { GraduationCap, Users, DollarSign, BarChart3, Shield } from 'lucide-react';

export default function TutorSignupPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    const createUserDoc = async (uid: string, userEmail: string, name: string) => {
        const userData: Omit<MentoraUser, 'uid'> = {
            roles: ['tutor'],
            profile: {
                fullName: name,
                email: userEmail,
                createdAt: Timestamp.now(),
            },
            studentData: null,
            tutorData: null,
            parentData: null,
        };
        await setDoc(doc(db, 'users', uid), userData);
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const user = await signUp(email, password);
            await createUserDoc(user.uid, email, fullName);
            router.push('/tutor/basic-info');
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Try logging in.');
            } else if (firebaseError.code === 'auth/weak-password') {
                setError('Password is too weak. Use at least 6 characters.');
            } else {
                setError('Signup failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        setLoading(true);
        try {
            const user = await signInWithGoogle();
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                await createUserDoc(user.uid, user.email || '', user.displayName || 'Tutor');
                router.push('/tutor/basic-info');
            } else {
                const data = userDoc.data();
                const roles: string[] = data?.roles || [];
                if (roles.includes('tutor')) {
                    if (data?.tutorBasicInfo) {
                        router.push('/tutor');
                    } else {
                        router.push('/tutor/basic-info');
                    }
                } else {
                    // Add tutor role to existing user
                    await setDoc(doc(db, 'users', user.uid), {
                        ...data,
                        roles: [...roles, 'tutor'],
                    }, { merge: true });
                    router.push('/tutor/basic-info');
                }
            }
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code !== 'auth/popup-closed-by-user') {
                setError(`Google sign-up failed: ${firebaseError.code || firebaseError.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: GraduationCap, text: 'Teach students 1-on-1 in live sessions' },
        { icon: DollarSign, text: 'Set your own hourly rates & earn' },
        { icon: BarChart3, text: 'Track your analytics & ratings' },
        { icon: Shield, text: 'Get verified with our quick quiz' },
        { icon: Users, text: 'Build your student base on Mentora' },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Left Side — Emerald Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%)' }}
            >
                <div className="absolute top-16 right-20 w-36 h-36 rounded-full bg-white/10 animate-float" />
                <div className="absolute bottom-20 left-12 w-44 h-44 rounded-3xl bg-white/5 rotate-12" />
                <div className="absolute top-1/2 left-10 w-20 h-20 rounded-2xl bg-white/10 -rotate-6" />
                <div className="absolute bottom-10 right-1/4 w-28 h-28 rounded-full bg-white/5" />

                <div className="relative z-10 text-white max-w-md">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-8 shadow-lg">
                        <span className="text-3xl font-bold">M</span>
                    </div>
                    <h2 className="text-4xl font-bold leading-tight">
                        Teach, inspire &<br />
                        <span className="text-emerald-200">earn on your terms.</span>
                    </h2>
                    <p className="mt-4 text-emerald-200 text-lg leading-relaxed">
                        Join Mentora as a tutor and connect with students looking for
                        personalized 1-on-1 learning sessions.
                    </p>

                    {/* Features */}
                    <div className="mt-10 space-y-4">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                                        <Icon className="h-5 w-5 text-emerald-200" />
                                    </div>
                                    <span className="text-sm font-medium text-emerald-100">{feature.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Side — Signup Form */}
            <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md animate-fade-in-up">
                    {/* Header */}
                    <div className="mb-8 text-center lg:text-left">
                        <div className="flex items-center gap-2.5 justify-center lg:justify-start mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-lg shadow-md"
                                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                            >
                                M
                            </div>
                            <span className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #059669, #047857)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Mentora Tutor
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Create your tutor account
                        </h1>
                        <p className="mt-2 text-slate-400">
                            Start teaching and earning today
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100 animate-scale-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailSignup} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-styled"
                                placeholder="Dr. Jane Smith"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-styled"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-styled"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-styled"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                        >
                            {loading ? 'Creating account...' : 'Create Tutor Account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">OR</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Google OAuth */}
                    <button
                        onClick={handleGoogleSignup}
                        disabled={loading}
                        className="btn-secondary w-full flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Login Link */}
                    <p className="mt-8 text-center text-sm text-slate-400">
                        Already have a tutor account?{' '}
                        <Link
                            href="/tutor/login"
                            className="font-semibold transition-colors"
                            style={{ color: '#059669' }}
                        >
                            Sign In
                        </Link>
                    </p>

                    {/* Back to Home */}
                    <p className="mt-3 text-center text-xs text-slate-400">
                        <Link href="/" className="hover:underline">
                            ← Back to Home
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
