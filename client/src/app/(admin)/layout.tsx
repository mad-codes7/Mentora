'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { firebaseUser, mentoraUser, loading, signOut } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#dc2626' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in → show login prompt
    if (!firebaseUser) {
        return (
            <div className="flex min-h-screen items-center justify-center hero-pattern" style={{ background: 'var(--bg)' }}>
                <div className="max-w-md w-full px-6 text-center animate-fade-in-up">
                    <span className="text-5xl block mb-4">🛡️</span>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Admin Portal</h1>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                        Log in to access the admin dashboard
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105"
                        style={{ background: '#dc2626' }}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="block mx-auto mt-6 text-xs font-medium hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const getInitials = (name?: string | null) => {
        if (!name) return 'A';
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
                    <Link href="/admin" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold gradient-text">Mentora</span>
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Admin</span>
                        </div>
                    </Link>

                    {/* Center Nav */}
                    <div className="hidden items-center gap-1 md:flex">
                        <Link
                            href="/admin"
                            className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === '/admin'
                                ? 'text-red-700 bg-red-50'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                            {pathname === '/admin' && (
                                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }} />
                            )}
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {/* Switch to Student */}
                        {mentoraUser?.roles?.includes('student') && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 transition-all hover:bg-indigo-100 hover:shadow-sm"
                            >
                                Student
                            </button>
                        )}

                        {/* User Avatar Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 ring-2 ring-white/80"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
                            >
                                {getInitials(mentoraUser?.profile?.fullName)}
                            </button>

                            {showDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                    <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl bg-white py-2 shadow-xl border border-slate-100 animate-slide-down">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <p className="text-sm font-bold text-slate-900">
                                                {mentoraUser?.profile?.fullName || 'Admin'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {mentoraUser?.profile?.email || firebaseUser.email}
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
