'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/common/AuthContext';
import {
    collection, query, where, getDocs, doc, getDoc,
    updateDoc, onSnapshot, arrayUnion
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Session } from '@/config/types';
import {
    Users, BookOpen, TrendingUp, CalendarDays,
    Inbox, GraduationCap, Star, AlertCircle, Link2,
    DollarSign, Search, CheckCircle2, Wifi, WifiOff,
    Loader2
} from 'lucide-react';

interface StudentInfo {
    uid: string;
    fullName: string;
    classLevel: string;
    examFocus: string[];
    parentCode?: string;
    isInSession?: boolean;
}

interface ProgressEntry {
    topic: string;
    preScore: number;
    postScore: number;
}

export default function ParentDashboard() {
    const { mentoraUser, firebaseUser, refreshUserData } = useAuth();
    const [linkedStudents, setLinkedStudents] = useState<StudentInfo[]>([]);
    const [studentSessions, setStudentSessions] = useState<Session[]>([]);
    const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Link student state
    const [parentCode, setParentCode] = useState('');
    const [linking, setLinking] = useState(false);
    const [linkSuccess, setLinkSuccess] = useState('');
    const [linkError, setLinkError] = useState('');

    // Spending
    const [totalSpent, setTotalSpent] = useState(0);

    const parentName = mentoraUser?.profile?.fullName?.split(' ')[0] || 'Parent';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // ── Link Student Handler ──
    const handleLinkStudent = async () => {
        if (!parentCode.trim() || !firebaseUser) return;
        setLinking(true);
        setLinkError('');
        setLinkSuccess('');

        try {
            // Find student by parentCode
            const usersQuery = query(
                collection(db, 'users'),
                where('studentData.parentCode', '==', parentCode.trim())
            );
            const snap = await getDocs(usersQuery);

            if (snap.empty) {
                setLinkError('No student found with that code. Please check and try again.');
                setLinking(false);
                return;
            }

            const studentDoc = snap.docs[0];
            const studentId = studentDoc.id;

            // Check if already linked
            const currentLinked = mentoraUser?.parentData?.linkedStudentIds || [];
            if (currentLinked.includes(studentId)) {
                setLinkError('This student is already linked to your account.');
                setLinking(false);
                return;
            }

            // Update parent doc
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
                'parentData.linkedStudentIds': arrayUnion(studentId),
            });

            // Update student doc
            await updateDoc(doc(db, 'users', studentId), {
                'studentData.linkedParentIds': arrayUnion(firebaseUser.uid),
            });

            const sData = studentDoc.data();
            setLinkSuccess(`Successfully linked ${sData.profile?.fullName || 'Student'}!`);
            setParentCode('');

            // Refresh data
            await refreshUserData();
            // fetchParentData will re-run via useEffect
        } catch (err) {
            console.error('Error linking student:', err);
            setLinkError('Failed to link student. Please try again.');
        } finally {
            setLinking(false);
        }
    };

    // ── Fetch Data ──
    const fetchParentData = useCallback(async () => {
        if (!mentoraUser) return;

        try {
            setLoading(true);
            setError(null);

            const linkedIds = mentoraUser.parentData?.linkedStudentIds || [];

            if (linkedIds.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch linked student info
            const students: StudentInfo[] = [];
            for (const sid of linkedIds) {
                try {
                    const studentDoc = await getDoc(doc(db, 'users', sid));
                    if (studentDoc.exists()) {
                        const data = studentDoc.data();
                        students.push({
                            uid: sid,
                            fullName: data.profile?.fullName || data.displayName || 'Student',
                            classLevel: data.studentData?.classLevel || 'N/A',
                            examFocus: data.studentData?.examFocus || [],
                            parentCode: data.studentData?.parentCode,
                            isInSession: false,
                        });
                    }
                } catch {
                    // Skip failed lookups
                }
            }
            setLinkedStudents(students);

            // Fetch sessions for all linked students
            if (linkedIds.length > 0) {
                const sessionsQuery = query(
                    collection(db, 'sessions'),
                    where('studentId', 'in', linkedIds)
                );
                const sessionsSnap = await getDocs(sessionsQuery);
                const sessions = sessionsSnap.docs.map(d => ({
                    sessionId: d.id,
                    ...d.data(),
                })) as Session[];

                // Sort by createdAt descending
                sessions.sort((a, b) => {
                    const timeA = a.createdAt?.toDate?.()?.getTime?.() || 0;
                    const timeB = b.createdAt?.toDate?.()?.getTime?.() || 0;
                    return timeB - timeA;
                });

                setStudentSessions(sessions.slice(0, 10));

                // Calculate total spending
                const paidSessions = sessions.filter(s => s.paymentStatus === 'success');
                const spent = paidSessions.reduce((sum, s) => {
                    return sum + (s.durationLimitMinutes || 60) * (200 / 60); // approximate
                }, 0);
                setTotalSpent(Math.round(spent));

                // Fetch assessment progress
                const assessQuery = query(
                    collection(db, 'assessments'),
                    where('userId', 'in', linkedIds)
                );
                const assessSnap = await getDocs(assessQuery);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assessments = assessSnap.docs.map(d => d.data()) as any[];

                const bySession: Record<string, { pre?: number; post?: number; topic?: string }> = {};
                assessments.forEach(a => {
                    const key = a.sessionId || 'unknown';
                    if (!bySession[key]) bySession[key] = {};
                    const pct = a.scoreData?.totalScore != null && a.scoreData?.maxScore
                        ? Math.round((a.scoreData.totalScore / a.scoreData.maxScore) * 100)
                        : 0;
                    if (a.type === 'pre_session') {
                        bySession[key].pre = pct;
                        bySession[key].topic = a.topic;
                    } else {
                        bySession[key].post = pct;
                    }
                });

                const progress = Object.values(bySession)
                    .filter(v => v.pre !== undefined || v.post !== undefined)
                    .map(v => ({
                        topic: v.topic || 'Quiz',
                        preScore: v.pre || 0,
                        postScore: v.post || 0,
                    }))
                    .slice(0, 6);

                setProgressData(progress);
            }
        } catch (err) {
            console.error('Error fetching parent data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [mentoraUser]);

    useEffect(() => {
        fetchParentData();
    }, [fetchParentData]);

    // ── Live Session Status Listener ──
    useEffect(() => {
        const linkedIds = mentoraUser?.parentData?.linkedStudentIds || [];
        if (linkedIds.length === 0) return;

        // Listen for in_progress sessions for linked students
        const sessionsQuery = query(
            collection(db, 'sessions'),
            where('studentId', 'in', linkedIds),
            where('status', '==', 'in_progress')
        );

        const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
            const activeStudentIds = new Set(snapshot.docs.map(d => d.data().studentId));
            setLinkedStudents(prev =>
                prev.map(s => ({
                    ...s,
                    isInSession: activeStudentIds.has(s.uid),
                }))
            );
        });

        return () => unsubscribe();
    }, [mentoraUser?.parentData?.linkedStudentIds]);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; label: string }> = {
            completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Completed' },
            in_progress: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress' },
            paid_waiting: { bg: 'bg-violet-50', text: 'text-violet-600', label: 'Waiting' },
            pending_payment: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Payment Pending' },
            searching: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Searching' },
            cancelled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' },
        };
        const s = styles[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
        return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
                {s.label}
            </span>
        );
    };

    const linkedIds = mentoraUser?.parentData?.linkedStudentIds || [];
    const completedCount = studentSessions.filter(s => s.status === 'completed').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#d97706' }} />
                    <p className="text-sm text-slate-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ── Hero Card ── */}
            <div className="relative overflow-hidden rounded-3xl p-8 text-white shadow-xl animate-fade-in-up"
                style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 40%, #92400e 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
                <div className="absolute top-6 right-8 w-20 h-20 rounded-2xl bg-white/10 rotate-12 animate-float" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <p className="text-amber-200 text-sm font-medium">{greeting}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight">
                            {parentName}, here&apos;s your child&apos;s progress
                        </h1>
                        <p className="mt-2 text-amber-200 max-w-lg">
                            Monitor tutoring sessions, track progress, and stay connected to your child&apos;s learning journey.
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-center flex flex-col items-center">
                            <Users className="h-5 w-5 text-amber-200 mb-1" />
                            <p className="text-2xl font-bold">{linkedStudents.length}</p>
                            <p className="text-xs text-amber-200 mt-0.5">Linked</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <BookOpen className="h-5 w-5 text-amber-200 mb-1" />
                            <p className="text-2xl font-bold">{studentSessions.length}</p>
                            <p className="text-xs text-amber-200 mt-0.5">Sessions</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <DollarSign className="h-5 w-5 text-amber-200 mb-1" />
                            <p className="text-2xl font-bold">₹{totalSpent}</p>
                            <p className="text-xs text-amber-200 mt-0.5">Spent</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center flex flex-col items-center">
                            <Star className="h-5 w-5 text-amber-200 mb-1" />
                            <p className="text-2xl font-bold">{completedCount}</p>
                            <p className="text-xs text-amber-200 mt-0.5">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Link Student Card ── */}
            <div className="card p-6 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                    <Link2 className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Link a Student</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Enter your child&apos;s 6-digit parent code from their profile to link their account.
                </p>
                <div className="flex gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={parentCode}
                            onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A3F9K2"
                            maxLength={6}
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleLinkStudent}
                        disabled={linking || parentCode.trim().length === 0}
                        className="rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                    >
                        {linking ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Linking...</>
                        ) : (
                            <>Link Student</>
                        )}
                    </button>
                </div>
                {linkSuccess && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5">
                        <CheckCircle2 className="h-4 w-4" /> {linkSuccess}
                    </div>
                )}
                {linkError && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                        <AlertCircle className="h-4 w-4" /> {linkError}
                    </div>
                )}
            </div>

            {error && (
                <div className="card p-6 border-red-100">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* ── Linked Students with Live Status ── */}
            {linkedStudents.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="h-4 w-4 text-amber-600" />
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Linked Students</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {linkedStudents.map((student) => (
                            <div key={student.uid} className="card p-5 card-interactive">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="relative">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                                            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                                            {student.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>
                                        {/* Live Status Indicator */}
                                        <div className={`absolute -bottom-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full border-2 border-white ${student.isInSession ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            {student.isInSession
                                                ? <Wifi className="h-3 w-3 text-white" />
                                                : <WifiOff className="h-2.5 w-2.5 text-white" />
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{student.fullName}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-slate-400">{student.classLevel}</p>
                                            {student.isInSession && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 animate-pulse">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    In Session
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {student.examFocus.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {student.examFocus.slice(0, 3).map((exam) => (
                                            <span key={exam} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                {exam}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── No Linked Students ── */}
            {linkedIds.length === 0 && (
                <div className="card p-10 text-center animate-fade-in-up">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 mb-6">
                        <Link2 className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                        Link Your Child&apos;s Account
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-2">
                        Ask your child to share their 6-digit parent code from their profile page.
                        Use the form above to link their account.
                    </p>
                </div>
            )}

            {/* ── Recent Sessions ── */}
            {linkedIds.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarDays className="h-4 w-4 text-amber-600" />
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Sessions</h2>
                    </div>
                    <div className="card p-6">
                        {studentSessions.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 animate-float">
                                    <Inbox className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="mt-4 text-sm font-medium text-slate-500">No sessions yet</p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Sessions will appear here when your child starts learning
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Topic</th>
                                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentSessions.map((session) => (
                                            <tr key={session.sessionId} className="border-b border-slate-50 transition-colors hover:bg-amber-50/50 group">
                                                <td className="px-3 py-3.5 font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                                                    {session.topic}
                                                </td>
                                                <td className="px-3 py-3.5 text-slate-500">
                                                    {session.meetingType === 'on_demand' ? 'On-Demand' : 'Scheduled'}
                                                </td>
                                                <td className="px-3 py-3.5 text-slate-500">{session.durationLimitMinutes} min</td>
                                                <td className="px-3 py-3.5">{getStatusBadge(session.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Progress Overview ── */}
            {progressData.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Assessment Progress</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {progressData.map((entry, i) => {
                            const improvement = entry.postScore - entry.preScore;
                            return (
                                <div key={i} className="card p-5">
                                    <p className="font-bold text-slate-900 mb-3">{entry.topic}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400 mb-1">Pre-Test</p>
                                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${entry.preScore}%` }} />
                                            </div>
                                            <p className="text-xs font-bold text-amber-600 mt-1">{entry.preScore}%</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400 mb-1">Post-Test</p>
                                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${entry.postScore}%` }} />
                                            </div>
                                            <p className="text-xs font-bold text-emerald-600 mt-1">{entry.postScore}%</p>
                                        </div>
                                    </div>
                                    {entry.postScore > 0 && (
                                        <p className={`text-xs font-bold mt-2 ${improvement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement)}% change
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
