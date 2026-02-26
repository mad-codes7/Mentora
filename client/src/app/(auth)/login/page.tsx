'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/common/AuthContext';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MentoraUser } from '@/config/types';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signInWithGoogle } = useAuth();
    const router = useRouter();

    const redirectUser = async (uid: string, displayName?: string | null, userEmail?: string | null) => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
            const userData: Omit<MentoraUser, 'uid'> = {
                roles: ['student'],
                profile: {
                    fullName: displayName || 'User',
                    email: userEmail || '',
                    createdAt: Timestamp.now(),
                },
                studentData: {
                    classLevel: '',
                    examFocus: [],
                    linkedParentIds: [],
                },
                tutorData: null,
                parentData: null,
            };
            await setDoc(doc(db, 'users', uid), userData);
            router.push('/profile-setup');
        } else {
            const data = userDoc.data();
            if (!data?.studentData?.classLevel) {
                router.push('/profile-setup');
            } else {
                router.push('/dashboard');
            }
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
            const { currentUser } = await import('@/config/firebase').then(m => m.auth);
            if (currentUser) await redirectUser(currentUser.uid);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/user-not-found') {
                setError('No account found. Please sign up first.');
            } else if (firebaseError.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else if (firebaseError.code === 'auth/invalid-credential') {
                setError('Invalid credentials. Please check your email and password.');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const user = await signInWithGoogle();
            await redirectUser(user.uid, user.displayName, user.email);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === 'auth/popup-closed-by-user') {
                // User closed popup
            } else {
                setError('Google sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Side — Gradient Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero items-center justify-center p-12">
                {/* Decorative shapes */}
                <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10 animate-float" />
                <div className="absolute bottom-24 right-16 w-48 h-48 rounded-3xl bg-white/5 rotate-12" />
                <div className="absolute top-1/3 right-10 w-20 h-20 rounded-2xl bg-white/10 -rotate-6" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-12 left-1/3 w-24 h-24 rounded-full bg-white/5" />

                <div className="relative z-10 text-white max-w-md">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-8 shadow-lg">
                        <span className="text-3xl font-bold">M</span>
                    </div>
                    <h2 className="text-4xl font-bold leading-tight">
                        Learn from the best,<br />
                        <span className="text-indigo-200">anytime, anywhere.</span>
                    </h2>
                    <p className="mt-4 text-indigo-200 text-lg leading-relaxed">
                        Connect with expert tutors for personalized 1-on-1 live sessions.
                        AI-powered assessments track your progress.
                    </p>

                    {/* Trust signals */}
                    <div className="mt-10 flex items-center gap-6">
                        <div className="flex -space-x-2">
                            {['#818CF8', '#60A5FA', '#34D399', '#FBBF24'].map((color, i) => (
                                <div key={i} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 text-xs font-bold text-white" style={{ backgroundColor: color }}>
                                    {['A', 'B', 'C', 'D'][i]}
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">10,000+ students</p>
                            <p className="text-xs text-indigo-200">already learning on Mentora</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side — Login Form */}
            <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md animate-fade-in-up">
                    {/* Mobile Logo */}
                    <div className="mb-8 text-center lg:text-left">
                        <div className="flex items-center gap-2.5 justify-center lg:justify-start mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white font-bold text-lg shadow-md">
                                M
                            </div>
                            <span className="text-2xl font-bold gradient-text">Mentora</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Welcome back
                        </h1>
                        <p className="mt-2 text-slate-400">
                            Sign in to continue learning
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100 animate-scale-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full text-sm text-center disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-7 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">OR</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Google OAuth */}
                    <button
                        onClick={handleGoogleLogin}
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

                    {/* Sign Up Link */}
                    <p className="mt-8 text-center text-sm text-slate-400">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/signup"
                            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
