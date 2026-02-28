import { adminDb } from './firebaseAdmin';
import admin from 'firebase-admin';
import { transferToTutorWallet, getTutorWallet } from './paymentService';

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
    qualification?: string;
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
            qualification: data.qualification || '',
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
    qualification?: string;
}) {
    const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
    };

    if (data.subjects !== undefined) updateData['tutorData.subjects'] = data.subjects;
    if (data.availability !== undefined) updateData['tutorData.availability'] = data.availability;
    if (data.bio !== undefined) {
        updateData['tutorData.bio'] = data.bio;
        updateData['profile.bio'] = data.bio;
    }
    if (data.experience !== undefined) updateData['tutorData.experience'] = data.experience;
    if (data.hourlyRate !== undefined) updateData['tutorData.hourlyRate'] = data.hourlyRate;
    if (data.qualification !== undefined) updateData['tutorData.qualification'] = data.qualification;

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

    const snapshot = await query.get();
    const sessions = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({ sessionId: doc.id, ...doc.data() }));

    // Sort in memory to avoid requiring a Firestore composite index
    sessions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = a.createdAt ? String(a.createdAt) : '';
        const dateB = b.createdAt ? String(b.createdAt) : '';
        return dateB.localeCompare(dateA);
    });

    return sessions;
}

// ─── Accept Session ────────────────────────────────────────────

export async function acceptSession(sessionId: string, tutorId: string) {
    const sessionRef = adminDb.collection('sessions').doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) throw new Error('Session not found');

    const session = doc.data();
    if (session?.status !== 'searching' && session?.status !== 'pending_tutor_approval') {
        throw new Error('Session cannot be accepted in its current state');
    }

    // For slot bookings (pending_tutor_approval), skip payment and go straight to paid_waiting
    const newStatus = session?.status === 'pending_tutor_approval' ? 'paid_waiting' : 'pending_payment';

    await sessionRef.update({
        tutorId,
        status: newStatus,
        updatedAt: new Date().toISOString(),
    });

    return { sessionId, status: newStatus };
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

    // Auto-transfer payment to tutor wallet when session completes
    if (status === 'completed') {
        try {
            await transferToTutorWallet(sessionId);
            console.log(`[updateSessionStatus] Wallet credited for session ${sessionId}`);
        } catch (err) {
            console.warn(`[updateSessionStatus] Wallet transfer skipped for ${sessionId}:`, err);
            // Don't block session completion if transfer fails (e.g. no payment record)
        }
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
    // Use the new wallet points system
    const wallet = await getTutorWallet(uid);

    // Also get pending sessions count for display
    const pendingSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .where('status', '==', 'in_progress')
        .get();

    const completedSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .where('status', '==', 'completed')
        .get();

    return {
        // New wallet fields
        points: wallet.points,
        totalEarned: wallet.totalEarned,
        totalCommission: wallet.totalCommission,
        totalRedeemed: wallet.totalRedeemed || 0,
        canRedeem: wallet.canRedeem,
        minRedeemPoints: wallet.minRedeemPoints,
        transactions: wallet.transactions,
        // Legacy-compatible fields
        totalEarnings: wallet.totalEarned,
        pendingAmount: pendingSnapshot.size,
        completedSessions: completedSnapshot.size,
    };
}

// ─── Get Analytics ─────────────────────────────────────────────

export async function getAnalytics(uid: string) {
    console.log('[getAnalytics] fetching for uid:', uid);

    const sessionsSnapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', uid)
        .get();

    console.log('[getAnalytics] sessions found:', sessionsSnapshot.size);

    interface SessionData { status: string; studentId: string; topic: string; endTime?: unknown; createdAt?: unknown }
    interface RatingData { metrics?: { studentStarRating?: number; scoreDelta?: number; finalCalculatedRating?: number } }

    const sessions: SessionData[] = sessionsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as SessionData);
    const completedSessions = sessions.filter((s: SessionData) => s.status === 'completed');

    const ratingsSnapshot = await adminDb
        .collection('ratings')
        .where('tutorId', '==', uid)
        .get();

    const ratings: RatingData[] = ratingsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as RatingData);

    const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: RatingData) => sum + (r.metrics?.studentStarRating || 0), 0) / ratings.length
        : 0;

    const avgScoreDelta = ratings.length > 0
        ? ratings.reduce((sum: number, r: RatingData) => sum + (r.metrics?.scoreDelta || 0), 0) / ratings.length
        : 0;

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r: RatingData) => {
        const star = Math.round(r.metrics?.studentStarRating || 0);
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
        const raw = s.endTime || s.createdAt;
        if (raw) {
            let key = '';
            // Handle Firestore Timestamp objects
            if (raw && typeof raw === 'object' && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
                const d = (raw as { toDate: () => Date }).toDate();
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else if (typeof raw === 'string') {
                key = raw.substring(0, 7);
            }
            if (key && key in monthlyMap) monthlyMap[key]++;
        }
    });
    const monthlySessionTrend = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    // Build recent ratings list
    const recentRatings = ratingsSnapshot.docs
        .map((doc: admin.firestore.QueryDocumentSnapshot) => {
            const d = doc.data();
            // Convert Firestore Timestamp to ISO string safely
            let createdAtStr = '';
            if (d.createdAt && typeof d.createdAt.toDate === 'function') {
                createdAtStr = d.createdAt.toDate().toISOString();
            } else if (typeof d.createdAt === 'string') {
                createdAtStr = d.createdAt;
            }
            return {
                ratingId: doc.id,
                studentId: d.studentId || '',
                sessionId: d.sessionId || '',
                starRating: d.metrics?.studentStarRating || 0,
                feedback: d.metrics?.feedbackText || '',
                scoreDelta: d.metrics?.scoreDelta || 0,
                createdAt: createdAtStr,
            };
        })
        .sort((a: { createdAt: string }, b: { createdAt: string }) => {
            return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, 10);

    // Update aggregateRating on the tutor user document
    const roundedAvgRating = Math.round(avgRating * 100) / 100;
    if (ratings.length > 0) {
        await adminDb.collection('users').doc(uid).update({
            'tutorData.aggregateRating': roundedAvgRating,
        });
    }

    const completionRate = sessions.length > 0
        ? Math.round((completedSessions.length / sessions.length) * 100)
        : 0;

    return {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageRating: roundedAvgRating,
        totalStudents: studentIds.size,
        averageScoreDelta: Math.round(avgScoreDelta * 100) / 100,
        ratingDistribution,
        subjectBreakdown,
        monthlySessionTrend,
        recentRatings,
        completionRate,
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

// ─── Get Booking Requests (Pending tutor approval) ─────────────

export async function getBookingRequests(tutorId: string) {
    const snapshot = await adminDb
        .collection('sessions')
        .where('tutorId', '==', tutorId)
        .where('status', '==', 'pending_tutor_approval')
        .get();

    return snapshot.docs
        .map((doc: admin.firestore.QueryDocumentSnapshot) => ({ sessionId: doc.id, ...doc.data() }))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const dateA = a.scheduledStartTime ? String(a.scheduledStartTime) : a.createdAt ? String(a.createdAt) : '';
            const dateB = b.scheduledStartTime ? String(b.scheduledStartTime) : b.createdAt ? String(b.createdAt) : '';
            return dateA.localeCompare(dateB);
        });
}
