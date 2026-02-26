'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';

export default function Home() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl">🎓</span>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-transparent" style={{ borderTopColor: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Mentora...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl w-full px-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-6xl block mb-4">🎓</span>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome to Mentora
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Choose how you&apos;d like to continue
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Student Card */}
          <button
            onClick={() => router.push('/dashboard')}
            className="card p-8 text-left card-interactive transition-all group"
            style={{ cursor: 'pointer' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-5 transition-transform group-hover:scale-110"
              style={{ background: 'var(--primary-light)' }}
            >
              📚
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Student
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Upload doubts, find tutors, attend live sessions, and track your learning progress.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              Go to Dashboard
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* Tutor Card */}
          <button
            onClick={() => router.push('/tutor')}
            className="card p-8 text-left card-interactive transition-all group"
            style={{ cursor: 'pointer' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-5 transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1))' }}
            >
              🎓
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Tutor
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Accept sessions, teach students, manage your profile, and track earnings &amp; analytics.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: '#059669' }}>
              Go to Tutor Portal
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
