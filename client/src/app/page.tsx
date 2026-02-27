'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/AuthContext';

export default function Home() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

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

  const roles = [
    {
      id: 'student',
      emoji: '📚',
      label: 'Student',
      desc: 'Upload doubts, find tutors, attend live sessions, and track your learning progress.',
      color: 'var(--primary)',
      bg: 'var(--primary-light)',
      href: firebaseUser ? '/dashboard' : '/signup?role=student',
    },
    {
      id: 'tutor',
      emoji: '🎓',
      label: 'Tutor',
      desc: 'Accept sessions, teach students, manage your profile, and track earnings & analytics.',
      color: '#059669',
      bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1))',
      href: firebaseUser ? '/tutor' : '/tutor/signup',
    },
    {
      id: 'parent',
      emoji: '👨‍👩‍👧',
      label: 'Parent',
      desc: 'Monitor your child\'s learning progress, view session history, and track improvements.',
      color: '#d97706',
      bg: 'linear-gradient(135deg, rgba(217,119,6,0.1), rgba(245,158,11,0.1))',
      href: firebaseUser ? '/parent' : '/parent/login',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl w-full px-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-6xl block mb-4">🎓</span>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome to Mentora
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {firebaseUser ? 'Choose how you\'d like to continue' : 'Real-Time Smart Tutoring Platform'}
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => router.push(role.href)}
              className="card p-6 text-left card-interactive transition-all group"
              style={{ cursor: 'pointer' }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-4 transition-transform group-hover:scale-110"
                style={{ background: role.bg }}
              >
                {role.emoji}
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {role.label}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {role.desc}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: role.color }}>
                {firebaseUser ? `Go to ${role.label} Portal` : `Join as ${role.label}`}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* Login link for non-authenticated users */}
        {!firebaseUser && (
          <p className="text-center mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="font-semibold hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Log In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
