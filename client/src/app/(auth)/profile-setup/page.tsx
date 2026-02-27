'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CLASS_LEVELS = [
    '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
    '11th Grade', '12th Grade', 'Undergraduate', 'Postgraduate',
];

const EXAM_FOCUSES = [
    'JEE Main', 'JEE Advanced', 'NEET', 'CBSE Board',
    'ICSE Board', 'State Board', 'SAT', 'GRE', 'GATE', 'CAT', 'Other',
];

export default function ProfileSetupPage() {
    const { firebaseUser, mentoraUser, loading: authLoading, refreshUserData } = useAuth();
    const router = useRouter();
    const [classLevel, setClassLevel] = useState('');
    const [examFocus, setExamFocus] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Default to student if role not yet loaded
    const isStudent = !mentoraUser || mentoraUser.roles.includes('student');
    const isParent = mentoraUser?.roles.includes('parent') && !mentoraUser?.roles.includes('student');

    // Parent linking
    const [studentCode, setStudentCode] = useState('');
    const [codeError, setCodeError] = useState('');

    useEffect(() => {
        if (mentoraUser?.studentData?.classLevel) {
            router.push('/dashboard');
        }
        if (isParent && mentoraUser?.parentData?.linkedStudentIds?.length) {
            router.push('/parent');
        }
    }, [mentoraUser, isParent, router]);

    const toggleExamFocus = (exam: string) => {
        setExamFocus((prev) =>
            prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
        );
    };

    const generateParentCode = (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;
        setLoading(true);
        setCodeError('');

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);

            if (isStudent) {
                const parentCode = generateParentCode();
                await updateDoc(userRef, {
                    'studentData.classLevel': classLevel,
                    'studentData.examFocus': examFocus,
                    'studentData.parentCode': parentCode,
                });
            }

            if (isParent && studentCode.trim()) {
                // Look up student by their 6-digit parent code
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('studentData.parentCode', '==', studentCode.trim())
                );
                const snapshot = await getDocs(studentsQuery);

                if (snapshot.empty) {
                    setCodeError('No student found with this code. Please check and try again.');
                    setLoading(false);
                    return;
                }

                const studentUid = snapshot.docs[0].id;
                await updateDoc(userRef, {
                    'parentData.linkedStudentIds': [studentUid],
                });
            }

            await refreshUserData();
            if (isParent) {
                router.push('/parent');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Profile setup error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Show loading while auth is still resolving
    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-slate-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="mb-8 text-center">
                    <span className="text-5xl">🎓</span>
                    <h1 className="mt-4 text-3xl font-bold text-slate-900">
                        Set Up Your Profile
                    </h1>
                    <p className="mt-2 text-slate-500">
                        {isStudent
                            ? 'Tell us about your academic goals'
                            : 'Link your child\'s account to monitor progress'}
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Student Fields */}
                        {isStudent && (
                            <>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Class / Grade Level
                                    </label>
                                    <select
                                        value={classLevel}
                                        onChange={(e) => setClassLevel(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        required
                                    >
                                        <option value="">Select your grade</option>
                                        {CLASS_LEVELS.map((level) => (
                                            <option key={level} value={level}>
                                                {level}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Exam Focus <span className="text-slate-400">(select all that apply)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {EXAM_FOCUSES.map((exam) => (
                                            <button
                                                key={exam}
                                                type="button"
                                                onClick={() => toggleExamFocus(exam)}
                                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${examFocus.includes(exam)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {exam}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Parent Fields */}
                        {isParent && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Child&apos;s 6-Digit Code
                                </label>
                                <input
                                    type="text"
                                    value={studentCode}
                                    onChange={(e) => {
                                        setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        setCodeError('');
                                    }}
                                    maxLength={6}
                                    className={`w-full rounded-lg border px-4 py-2.5 text-slate-900 text-center text-2xl font-bold tracking-[0.5em] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${codeError
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                                        }`}
                                    placeholder="000000"
                                    required
                                />
                                {codeError && (
                                    <p className="mt-2 text-xs text-red-500 font-medium">{codeError}</p>
                                )}
                                <p className="mt-2 text-xs text-slate-400">
                                    Ask your child to share the 6-digit code from their profile page.
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (isStudent && !classLevel)}
                            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Complete Setup'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
