import { adminDb } from './firebaseAdmin';
import admin from 'firebase-admin';

// ─── Get Parent Profile ────────────────────────────────────────

export async function getParentProfile(uid: string) {
    const doc = await adminDb.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (!data?.roles?.includes('parent')) return null;
    return data;
}

// ─── Link Student by Parent Code ───────────────────────────────

export async function linkStudent(parentId: string, parentCode: string) {
    // Find the student whose studentData.parentCode matches
    const usersSnap = await adminDb
        .collection('users')
        .where('studentData.parentCode', '==', parentCode)
        .limit(1)
        .get();

    if (usersSnap.empty) {
        throw new Error('No student found with that parent code. Please check and try again.');
    }

    const studentDoc = usersSnap.docs[0];
    const studentId = studentDoc.id;

    // Check if already linked
    const parentDoc = await adminDb.collection('users').doc(parentId).get();
    const parentData = parentDoc.data();
    const existingLinks: string[] = parentData?.parentData?.linkedStudentIds || [];
    if (existingLinks.includes(studentId)) {
        throw new Error('This student is already linked to your account.');
    }

    // Update parent: add studentId to linkedStudentIds
    await adminDb.collection('users').doc(parentId).update({
        'parentData.linkedStudentIds': admin.firestore.FieldValue.arrayUnion(studentId),
        updatedAt: new Date().toISOString(),
    });

    // Update student: add parentId to linkedParentIds
    await adminDb.collection('users').doc(studentId).update({
        'studentData.linkedParentIds': admin.firestore.FieldValue.arrayUnion(parentId),
        updatedAt: new Date().toISOString(),
    });

    const studentData = studentDoc.data();
    return {
        studentId,
        fullName: studentData?.profile?.fullName || studentData?.displayName || 'Student',
        classLevel: studentData?.studentData?.classLevel || 'N/A',
    };
}

// ─── Get Linked Students ───────────────────────────────────────

export async function getLinkedStudents(uid: string) {
    const parentDoc = await adminDb.collection('users').doc(uid).get();
    if (!parentDoc.exists) return [];

    const linkedIds: string[] = parentDoc.data()?.parentData?.linkedStudentIds || [];
    if (linkedIds.length === 0) return [];

    const students = [];
    for (const sid of linkedIds) {
        try {
            const studentDoc = await adminDb.collection('users').doc(sid).get();
            if (studentDoc.exists) {
                const data = studentDoc.data();
                students.push({
                    uid: sid,
                    fullName: data?.profile?.fullName || data?.displayName || 'Student',
                    email: data?.profile?.email || '',
                    classLevel: data?.studentData?.classLevel || 'N/A',
                    examFocus: data?.studentData?.examFocus || [],
                });
            }
        } catch { /* skip failed lookups */ }
    }

    return students;
}

// ─── Get Sessions for Linked Students ──────────────────────────

export async function getStudentSessionsForParent(uid: string) {
    const parentDoc = await adminDb.collection('users').doc(uid).get();
    if (!parentDoc.exists) return [];

    const linkedIds: string[] = parentDoc.data()?.parentData?.linkedStudentIds || [];
    if (linkedIds.length === 0) return [];

    // Firestore 'in' operator max 30 items
    const batches = [];
    for (let i = 0; i < linkedIds.length; i += 10) {
        const batch = linkedIds.slice(i, i + 10);
        const snap = await adminDb
            .collection('sessions')
            .where('studentId', 'in', batch)
            .get();
        batches.push(...snap.docs);
    }

    const sessions = batches.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        sessionId: doc.id,
        ...doc.data(),
    }));

    sessions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = a.createdAt ? String(a.createdAt) : '';
        const dateB = b.createdAt ? String(b.createdAt) : '';
        return dateB.localeCompare(dateA);
    });

    return sessions;
}

// ─── Get Spending Summary ──────────────────────────────────────

export async function getSpendingSummary(uid: string) {
    const parentDoc = await adminDb.collection('users').doc(uid).get();
    if (!parentDoc.exists) return { totalSpent: 0, sessionCount: 0, transactions: [] };

    const linkedIds: string[] = parentDoc.data()?.parentData?.linkedStudentIds || [];
    if (linkedIds.length === 0) return { totalSpent: 0, sessionCount: 0, transactions: [] };

    const batches = [];
    for (let i = 0; i < linkedIds.length; i += 10) {
        const batch = linkedIds.slice(i, i + 10);
        const snap = await adminDb
            .collection('sessions')
            .where('studentId', 'in', batch)
            .where('paymentStatus', '==', 'success')
            .get();
        batches.push(...snap.docs);
    }

    const transactions: { sessionId: string; topic: string; amount: number; date: string; studentId: string }[] = await Promise.all(
        batches.map(async (sessionDoc: admin.firestore.QueryDocumentSnapshot) => {
            const data = sessionDoc.data();
            // Try to get tutor's rate for accurate amounts
            let hourlyRate = 200;
            if (data.tutorId) {
                try {
                    const tutorDoc = await adminDb.collection('users').doc(data.tutorId).get();
                    if (tutorDoc.exists) {
                        hourlyRate = tutorDoc.data()?.tutorData?.hourlyRate || 200;
                    }
                } catch { /* skip */ }
            }
            const durationMins = (data.durationLimitMinutes as number) || 60;
            const amount = Math.round(hourlyRate * (durationMins / 60));
            return {
                sessionId: sessionDoc.id,
                topic: data.topic as string,
                amount,
                date: (data.endTime || data.createdAt || '') as string,
                studentId: data.studentId as string,
            };
        })
    );

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
        totalSpent,
        sessionCount: transactions.length,
        transactions: transactions.sort((a, b) => String(b.date).localeCompare(String(a.date))),
    };
}

// ─── Get Tutor Reviews (Ratings by Linked Students) ────────────

export async function getTutorReviews(uid: string) {
    const parentDoc = await adminDb.collection('users').doc(uid).get();
    if (!parentDoc.exists) return [];

    const linkedIds: string[] = parentDoc.data()?.parentData?.linkedStudentIds || [];
    if (linkedIds.length === 0) return [];

    const batches = [];
    for (let i = 0; i < linkedIds.length; i += 10) {
        const batch = linkedIds.slice(i, i + 10);
        const snap = await adminDb
            .collection('ratings')
            .where('studentId', 'in', batch)
            .get();
        batches.push(...snap.docs);
    }

    const reviews = await Promise.all(
        batches.map(async (rDoc: admin.firestore.QueryDocumentSnapshot) => {
            const data = rDoc.data();
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

            return {
                ratingId: rDoc.id,
                sessionId: data.sessionId || '',
                tutorId: data.tutorId || '',
                tutorName,
                studentId: data.studentId || '',
                starRating: data.metrics?.studentStarRating || 0,
                feedback: data.metrics?.feedbackText || '',
                scoreDelta: data.metrics?.scoreDelta || 0,
                createdAt: data.createdAt || '',
            };
        })
    );

    return reviews.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
