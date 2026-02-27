'use client';

import { useAuth } from '@/common/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'student' | 'tutor' | 'parent';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { firebaseUser, mentoraUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!firebaseUser) {
                router.push('/');
                return;
            }
            if (!mentoraUser) {
                router.push('/profile-setup');
                return;
            }
            if (requiredRole && !mentoraUser.roles.includes(requiredRole)) {
                // Wrong role — send to home so they can pick the right portal
                router.push('/');
                return;
            }
        }
    }, [firebaseUser, mentoraUser, loading, requiredRole, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!firebaseUser || !mentoraUser) {
        return null;
    }

    if (requiredRole && !mentoraUser.roles.includes(requiredRole)) {
        return null;
    }

    return <>{children}</>;
}
