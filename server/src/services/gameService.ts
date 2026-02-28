import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { chatWithTutor } from './aiService';

// ─── Scoring Constants ───────────────────────────────────────

const QUESTION_TIME_LIMIT_MS = 20000;  // 20 seconds
const MAX_SCORE = 100;
const MIN_CORRECT_SCORE = 10;
const WRONG_PENALTY = -25;
const MAX_PARTICIPANTS = 10;

function calculateScore(isCorrect: boolean, timeTakenMs: number, didAttempt: boolean): number {
    if (!didAttempt) return 0;
    if (!isCorrect) return WRONG_PENALTY;
    // Correct: 100 at 0ms, linearly decreasing to 10 at 20000ms
    const timeFraction = Math.min(timeTakenMs / QUESTION_TIME_LIMIT_MS, 1);
    return Math.max(MIN_CORRECT_SCORE, Math.round(MAX_SCORE - timeFraction * (MAX_SCORE - MIN_CORRECT_SCORE)));
}

// ─── Create Game ─────────────────────────────────────────────

export async function createGame(communityId: string, creatorUid: string, creatorName: string) {
    const communityRef = adminDb.collection('communities').doc(communityId);
    const communityDoc = await communityRef.get();
    if (!communityDoc.exists) throw new Error('Community not found');

    const gameRef = communityRef.collection('games').doc();
    const gameData = {
        status: 'lobby',
        createdBy: creatorUid,
        createdByName: creatorName,
        participants: [{
            uid: creatorUid,
            displayName: creatorName,
            totalScore: 0,
            answeredCount: 0,
            joinedAt: FieldValue.serverTimestamp(),
        }],
        rounds: [],
        currentRound: 0,
        totalRounds: 1,  // Will be updated when game starts
        rankings: [],
        createdAt: FieldValue.serverTimestamp(),
    };

    await gameRef.set(gameData);

    // Send announcement to community chat
    await communityRef.collection('messages').add({
        senderId: 'system',
        senderName: 'Mentora',
        senderRole: 'tutor',
        text: `🎮 ${creatorName} started a Speed Concept Battle! Join now from the games menu!`,
        type: 'game_invite',
        gameId: gameRef.id,
        createdAt: FieldValue.serverTimestamp(),
    });

    return { gameId: gameRef.id, ...gameData };
}

// ─── Join Game ───────────────────────────────────────────────

export async function joinGame(communityId: string, gameId: string, uid: string, displayName: string) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new Error('Game not found');
    const game = gameDoc.data()!;

    if (game.status !== 'lobby') throw new Error('Game has already started');
    if (game.participants.length >= MAX_PARTICIPANTS) throw new Error('Game is full (max 10 players)');
    if (game.participants.some((p: { uid: string }) => p.uid === uid)) throw new Error('Already in the game');

    await gameRef.update({
        participants: FieldValue.arrayUnion({
            uid,
            displayName,
            totalScore: 0,
            answeredCount: 0,
            joinedAt: new Date().toISOString(),
        }),
    });

    return { gameId, joined: true };
}

// ─── Start Game ──────────────────────────────────────────────

export async function startGame(communityId: string, gameId: string, creatorUid: string) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new Error('Game not found');
    const game = gameDoc.data()!;

    if (game.createdBy !== creatorUid) throw new Error('Only the creator can start the game');
    if (game.status !== 'lobby') throw new Error('Game has already started');
    if (game.participants.length < 2) throw new Error('Need at least 2 players to start');

    const totalRounds = game.participants.length;

    // Create empty rounds — each participant gets to choose a topic
    const rounds = game.participants.map((p: { uid: string }, i: number) => ({
        roundIndex: i,
        topicChosenBy: p.uid,
        topic: '',
        question: null,
        responses: [],
        status: 'waiting_topic',
    }));

    await gameRef.update({
        status: 'topic_selection',
        totalRounds,
        currentRound: 0,
        rounds,
    });

    return { gameId, status: 'topic_selection', totalRounds };
}

// ─── Select Topic & Generate Question ────────────────────────

const QUIZ_TOPICS = [
    'Algebra', 'Geometry', 'Calculus', 'Trigonometry', 'Statistics',
    'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'Mechanics', 'Optics', 'Thermodynamics', 'Organic Chemistry',
    'English Grammar', 'World History', 'Geography',
];

export function getAvailableTopics() {
    return QUIZ_TOPICS;
}

