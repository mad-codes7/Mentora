'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const EDUCATION_LEVELS = [
    'High School',
    "Bachelor's Degree",
    "Master's Degree",
    'PhD / Doctorate',
    'Other',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function TutorBasicInfoPage() {
    const { firebaseUser, mentoraUser, loading: authLoading, refreshUserData } = useAuth();
    const router = useRouter();

    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [city, setCity] = useState('');
    const [education, setEducation] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already completed basic info
    useEffect(() => {
        if (authLoading) return;
        if (!firebaseUser) {
            router.push('/tutor/login');
            return;
        }
    }, [authLoading, firebaseUser, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;

        setError('');
        setLoading(true);

        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await updateDoc(userRef, {
                tutorBasicInfo: {
                    phone,
                    dateOfBirth: dob,
                    gender,
                    city,
                    highestEducation: education,
                    collegeName,
                },
            });

            await refreshUserData();
            router.push('/tutor/register');
        } catch (err) {
            console.error('Basic info save error:', err);
            setError('Failed to save information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-transparent" style={{ borderTopColor: '#059669' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    const isFormValid = phone && dob && gender && city && education && collegeName;

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-lg animate-fade-in-up">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-4 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                        <span className="text-white font-bold">📋</span>
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Basic Information
                    </h1>
                    <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Tell us a bit about yourself before we set up your tutor profile
                    </p>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#059669' }} />
                            <span className="text-xs font-semibold" style={{ color: '#059669' }}>Basic Info</span>
                        </div>
                        <div className="h-px w-8" style={{ background: 'var(--border)' }} />
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--border)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Profile</span>
                        </div>
                        <div className="h-px w-8" style={{ background: 'var(--border)' }} />
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--border)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Quiz</span>
                        </div>
                    </div>
                </div>

                {/* Card */}
                <div className="card p-8">
                    {error && (
                        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100 animate-scale-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Row: Phone + DOB */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    📱 Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                                    className="input-styled"
                                    placeholder="+91 98765 43210"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    🎂 Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="input-styled"
                                    required
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                👤 Gender
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {GENDER_OPTIONS.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setGender(option)}
                                        className="rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all"
                                        style={{
                                            borderColor: gender === option ? '#059669' : 'var(--border)',
                                            background: gender === option ? 'rgba(5, 150, 105, 0.08)' : 'transparent',
                                            color: gender === option ? '#059669' : 'var(--text-primary)',
                                        }}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                📍 City / Location
                            </label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="input-styled"
                                placeholder="e.g., Mumbai, Delhi, Bangalore"
                                required
                            />
                        </div>

                        {/* Education */}
                        <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                🎓 Highest Education
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {EDUCATION_LEVELS.map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setEducation(level)}
                                        className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                                        style={{
                                            background: education === level ? 'rgba(5, 150, 105, 0.12)' : 'var(--bg)',
                                            border: `1.5px solid ${education === level ? '#059669' : 'var(--border)'}`,
                                            color: education === level ? '#059669' : 'var(--text-primary)',
                                        }}
                                    >
                                        {education === level && '✓ '}{level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* College Name */}
                        <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                                🏫 College / University Name
                            </label>
                            <input
                                type="text"
                                value={collegeName}
                                onChange={(e) => setCollegeName(e.target.value)}
                                className="input-styled"
                                placeholder="e.g., IIT Delhi, Delhi University"
                                required
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !isFormValid}
                            className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mt-2"
                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                        >
                            {loading ? 'Saving...' : 'Continue to Profile Setup →'}
                        </button>
                    </form>
                </div>

                {/* Name display */}
                {mentoraUser && (
                    <p className="text-center mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Signed in as <strong>{mentoraUser.profile.fullName}</strong> ({mentoraUser.profile.email})
                    </p>
                )}
            </div>
        </div>
    );
}
