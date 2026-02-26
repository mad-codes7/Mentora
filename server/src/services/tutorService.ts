import { adminDb } from './firebaseAdmin';
import admin from 'firebase-admin';

// ─── Register Tutor ────────────────────────────────────────────

export async function registerTutor(data: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    subjects: string[];
    bio: string;
    experience: string;
    hourlyRate: number;
    verificationQuizScore: number;
}) {
    const isVerified = data.verificationQuizScore >= 70;

    const userDoc: Record<string, unknown> = {
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL || '',
        // Use arrayUnion to ADD tutor role without overwriting existing roles (e.g. student)
        roles: admin.firestore.FieldValue.arrayUnion('tutor'),
        tutorData: {
            subjects: data.subjects,
            availability: [] as { day: string; startTime: string; endTime: string }[],
            isVerified,
            verificationQuizScore: data.verificationQuizScore,
            bio: data.bio,
            experience: data.experience,
            hourlyRate: data.hourlyRate,
        },
        updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('users').doc(data.uid).set(userDoc, { merge: true });
    return { ...userDoc, roles: ['tutor'] };
}

// ─── Get Tutor Profile ─────────────────────────────────────────

export async function getTutorProfile(uid: string) {
    const doc = await adminDb.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data();
}

// ─── Update Tutor Profile ──────────────────────────────────────

export async function updateTutorProfile(uid: string, data: {
    subjects?: string[];
    availability?: { day: string; startTime: string; endTime: string }[];
    bio?: string;
    experience?: string;
    hourlyRate?: number;
}) {
    const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
    };

    if (data.subjects) updateData['tutorData.subjects'] = data.subjects;
    if (data.availability) updateData['tutorData.availability'] = data.availability;
    if (data.bio) {
        updateData['tutorData.bio'] = data.bio;
        updateData['profile.bio'] = data.bio;
    }
    if (data.experience) updateData['tutorData.experience'] = data.experience;
    if (data.hourlyRate !== undefined) updateData['tutorData.hourlyRate'] = data.hourlyRate;

    await adminDb.collection('users').doc(uid).update(updateData);
    return getTutorProfile(uid);
}

// ─── Get Tutor Sessions ────────────────────────────────────────

export async function getTutorSessions(uid: string, statusFilter?: string) {
    let query: admin.firestore.Query = adminDb
        .collection('sessions')
        .where('tutorId', '==', uid);

    if (statusFilter) {
        query = query.where('status', '==', statusFilter);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({ sessionId: doc.id, ...doc.data() }));
}

// ─── Accept Session ────────────────────────────────────────────

export async function acceptSession(sessionId: string, tutorId: string) {
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) throw new Error('Session not found');

    const session = doc.data();
    if (session?.status !== 'searching') {
        throw new Error('Session cannot be accepted in its current state');
    }

    await sessionRef.update({
        tutorId,
        status: 'pending_payment',
        updatedAt: new Date().toISOString(),
    });

    return { sessionId, status: 'pending_payment' };
}

// ─── Update Session Status ─────────────────────────────────────

export async function updateSessionStatus(
    sessionId: string,
    status: string,
    additionalData?: Record<string, unknown>
) {
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) throw new Error('Session not found');

    const updatePayload: Record<string, unknown> = {
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData,
    };

    if (status === 'in_progress') {
        updatePayload.actualStartTime = new Date().toISOString();
    }
    if (status === 'completed') {
        updatePayload.endTime = new Date().toISOString();
    }

    await sessionRef.update(updatePayload);
    return { sessionId, status };
}

// ─── Upload Document to Session ────────────────────────────────

export async function addDocumentToSession(
    sessionId: string,
    document: { name: string; url: string; uploadedBy: string }
) {
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) throw new Error('Session not found');

    const sharedDoc = {
        ...document,
        uploadedAt: new Date().toISOString(),
    };

    const existing: unknown[] = doc.data()?.sharedDocuments || [];
    await sessionRef.update({
        sharedDocuments: [...existing, sharedDoc],
        updatedAt: new Date().toISOString(),
    });

    return sharedDoc;
}

