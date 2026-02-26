'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/common/AuthContext';
import { TutorData } from '@/config/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface TutorProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    roles: string[];
    tutorData?: TutorData;
    createdAt: string;
    updatedAt: string;
}

export function useTutor() {
    const { firebaseUser } = useAuth();
    const [profile, setProfile] = useState<TutorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!firebaseUser) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/tutor/profile/${firebaseUser.uid}`);
            if (res.ok) {
                const { data } = await res.json();
                setProfile(data);
            } else if (res.status === 404) {
                setProfile(null);
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error loading profile';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [firebaseUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const registerTutor = async (data: {
        subjects: string[];
        bio: string;
        experience: string;
        hourlyRate: number;
        verificationQuizScore: number;
    }) => {
        if (!firebaseUser) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/api/tutor/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Tutor',
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL || '',
                ...data,
            }),
        });

        if (!res.ok) throw new Error('Registration failed');
        const { data: result } = await res.json();
        setProfile(result);
        return result;
    };

    const updateProfile = async (data: {
        subjects?: string[];
        availability?: { day: string; startTime: string; endTime: string }[];
        bio?: string;
        experience?: string;
        hourlyRate?: number;
    }) => {
        if (!firebaseUser) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/api/tutor/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: firebaseUser.uid, ...data }),
        });

        if (!res.ok) throw new Error('Update failed');
        const { data: result } = await res.json();
        setProfile(result);
        return result;
    };

    return { profile, loading, error, registerTutor, updateProfile, refetch: fetchProfile };
}
