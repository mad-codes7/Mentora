'use client';

import Link from 'next/link';
import { useAuth } from '@/common/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, History, ArrowLeftRight, LogOut, Bell, HelpCircle, User } from 'lucide-react';

export default function Navbar() {
    const { mentoraUser, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showDropdown, setShowDropdown] = useState(false);

    const isTutor = mentoraUser?.roles.includes('tutor');
    const isOnTutorDashboard = pathname.startsWith('/tutor');

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const navLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/history', label: 'History', icon: History },
        { href: '/doubts', label: 'Doubts', icon: HelpCircle },
    ];

    return (
        <nav className="sticky top-0 z-50 glass border-b border-white/20">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-md transition-transform group-hover:scale-105">
                        <span className="text-lg font-bold text-white">M</span>
                    </div>
                    <span className="text-xl font-bold gradient-text">Mentora</span>
                </Link>

                {/* Center Nav Links */}
                <div className="hidden items-center gap-1 md:flex">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${pathname === link.href
                                    ? 'text-indigo-700 bg-indigo-50'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                                {pathname === link.href && (
                                    <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-primary" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2">
                    {/* Notifications Bell */}
                    <Link
                        href="/notifications"
                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${pathname === '/notifications'
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            }`}
                    >
                        <Bell className="h-5 w-5" />
                    </Link>

                    {/* Profile */}
                    <Link
                        href="/profile"
                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${pathname === '/profile'
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            }`}
                    >
                        <User className="h-5 w-5" />
                    </Link>
                    {/* Role Toggle */}
                    {isTutor && (
                        <button
                            onClick={() =>
                                router.push(isOnTutorDashboard ? '/dashboard' : '/tutor')
                            }
                            className="hidden sm:flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 transition-all hover:bg-indigo-100 hover:shadow-sm"
                        >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            {isOnTutorDashboard ? 'Student' : 'Tutor'}
                        </button>
                    )}

                    {/* User Avatar Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white gradient-primary shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 ring-2 ring-white/80"
                        >
                            {mentoraUser?.profile?.fullName
                                ? getInitials(mentoraUser.profile.fullName)
                                : '?'}
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
                                            {mentoraUser?.profile?.fullName}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {mentoraUser?.profile?.email}
                                        </p>
                                    </div>

                                    {isTutor && (
                                        <button
                                            onClick={() => {
                                                router.push(
                                                    isOnTutorDashboard ? '/dashboard' : '/tutor/dashboard'
                                                );
                                                setShowDropdown(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors sm:hidden"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                            {isOnTutorDashboard ? 'Student View' : 'Tutor Dashboard'}
                                        </button>
                                    )}

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
    );
}
