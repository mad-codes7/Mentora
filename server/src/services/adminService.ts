import { adminDb } from './firebaseAdmin';

// ─── Admin Dashboard Stats ──────────────────────────────────

export async function getAdminDashboard() {
    // Get admin wallet
    const adminWalletDoc = await adminDb.collection('wallets').doc('admin').get();
    const adminWallet = adminWalletDoc.exists ? adminWalletDoc.data()! : {
        totalHeld: 0,
        totalCommissionEarned: 0,
    };

    // Get all payment records
    const paymentsSnap = await adminDb.collection('payments')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

    const payments = paymentsSnap.docs.map(doc => ({
        sessionId: doc.id,
        ...doc.data(),
    }));

    // Get total revenue (sum of all payments)
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalTransferred = 0;
    let heldPayments = 0;
    let transferredPayments = 0;

    payments.forEach((p: Record<string, unknown>) => {
        totalRevenue += (p.amount as number) || 0;
        totalCommission += (p.commission as number) || 0;
        if (p.tutorTransferred) {
            totalTransferred += (p.tutorShare as number) || 0;
            transferredPayments++;
        } else {
            heldPayments++;
        }
    });

    // Get all tutor wallets
    const walletsSnap = await adminDb.collection('wallets').get();
    const tutorWallets: Record<string, unknown>[] = [];
    let totalPointsInCirculation = 0;

    for (const wDoc of walletsSnap.docs) {
        if (wDoc.id === 'admin') continue;
        const wData = wDoc.data();
        // Get tutor name
        const userDoc = await adminDb.collection('users').doc(wDoc.id).get();
        const userName = userDoc.exists
            ? (userDoc.data()?.displayName || userDoc.data()?.profile?.fullName || 'Unknown')
            : 'Unknown';

        const points = wData.points || 0;
        totalPointsInCirculation += points;

        tutorWallets.push({
            tutorId: wDoc.id,
            tutorName: userName,
            points,
            totalEarned: wData.totalEarned || 0,
            totalCommission: wData.totalCommission || 0,
            totalRedeemed: wData.totalRedeemed || 0,
        });
    }

    // Sort tutor wallets by points descending
    tutorWallets.sort((a, b) => (b.points as number) - (a.points as number));

    // Get session stats
    const sessionsSnap = await adminDb.collection('sessions').get();
    let totalSessions = 0;
    let completedSessions = 0;
    let activeSessions = 0;
    let cancelledSessions = 0;

    sessionsSnap.docs.forEach(doc => {
        totalSessions++;
        const status = doc.data().status;
        if (status === 'completed') completedSessions++;
        else if (status === 'in_progress' || status === 'paid_waiting') activeSessions++;
        else if (status === 'cancelled') cancelledSessions++;
    });

    // Total users
    const usersSnap = await adminDb.collection('users').get();
    let totalStudents = 0;
    let totalTutors = 0;

    usersSnap.docs.forEach(doc => {
        const roles = doc.data().roles || [];
        if (roles.includes('student')) totalStudents++;
        if (roles.includes('tutor')) totalTutors++;
    });

    return {
        finance: {
            totalRevenue,
            totalCommission,
            totalTransferred,
            totalHeld: adminWallet.totalHeld || 0,
            heldPayments,
            transferredPayments,
            totalPointsInCirculation,
        },
        payments,
        tutorWallets,
        sessions: {
            total: totalSessions,
            completed: completedSessions,
            active: activeSessions,
            cancelled: cancelledSessions,
        },
        users: {
            totalStudents,
            totalTutors,
        },
    };
}
