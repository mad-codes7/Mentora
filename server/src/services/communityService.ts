import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Types ───────────────────────────────────────────────────

export interface CommunityData {
    name: string;
    description: string;
    subject: string;
    tags: string[];
    logoEmoji: string;
    bannerColor: string;
    createdBy: string;
    createdByName: string;
    createdByRole: 'student' | 'tutor';
    memberCount: number;
    maxMembers: number;
    isPublic: boolean;
    rules: string;
    createdAt: FirebaseFirestore.Timestamp;
}

export interface CommunityMemberData {
    uid: string;
    displayName: string;
    userRole: 'student' | 'tutor';
    communityRole: 'owner' | 'admin' | 'member';
    joinedAt: FirebaseFirestore.Timestamp;
}

export interface CommunityMessageData {
    senderId: string;
    senderName: string;
    senderRole: 'student' | 'tutor';
    text: string;
    type: 'text' | 'announcement' | 'resource';
    createdAt: FirebaseFirestore.Timestamp;
}

const communitiesRef = adminDb.collection('communities');

// ─── Create ──────────────────────────────────────────────────

export async function createCommunity(data: {
    name: string;
    description: string;
    subject: string;
    tags: string[];
    logoEmoji: string;
    bannerColor: string;
    isPublic: boolean;
    rules: string;
    createdBy: string;
    createdByName: string;
    createdByRole: 'student' | 'tutor';
}) {
    const docRef = communitiesRef.doc();
    const communityId = docRef.id;

    const communityData: CommunityData = {
        name: data.name,
        description: data.description,
        subject: data.subject,
        tags: data.tags,
        logoEmoji: data.logoEmoji || '📚',
        bannerColor: data.bannerColor || '#4F46E5',
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByRole: data.createdByRole,
        memberCount: 1,
        maxMembers: 50,
        isPublic: data.isPublic !== false,
        rules: data.rules || '',
        createdAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
    };

    await docRef.set(communityData);

    // Add creator as owner member
    await docRef.collection('members').doc(data.createdBy).set({
        uid: data.createdBy,
        displayName: data.createdByName,
        userRole: data.createdByRole,
        communityRole: 'owner',
        joinedAt: FieldValue.serverTimestamp(),
    });

    // Send a system-style welcome message
    await docRef.collection('messages').add({
        senderId: 'system',
        senderName: 'Mentora',
        senderRole: 'tutor',
        text: `Welcome to ${data.name}! 🎉 This community was created by ${data.createdByName}. Start chatting and share your knowledge!`,
        type: 'announcement',
        createdAt: FieldValue.serverTimestamp(),
    });

    return { communityId, ...communityData };
}

// ─── List / Browse ───────────────────────────────────────────

export async function listCommunities(tag?: string) {
    // Simple fetch — avoids needing a composite Firestore index
    const snapshot = await communitiesRef.limit(100).get();
    let communities = snapshot.docs
        .map((doc) => ({
            communityId: doc.id,
            ...doc.data() as CommunityData,
        }))
        .filter((c) => c.isPublic !== false);

    // Sort by memberCount descending (in-memory)
    communities.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));

    // Tag filter
    if (tag) {
        communities = communities.filter((c) =>
            c.tags?.some((t: string) => t.toLowerCase().includes(tag.toLowerCase()))
        );
    }

    return communities.slice(0, 50);
}

// ─── Get Single ──────────────────────────────────────────────

export async function getCommunity(communityId: string) {
    const doc = await communitiesRef.doc(communityId).get();
    if (!doc.exists) return null;
    return { communityId: doc.id, ...doc.data() };
}

// ─── User's Communities ──────────────────────────────────────

export async function getUserCommunities(uid: string) {
    // Query all communities where the user is a member
    const allCommunities = await communitiesRef.get();
    const userCommunities: any[] = [];

    for (const communityDoc of allCommunities.docs) {
        const memberDoc = await communityDoc.ref.collection('members').doc(uid).get();
        if (memberDoc.exists) {
            userCommunities.push({
                communityId: communityDoc.id,
                ...communityDoc.data(),
                membership: memberDoc.data(),
            });
        }
    }

    return userCommunities;
}

// ─── Join ────────────────────────────────────────────────────

export async function joinCommunity(
    communityId: string,
    uid: string,
    displayName: string,
    userRole: 'student' | 'tutor'
) {
    const communityRef = communitiesRef.doc(communityId);
    const communityDoc = await communityRef.get();

    if (!communityDoc.exists) throw new Error('Community not found');

    const data = communityDoc.data() as CommunityData;
    if (data.memberCount >= data.maxMembers) throw new Error('Community is full');

    // Check if already a member
    const memberDoc = await communityRef.collection('members').doc(uid).get();
    if (memberDoc.exists) throw new Error('Already a member');

    await communityRef.collection('members').doc(uid).set({
        uid,
        displayName,
        userRole,
        communityRole: 'member',
        joinedAt: FieldValue.serverTimestamp(),
    });

    await communityRef.update({
        memberCount: FieldValue.increment(1),
    });

    // Send join message
    await communityRef.collection('messages').add({
        senderId: 'system',
        senderName: 'Mentora',
        senderRole: 'tutor',
        text: `${displayName} joined the community! 👋`,
        type: 'announcement',
        createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
}

// ─── Leave ───────────────────────────────────────────────────

export async function leaveCommunity(communityId: string, uid: string) {
    const communityRef = communitiesRef.doc(communityId);
    const memberDoc = await communityRef.collection('members').doc(uid).get();

    if (!memberDoc.exists) throw new Error('Not a member');

    const memberData = memberDoc.data() as CommunityMemberData;
    if (memberData.communityRole === 'owner') throw new Error('Owner cannot leave. Transfer ownership first.');

    const displayName = memberData.displayName;

    await communityRef.collection('members').doc(uid).delete();
    await communityRef.update({
        memberCount: FieldValue.increment(-1),
    });

    // Send leave message
    await communityRef.collection('messages').add({
        senderId: 'system',
        senderName: 'Mentora',
        senderRole: 'tutor',
        text: `${displayName} left the community.`,
        type: 'announcement',
        createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
}

// ─── Members ─────────────────────────────────────────────────

export async function getMembers(communityId: string) {
    const snapshot = await communitiesRef
        .doc(communityId)
        .collection('members')
        .orderBy('joinedAt', 'asc')
        .get();

    return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
}

// ─── Messages ────────────────────────────────────────────────

export async function sendMessage(
    communityId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'tutor',
    text: string,
    type: 'text' | 'announcement' | 'resource' = 'text'
) {
    // Verify the sender is a member
    const memberDoc = await communitiesRef
        .doc(communityId)
        .collection('members')
        .doc(senderId)
        .get();

    if (!memberDoc.exists) throw new Error('You must be a member to send messages');

    const msgRef = await communitiesRef.doc(communityId).collection('messages').add({
        senderId,
        senderName,
        senderRole,
        text,
        type,
        createdAt: FieldValue.serverTimestamp(),
    });

    return { messageId: msgRef.id };
}

export async function getMessages(communityId: string, limitCount: number = 50) {
    const snapshot = await communitiesRef
        .doc(communityId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();

    return snapshot.docs
        .map((doc) => ({ messageId: doc.id, ...doc.data() }))
        .reverse(); // Return in chronological order
}