// ─── Get Wallet Balance ────────────────────────────────────────

export async function getWalletBalance(uid: string) {
    const completedSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .where('status', '==', 'completed')
        .where('paymentStatus', '==', 'success')
        .get();

    const pendingSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .where('status', '==', 'in_progress')
        .get();

    const transactions = completedSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
            sessionId: doc.id,
            amount: (data.durationLimitMinutes as number || 30) * 5,
            studentName: (data.studentName as string) || 'Student',
            topic: data.topic as string,
            date: (data.endTime || data.createdAt) as string,
            status: 'completed' as const,
        };
    });

    const totalEarnings = transactions.reduce((sum: number, t) => sum + t.amount, 0);
    const pendingAmount = pendingSnapshot.docs.length * 150;

    return {
        totalEarnings,
        pendingAmount,
        completedSessions: completedSnapshot.size,
        transactions,
    };
}

// ─── Get Analytics ─────────────────────────────────────────────

export async function getAnalytics(uid: string) {
    const sessionsSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .get();

    interface SessionData { status: string; studentId: string; topic: string; endTime?: string; createdAt?: string }
    interface RatingData { metrics?: { starRating?: number; normalizedScoreDelta?: number } }

    const sessions: SessionData[] = sessionsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as SessionData);
    const completedSessions = sessions.filter((s: SessionData) => s.status === 'completed');

    const ratingsSnapshot = await adminDb
        .collection('ratings')
        .where('tutorId', '==', uid)
        .get();

    const ratings: RatingData[] = ratingsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as RatingData);

    const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: RatingData) => sum + (r.metrics?.starRating || 0), 0) / ratings.length
        : 0;

    const avgScoreDelta = ratings.length > 0
        ? ratings.reduce((sum: number, r: RatingData) => sum + (r.metrics?.normalizedScoreDelta || 0), 0) / ratings.length
        : 0;

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r: RatingData) => {
        const star = Math.round(r.metrics?.starRating || 0);
        if (star >= 1 && star <= 5) ratingDistribution[star]++;
    });

    const studentIds = new Set(sessions.map((s: SessionData) => s.studentId));

    const subjectMap: { [key: string]: number } = {};
    sessions.forEach((s: SessionData) => {
        const topic = s.topic || 'Unknown';
        subjectMap[topic] = (subjectMap[topic] || 0) + 1;
    });
    const subjectBreakdown = Object.entries(subjectMap).map(([subject, count]) => ({ subject, count }));

    const monthlyMap: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = 0;
    }
    completedSessions.forEach((s: SessionData) => {
        const date = s.endTime || s.createdAt;
        if (date) {
            const key = date.substring(0, 7);
            if (key in monthlyMap) monthlyMap[key]++;
        }
    });
    const monthlySessionTrend = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    return {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageRating: Math.round(avgRating * 100) / 100,
        totalStudents: studentIds.size,
        averageScoreDelta: Math.round(avgScoreDelta * 100) / 100,
        ratingDistribution,
        subjectBreakdown,
        monthlySessionTrend,
    };
}

// ─── Get Available Sessions (Searching, no tutor assigned) ─────

export async function getAvailableSessions() {
    const snapshot = await adminDb
        .collection('sessions')
        .where('status', '==', 'searching')
        .get();

    return snapshot.docs
        .map((doc: admin.firestore.QueryDocumentSnapshot) => ({ sessionId: doc.id, ...doc.data() }))
        .filter((s: Record<string, unknown>) => !s.tutorId || s.tutorId === '')
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const dateA = a.createdAt ? String(a.createdAt) : '';
            const dateB = b.createdAt ? String(b.createdAt) : '';
            return dateB.localeCompare(dateA);
        });
}
