'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { useState } from 'react';
import { LayoutDashboard, LogOut, ArrowLeftRight, BarChart3, UserCheck } from 'lucide-react';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { firebaseUser, mentoraUser, loading, signOut } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const isLoginPage = pathname === '/parent/login' || pathname === '/parent/signup';

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#d97706' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    // Pass-through for login/signup pages
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Not logged in → show login prompt
    if (!firebaseUser) {
        return (
            <div className="flex min-h-screen items-center justify-center hero-pattern" style={{ background: 'var(--bg)' }}>
                <div className="max-w-md w-full px-6 text-center animate-fade-in-up">
                    <span className="text-5xl block mb-4">👨‍👩‍👧</span>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Parent Portal</h1>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                        Log in or sign up to monitor your child&apos;s learning
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => router.push('/parent/login')}
                            className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105"
                            style={{ background: '#d97706' }}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => router.push('/signup?role=parent')}
                            className="rounded-xl border-2 px-8 py-3 text-sm font-bold transition-all hover:scale-105"
                            style={{ borderColor: '#d97706', color: '#d97706' }}
                        >
                            Sign Up
                        </button>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="mt-6 text-xs font-medium hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Logged in but not a parent → redirect to profile-setup
    if (!mentoraUser || !mentoraUser.roles.includes('parent')) {
        router.push('/profile-setup');
        return null;
    }

    const getInitials = (name?: string | null) => {
        if (!name) return 'P';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <div className="min-h-screen hero-pattern flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Navbar */}
            <nav className="sticky top-0 z-50 glass border-b border-white/20">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Logo */}
                    <Link href="/parent" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                            <span className="text-lg font-bold text-white">M</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold gradient-text">Mentora</span>
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Parent</span>
                        </div>
                    </Link>

                    {/* Center Nav */}
                    <div className="hidden items-center gap-1 md:flex">
                        <Link
                            href="/parent"
                            className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === '/parent'
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                            {pathname === '/parent' && (
                                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }} />
                            )}
                        </Link>
                        <Link
                            href="/parent/analytics"
                            className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === '/parent/analytics'
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <BarChart3 className="h-4 w-4" />
                            Analytics
                            {pathname === '/parent/analytics' && (
                                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }} />
                            )}
                        </Link>
                        <Link
                            href="/parent/reviews"
                            className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === '/parent/reviews'
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <UserCheck className="h-4 w-4" />
                            Reviews
                            {pathname === '/parent/reviews' && (
                                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }} />
                            )}
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {/* Switch to Student */}
                        {mentoraUser.roles.includes('student') && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-100 transition-all hover:bg-amber-100 hover:shadow-sm"
                            >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Student
                            </button>
                        )}

                        {/* User Avatar Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 ring-2 ring-white/80"
                                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                            >
                                {getInitials(mentoraUser.profile?.fullName)}
                            </button>

                            {showDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowDropdown(false)}
                                    />
                                    <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl bg-white py-2 shadow-xl border border-slate-100 animate-slide-down">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <p className="text-sm font-bold text-slate-900">
                                                {mentoraUser.profile?.fullName || 'Parent'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {mentoraUser.profile?.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-2xl"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
    );
}
