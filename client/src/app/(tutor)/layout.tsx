'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { useState } from 'react';
import { LayoutDashboard, User, BookOpen, Wallet, BarChart3, LogOut, ArrowLeftRight } from 'lucide-react';
import TutorNotificationProvider, { useTutorNotifications } from '@/features/tutor/TutorNotificationProvider';

const navItems = [
    { href: '/tutor', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tutor/sessions', label: 'Sessions', icon: BookOpen },
    { href: '/tutor/profile', label: 'Profile', icon: User },
    { href: '/tutor/wallet', label: 'Wallet', icon: Wallet },
    { href: '/tutor/analytics', label: 'Analytics', icon: BarChart3 },
];

// Badge component that shows pending session count
function SessionBadge() {
    const { pendingCount } = useTutorNotifications();
    if (pendingCount === 0) return null;
    return (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {pendingCount}
        </span>
    );
}

function TutorLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { firebaseUser, mentoraUser, loading, signOut } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const isRegisterPage = pathname === '/tutor/register';

    useEffect(() => {
        if (loading) return;
        if (!firebaseUser) {
            router.push('/login');
            return;
        }
        if (isRegisterPage) return;
        if (!mentoraUser || !mentoraUser.roles.includes('tutor')) {
            router.push('/tutor/register');
        }
    }, [firebaseUser, mentoraUser, loading, isRegisterPage, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!firebaseUser) return null;

    if (isRegisterPage) {
        return (
            <div className="min-h-screen py-12 px-4 hero-pattern" style={{ background: 'var(--bg)' }}>
                {children}
            </div>
        );
    }

    if (!mentoraUser || !mentoraUser.roles.includes('tutor')) return null;

    const getInitials = (name?: string | null) => {
        if (!name) return 'T';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen hero-pattern flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Navbar */}
            <nav className="sticky top-0 z-50 glass border-b border-white/20">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    {/* Logo */}
                    <Link href="/tutor" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-md transition-transform group-hover:scale-105">
                            <span className="text-lg font-bold text-white">M</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold gradient-text">Mentora</span>
                            <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Tutor</span>
                        </div>
                    </Link>

                    {/* Center Nav Links */}
                    <div className="hidden items-center gap-1 md:flex">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.href === '/tutor' ? pathname === '/tutor' : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'text-indigo-700 bg-indigo-50'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                    {item.href === '/tutor/sessions' && <SessionBadge />}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-primary" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {/* Switch to Student */}
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 transition-all hover:bg-indigo-100 hover:shadow-sm"
                        >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Student
                        </button>

                        {/* User Avatar Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white gradient-primary shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 ring-2 ring-white/80"
                            >
                                {getInitials(firebaseUser.displayName)}
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
                                                {firebaseUser.displayName || 'Tutor'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {firebaseUser.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                router.push('/dashboard');
                                                setShowDropdown(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors sm:hidden"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                            Student View
                                        </button>
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

export default function TutorLayout({ children }: { children: React.ReactNode }) {
    return (
        <TutorNotificationProvider>
            <TutorLayoutInner>{children}</TutorLayoutInner>
        </TutorNotificationProvider>
    );
}
