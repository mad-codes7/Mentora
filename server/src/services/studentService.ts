import { adminDb } from './firebaseAdmin';
import admin from 'firebase-admin';

// ─── Get Student Profile ────────────────────────────────────────

export async function getStudentProfile(uid: string) {
    const doc = await adminDb.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    // Only return if the user has student role
    if (!data?.roles?.includes('student')) return null;
    return data;
}

// ─── Get Student Sessions ───────────────────────────────────────

export async function getStudentSessions(uid: string, statusFilter?: string) {
    let query: admin.firestore.Query = adminDb
        .collection('sessions')
        .where('studentId', '==', uid);

    if (statusFilter) {
        query = query.where('status', '==', statusFilter);
    }

    const snapshot = await query.get();
    const sessions = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        sessionId: doc.id,
        ...doc.data(),
    }));

    // Sort by createdAt descending
    sessions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = a.createdAt ? String(a.createdAt) : '';
        const dateB = b.createdAt ? String(b.createdAt) : '';
        return dateB.localeCompare(dateA);
    });

    return sessions;
}

// ─── Get Student Progress (Assessment Deltas) ───────────────────

export async function getStudentProgress(uid: string) {
    const assessSnap = await adminDb
        .collection('assessments')
        .where('userId', '==', uid)
        .get();

    interface AssessmentData { sessionId: string; type: string; topic: string; scoreData?: { totalScore: number; maxScore: number } }
    const assessments: AssessmentData[] = assessSnap.docs.map(
        (doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as AssessmentData
    );

    // Group by session
    const bySession: Record<string, { pre?: number; post?: number; topic: string }> = {};
    assessments.forEach(a => {
        const key = a.sessionId || 'unknown';
        if (!bySession[key]) bySession[key] = { topic: a.topic || 'General' };
        const pct = a.scoreData?.totalScore != null && a.scoreData?.maxScore
            ? Math.round((a.scoreData.totalScore / a.scoreData.maxScore) * 100)
            : 0;
        if (a.type === 'pre_session') {
            bySession[key].pre = pct;
            bySession[key].topic = a.topic || bySession[key].topic;
        } else {
            bySession[key].post = pct;
        }
    });

    return Object.entries(bySession).map(([sessionId, data]) => ({
        sessionId,
        topic: data.topic,
        preScore: data.pre || 0,
        postScore: data.post || 0,
        improvement: (data.post || 0) - (data.pre || 0),
    }));
}

// ─── Get Session History (Completed Sessions with Details) ──────

export async function getSessionHistory(uid: string) {
    const snapshot = await adminDb
        .collection('sessions')
        .where('studentId', '==', uid)
        .where('status', '==', 'completed')
        .get();

    const sessions = await Promise.all(
        snapshot.docs.map(async (sessionDoc: admin.firestore.QueryDocumentSnapshot) => {
            const data = sessionDoc.data();
            let tutorName = 'Unknown Tutor';
            if (data.tutorId) {
                try {
                    const tutorDoc = await adminDb.collection('users').doc(data.tutorId).get();
                    if (tutorDoc.exists) {
                        const tutor = tutorDoc.data();
                        tutorName = tutor?.profile?.fullName || tutor?.displayName || 'Tutor';
                    }
                } catch { /* skip */ }
            }

            const hourlyRate = data.tutorHourlyRate || 200;
            const durationMins = (data.durationLimitMinutes as number) || 60;
            const amountPaid = Math.round(hourlyRate * (durationMins / 60));

            return {
                sessionId: sessionDoc.id,
                topic: data.topic,
                tutorName,
                meetingType: data.meetingType,
                durationMinutes: durationMins,
                amountPaid,
                completedAt: data.endTime || data.createdAt || '',
            };
        })
    );

    sessions.sort((a, b) => {
        return String(b.completedAt).localeCompare(String(a.completedAt));
    });

    return sessions;
}
