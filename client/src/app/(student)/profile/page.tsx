'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/common/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
    User, Mail, GraduationCap, Target, BookOpen, Clock,
    TrendingUp, Save, ChevronRight, Copy, Check, Users,
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'College'];
const EXAM_OPTIONS = ['JEE Main', 'JEE Advanced', 'NEET', 'CBSE Boards', 'ICSE Boards', 'SAT', 'Olympiad', 'CUET'];

export default function ProfilePage() {
    const { firebaseUser, mentoraUser } = useAuth();

    const [fullName, setFullName] = useState('');
    const [classLevel, setClassLevel] = useState('');
    const [examFocus, setExamFocus] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editing, setEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Stats
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalAssessments, setTotalAssessments] = useState(0);
    const [avgScore, setAvgScore] = useState(0);

    useEffect(() => {
        if (mentoraUser) {
            setFullName(mentoraUser.profile?.fullName || '');
            setClassLevel(mentoraUser.studentData?.classLevel || '');
            setExamFocus(mentoraUser.studentData?.examFocus || []);
        }
    }, [mentoraUser]);

    const [parentCode, setParentCode] = useState<string | undefined>(
        mentoraUser?.studentData?.parentCode
    );

    // Auto-generate parentCode for existing students who don't have one
    useEffect(() => {
        const ensureParentCode = async () => {
            if (!firebaseUser || !mentoraUser?.studentData) return;
            if (mentoraUser.studentData.parentCode) {
                setParentCode(mentoraUser.studentData.parentCode);
                return;
            }
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), {
                    'studentData.parentCode': code,
                });
                setParentCode(code);
            } catch (err) {
                console.error('Error generating parent code:', err);
            }
        };
        ensureParentCode();
    }, [firebaseUser, mentoraUser]);

    const copyCode = () => {
        if (parentCode) {
            navigator.clipboard.writeText(parentCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            if (!firebaseUser) return;

            try {
                const sessionsSnap = await getDocs(
                    query(collection(db, 'sessions'), where('studentId', '==', firebaseUser.uid), where('status', '==', 'completed'))
                );
                setTotalSessions(sessionsSnap.size);

                const assessSnap = await getDocs(
                    query(collection(db, 'assessments'), where('userId', '==', firebaseUser.uid))
                );
                setTotalAssessments(assessSnap.size);

                if (assessSnap.size > 0) {
                    let totalPct = 0;
                    assessSnap.docs.forEach((d) => {
                        const data = d.data();
                        totalPct += (data.scoreData.totalScore / data.scoreData.maxScore) * 100;
                    });
                    setAvgScore(Math.round(totalPct / assessSnap.size));
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            }
        };
        fetchStats();
    }, [firebaseUser]);

    const toggleExam = (exam: string) => {
        setExamFocus((prev) =>
            prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
        );
    };

    const handleSave = async () => {
        if (!firebaseUser) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
                'profile.fullName': fullName,
                'studentData.classLevel': classLevel,
                'studentData.examFocus': examFocus,
            });
            setSaved(true);
            setEditing(false);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Error saving profile:', err);
        } finally {
            setSaving(false);
        }
    };

    const joinedDate = mentoraUser?.profile?.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
    }) || '';

    const stats = [
        { icon: BookOpen, label: 'Sessions', value: totalSessions, color: 'from-indigo-500 to-blue-500' },
        { icon: Target, label: 'Assessments', value: totalAssessments, color: 'from-emerald-500 to-teal-500' },
        { icon: TrendingUp, label: 'Avg Score', value: `${avgScore}%`, color: 'from-amber-500 to-orange-500' },
    ];

    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in-up">
            {/* Profile Header Card */}
            <div className="card overflow-hidden">
                <div className="gradient-hero p-8 pb-20 relative">
                    <div className="absolute top-4 right-6 w-24 h-24 rounded-full bg-white/10 animate-float" />
                    <div className="absolute bottom-6 left-1/3 w-16 h-16 rounded-2xl bg-white/5 rotate-12" />
                </div>
                <div className="px-8 pb-8 -mt-14 relative z-10">
                    <div className="flex items-end gap-5">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl gradient-primary text-3xl font-bold text-white shadow-xl ring-4 ring-white">
                            {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                        </div>
                        <div className="mb-1">
                            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1 text-sm text-slate-400">
                                    <Mail className="h-3.5 w-3.5" />
                                    {mentoraUser?.profile?.email}
                                </span>
                                {joinedDate && (
                                    <span className="flex items-center gap-1 text-sm text-slate-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        Joined {joinedDate}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="card p-5 text-center">
                            <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-sm mb-3`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Parent Linking Code */}
            {parentCode && (
                <div className="card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent Linking Code</p>
                            <p className="text-2xl font-black tracking-[0.3em] text-slate-900 mt-0.5">{parentCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={copyCode}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${copied
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            )}

            {/* Profile Details */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
                    </div>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Edit <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary text-sm flex items-center gap-1.5 !py-2 !px-4"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>

                {saved && (
                    <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600 border border-emerald-100 animate-scale-in font-medium">
                        Profile updated successfully!
                    </div>
                )}

                <div className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full Name</label>
                        {editing ? (
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-styled"
                            />
                        ) : (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-700 font-medium">{fullName || '—'}</p>
                        )}
                    </div>

                    {/* Class Level */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            <GraduationCap className="inline h-4 w-4 mr-1 text-slate-400" />
                            Class Level
                        </label>
                        {editing ? (
                            <div className="grid grid-cols-4 gap-2">
                                {CLASS_OPTIONS.map((cls) => (
                                    <button
                                        key={cls}
                                        type="button"
                                        onClick={() => setClassLevel(cls)}
                                        className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${classLevel === cls
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                    >
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-700 font-medium">{classLevel || '—'}</p>
                        )}
                    </div>

                    {/* Exam Focus */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            <Target className="inline h-4 w-4 mr-1 text-slate-400" />
                            Exam Focus
                        </label>
                        {editing ? (
                            <div className="flex flex-wrap gap-2">
                                {EXAM_OPTIONS.map((exam) => (
                                    <button
                                        key={exam}
                                        type="button"
                                        onClick={() => toggleExam(exam)}
                                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all ${examFocus.includes(exam)
                                            ? 'gradient-primary text-white border-transparent shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        {exam}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {examFocus.length > 0 ? examFocus.map((exam) => (
                                    <span key={exam} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">
                                        {exam}
                                    </span>
                                )) : <p className="text-slate-400 text-sm">No exams selected</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
