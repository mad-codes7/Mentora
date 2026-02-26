'use client';

import Link from 'next/link';
import { BookOpen, Github, Twitter, Linkedin, Heart } from 'lucide-react';

const quickLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Find Tutors', href: '/find-tutor' },
    { label: 'My Doubts', href: '/doubts' },
    { label: 'Profile', href: '/profile' },
];

const socials = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Github, href: '#', label: 'GitHub' },
];

export default function Footer() {
    return (
        <footer className="relative overflow-hidden bg-neutral-950 mt-12">
            {/* Animated background blobs */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl animate-float pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10">
                <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
                    {/* Brand */}
                    <div className="flex flex-col items-center md:items-start gap-3 animate-fade-in-up">
                        <div className="flex items-center gap-2.5 group">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6">
                                <BookOpen className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">Mentora</span>
                        </div>
                        <p className="text-sm text-slate-400 max-w-xs text-center md:text-left">
                            Personalized 1-on-1 tutoring with AI-powered assessments.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        {quickLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm text-slate-400 font-medium transition-all hover:text-indigo-400 hover:-translate-y-0.5"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Socials */}
                    <div className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        {socials.map((social) => {
                            const Icon = social.icon;
                            return (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-all duration-300 hover:bg-indigo-500/20 hover:text-indigo-400 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10"
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                {/* Copyright */}
                <div className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-500">
                    <span>&copy; {new Date().getFullYear()} Mentora. Made with</span>
                    <Heart className="h-3 w-3 text-red-400 animate-pulse" />
                    <span>in India</span>
                </div>
            </div>
        </footer>
    );
}
