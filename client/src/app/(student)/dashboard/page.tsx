'use client';

import { useAuth } from '@/common/AuthContext';
import TopicSelector from '@/features/student/TopicSelector';
import DoubtUpload from '@/features/student/DoubtUpload';
import UpcomingSessions from '@/features/student/UpcomingSessions';
import SessionHistory from '@/features/student/SessionHistory';
import ProgressCharts from '@/features/student/ProgressCharts';
import { BookOpen, Users, Star, Zap, BarChart3 } from 'lucide-react';

export default function StudentDashboard() {
    const { mentoraUser } = useAuth();
    const firstName = mentoraUser?.profile?.fullName?.split(' ')[0] || 'Student';

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="space-y-8">
            {/* ── Hero Card ── */}
            <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white shadow-xl animate-fade-in-up">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
                <div className="absolute top-6 right-8 w-20 h-20 rounded-2xl bg-white/10 rotate-12 animate-float" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium">{greeting}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight">
                            {firstName}, let&apos;s learn something amazing!
                        </h1>
                        <p className="mt-2 text-indigo-200 max-w-lg">
                            Connect with expert tutors for personalized 1-on-1 sessions.
                            Start by selecting a topic below.
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-center flex flex-col items-center">
                            <BookOpen className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">10k+</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Sessions</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <Users className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">500+</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Tutors</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <Star className="h-5 w-5 text-indigo-200 mb-1" />
                            <p className="text-2xl font-bold">4.9</p>
                            <p className="text-xs text-indigo-200 mt-0.5">Rating</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <TopicSelector />
                    <DoubtUpload />
                </div>
            </section>

            {/* ── Activity & Progress ── */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Activity & Progress</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <UpcomingSessions />
                    <ProgressCharts />
                </div>
            </section>

            {/* ── History ── */}
            <section>
                <SessionHistory />
            </section>
        </div>
    );
}
