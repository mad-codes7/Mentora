import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const ADMIN_COMMISSION_RATE = 0.10; // 10% commission
const MIN_REDEEM_POINTS = 1000;     // Minimum points to redeem

// ─── Process Payment to Admin ────────────────────────────────────

export async function processPaymentToAdmin(data: {
    sessionId: string;
    studentId: string;
    amount: number;
}) {
    const { sessionId, studentId, amount } = data;

    // Create payment record held by admin
    const paymentRef = adminDb.collection('payments').doc(sessionId);
    await paymentRef.set({
        sessionId,
        studentId,
        amount,
        adminReceived: amount,
        tutorTransferred: false,
        commission: Math.round(amount * ADMIN_COMMISSION_RATE),
        tutorShare: Math.round(amount * (1 - ADMIN_COMMISSION_RATE)),
        status: 'held',  // held by admin until session completes
        createdAt: FieldValue.serverTimestamp(),
    });

    // Update admin wallet (central account)
    const adminWalletRef = adminDb.collection('wallets').doc('admin');
    await adminWalletRef.set({
        totalHeld: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { sessionId, amount, status: 'held' };
}

// ─── Transfer to Tutor Wallet After Session ──────────────────────

export async function transferToTutorWallet(sessionId: string) {
    const paymentRef = adminDb.collection('payments').doc(sessionId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) throw new Error('Payment record not found');

    const payment = paymentDoc.data()!;
    if (payment.tutorTransferred) throw new Error('Already transferred to tutor');
    if (payment.status !== 'held') throw new Error('Payment is not in held status');

    // Get the session to find the tutor
    const sessionDoc = await adminDb.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) throw new Error('Session not found');

    const session = sessionDoc.data()!;
    const tutorId = session.tutorId;
    if (!tutorId) throw new Error('No tutor assigned to this session');

    const commission = payment.commission;
    const tutorShare = payment.tutorShare;

    // Credit tutor wallet with POINTS (1 point = ₹1)
    const tutorWalletRef = adminDb.collection('wallets').doc(tutorId);
    await tutorWalletRef.set({
        points: FieldValue.increment(tutorShare),
        totalEarned: FieldValue.increment(tutorShare),
        totalCommission: FieldValue.increment(commission),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Add transaction record
    await tutorWalletRef.collection('transactions').add({
        type: 'credit',
        amount: tutorShare,
        sessionId,
        description: `Session completed — ₹${payment.amount} paid by student, ₹${commission} admin commission`,
        studentId: payment.studentId,
        createdAt: FieldValue.serverTimestamp(),
    });

    // Mark payment as transferred
    await paymentRef.update({
        tutorTransferred: true,
        status: 'transferred',
        transferredAt: FieldValue.serverTimestamp(),
    });

    // Deduct from admin held amount
    const adminWalletRef = adminDb.collection('wallets').doc('admin');
    await adminWalletRef.set({
        totalHeld: FieldValue.increment(-payment.amount),
        totalCommissionEarned: FieldValue.increment(commission),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { sessionId, tutorId, tutorShare, commission };
}

// ─── Get Tutor Wallet ────────────────────────────────────────────

export async function getTutorWallet(tutorId: string) {
    const walletRef = adminDb.collection('wallets').doc(tutorId);
    const walletDoc = await walletRef.get();

    const walletData = walletDoc.exists ? walletDoc.data()! : {
        points: 0,
        totalEarned: 0,
        totalCommission: 0,
        totalRedeemed: 0,
    };

    // Fetch recent transactions
    const transactionsSnap = await walletRef
        .collection('transactions')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    const transactions = transactionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    return {
        points: walletData.points || 0,
        totalEarned: walletData.totalEarned || 0,
        totalCommission: walletData.totalCommission || 0,
        totalRedeemed: walletData.totalRedeemed || 0,
        canRedeem: (walletData.points || 0) >= MIN_REDEEM_POINTS,
        minRedeemPoints: MIN_REDEEM_POINTS,
        transactions,
    };
}

// ─── Redeem Wallet Points ────────────────────────────────────────

export async function redeemWalletPoints(tutorId: string, amount: number) {
    const walletRef = adminDb.collection('wallets').doc(tutorId);
    const walletDoc = await walletRef.get();

    if (!walletDoc.exists) throw new Error('Wallet not found');

    const wallet = walletDoc.data()!;
    const currentPoints = wallet.points || 0;

    if (currentPoints < MIN_REDEEM_POINTS) {
        throw new Error(`Cannot redeem: minimum ${MIN_REDEEM_POINTS} points required. You have ${currentPoints} points.`);
    }

    if (amount > currentPoints) {
        throw new Error(`Cannot redeem ₹${amount}: only ${currentPoints} points available.`);
    }

    if (amount <= 0) {
        throw new Error('Redemption amount must be positive.');
    }

    // Deduct points
    await walletRef.update({
        points: FieldValue.increment(-amount),
        totalRedeemed: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Record redemption transaction
    await walletRef.collection('transactions').add({
        type: 'redemption',
        amount: -amount,
        description: `Redeemed ₹${amount} from wallet`,
        createdAt: FieldValue.serverTimestamp(),
    });

    return {
        redeemed: amount,
        remainingPoints: currentPoints - amount,
        message: `Successfully redeemed ₹${amount}. Remaining balance: ${currentPoints - amount} points.`,
    };
}
