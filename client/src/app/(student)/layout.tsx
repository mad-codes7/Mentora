'use client';

import Navbar from '@/common/Navbar';
import Footer from '@/common/Footer';
import ProtectedRoute from '@/common/ProtectedRoute';
import AiTutorBot from '@/features/student/AiTutorBot';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute requiredRole="student">
            <div className="min-h-screen hero-pattern flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
                <Navbar />
                <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-6 sm:px-6">{children}</main>
                <Footer />
                <AiTutorBot />
            </div>
        </ProtectedRoute>
    );
}