export async function selectTopic(communityId: string, gameId: string, uid: string, topic: string) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new Error('Game not found');
    const game = gameDoc.data()!;

    if (game.status !== 'topic_selection') throw new Error('Not in topic selection phase');

    const currentRound = game.currentRound;
    const round = game.rounds[currentRound];

    if (round.topicChosenBy !== uid) throw new Error('Not your turn to choose a topic');
    if (round.topic) throw new Error('Topic already selected for this round');

    // Generate a single question using AI service
    let question;
    try {
        const prompt = `Generate exactly 1 multiple-choice question about "${topic}" for a quiz game. Return ONLY valid JSON in this exact format, no markdown:
{"questionText":"the question","options":["A","B","C","D"],"correctAnswer":"the correct option text"}`;
        const aiResponse = await chatWithTutor([{ role: 'user', content: prompt }], topic);
        // Extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            question = {
                text: parsed.questionText,
                options: parsed.options,
                correctAnswer: parsed.correctAnswer,
            };
        }
    } catch (err) {
        console.warn('AI question generation failed, using fallback:', err);
    }

    // Fallback question if AI fails
    if (!question) {
        question = {
            text: `What is a key concept in ${topic}?`,
            options: [
                `Core principle of ${topic}`,
                `Advanced theory in ${topic}`,
                `Basic formula of ${topic}`,
                `None of the above`,
            ],
            correctAnswer: `Core principle of ${topic}`,
        };
    }

    const rounds = [...game.rounds];
    rounds[currentRound] = {
        ...rounds[currentRound],
        topic,
        question,
        status: 'active',
    };

    await gameRef.update({
        status: 'in_progress',
        rounds,
    });

    return { gameId, round: currentRound, topic, question };
}

// ─── Submit Answer ───────────────────────────────────────────

export async function submitAnswer(
    communityId: string,
    gameId: string,
    uid: string,
    displayName: string,
    answer: string,
    timeTakenMs: number
) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new Error('Game not found');
    const game = gameDoc.data()!;

    if (game.status !== 'in_progress') throw new Error('Game is not in progress');

    const currentRound = game.currentRound;
    const round = game.rounds[currentRound];

    if (round.status !== 'active') throw new Error('Round is not active');
    if (round.responses.some((r: { uid: string }) => r.uid === uid)) {
        throw new Error('Already answered this round');
    }

    const isCorrect = answer === round.question.correctAnswer;
    const score = calculateScore(isCorrect, timeTakenMs, true);

    const response = {
        uid,
        displayName,
        answer,
        timeTakenMs,
        score,
        isCorrect,
    };

    const rounds = [...game.rounds];
    rounds[currentRound] = {
        ...rounds[currentRound],
        responses: [...rounds[currentRound].responses, response],
    };

    // Update participant's total score
    const participants = game.participants.map((p: { uid: string; totalScore: number; answeredCount: number }) => {
        if (p.uid === uid) {
            return {
                ...p,
                totalScore: (p.totalScore || 0) + score,
                answeredCount: (p.answeredCount || 0) + 1,
            };
        }
        return p;
    });

    await gameRef.update({ rounds, participants });

    return { score, isCorrect, timeTakenMs };
}

// ─── Advance Round ───────────────────────────────────────────

export async function advanceRound(communityId: string, gameId: string) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new Error('Game not found');
    const game = gameDoc.data()!;

    const currentRound = game.currentRound;
    const rounds = [...game.rounds];
    rounds[currentRound] = { ...rounds[currentRound], status: 'completed' };

    const nextRound = currentRound + 1;

    if (nextRound >= game.totalRounds) {
        // Game finished — calculate final rankings
        const rankings = calculateRankings(game.participants, rounds);
        await gameRef.update({
            rounds,
            currentRound: nextRound,
            status: 'completed',
            rankings,
        });
        return { status: 'completed', rankings };
    } else {
        await gameRef.update({
            rounds,
            currentRound: nextRound,
            status: 'topic_selection',
        });
        return { status: 'topic_selection', nextRound };
    }
}

// ─── Calculate Rankings ──────────────────────────────────────

function calculateRankings(
    participants: { uid: string; displayName: string; totalScore: number; answeredCount: number }[],
    rounds: { topic: string; responses: { uid: string; score: number }[] }[]
) {
    // Calculate average score for each participant
    const playerStats = participants.map(p => {
        const answeredCount = p.answeredCount || 1;
        const avgScore = Math.round((p.totalScore || 0) / answeredCount * 100) / 100;

        // Find worst topic (lowest score round)
        let worstTopic = '';
        let worstScore = Infinity;
        rounds.forEach(round => {
            const response = round.responses.find((r: { uid: string }) => r.uid === p.uid);
            if (response && response.score < worstScore) {
                worstScore = response.score;
                worstTopic = round.topic || 'General';
            }
        });

        return {
            uid: p.uid,
            displayName: p.displayName,
            avgScore,
            totalScore: p.totalScore || 0,
            rank: 0,
            worstTopic,
        };
    });

    // Sort by average score descending
    playerStats.sort((a, b) => b.avgScore - a.avgScore);

    // Assign ranks
    playerStats.forEach((p, i) => { p.rank = i + 1; });

    return playerStats;
}

// ─── Get Game ────────────────────────────────────────────────

export async function getGame(communityId: string, gameId: string) {
    const gameRef = adminDb.collection('communities').doc(communityId).collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) return null;
    return { gameId: gameDoc.id, communityId, ...gameDoc.data() };
}

// ─── List Games ──────────────────────────────────────────────

export async function listGames(communityId: string) {
    const gamesRef = adminDb.collection('communities').doc(communityId).collection('games');

    // Get recent games (lobby + in_progress + completed in last 24 hours)
    const snapshot = await gamesRef.orderBy('createdAt', 'desc').limit(20).get();

    return snapshot.docs.map(doc => ({
        gameId: doc.id,
        communityId,
        ...doc.data(),
    }));
}
