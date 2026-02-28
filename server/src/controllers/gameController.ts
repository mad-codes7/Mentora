import { Request, Response } from 'express';
import * as gameService from '../services/gameService';

type Params = { communityId: string; gameId: string };

// POST /api/game/:communityId/create
export async function createGame(req: Request<Params>, res: Response) {
    try {
        const { communityId } = req.params;
        const { creatorUid, creatorName } = req.body;

        if (!creatorUid || !creatorName) {
            res.status(400).json({ error: 'Missing creatorUid or creatorName' });
            return;
        }

        const result = await gameService.createGame(communityId, creatorUid, creatorName);
        res.status(201).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create game';
        res.status(500).json({ error: message });
    }
}

// POST /api/game/:communityId/:gameId/join
export async function joinGame(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const { uid, displayName } = req.body;

        if (!uid || !displayName) {
            res.status(400).json({ error: 'Missing uid or displayName' });
            return;
        }

        const result = await gameService.joinGame(communityId, gameId, uid, displayName);
        res.status(200).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to join game';
        res.status(500).json({ error: message });
    }
}

// POST /api/game/:communityId/:gameId/start
export async function startGame(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const { creatorUid } = req.body;

        if (!creatorUid) {
            res.status(400).json({ error: 'Missing creatorUid' });
            return;
        }

        const result = await gameService.startGame(communityId, gameId, creatorUid);
        res.status(200).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to start game';
        res.status(500).json({ error: message });
    }
}

// POST /api/game/:communityId/:gameId/select-topic
export async function selectTopic(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const { uid, topic } = req.body;

        if (!uid || !topic) {
            res.status(400).json({ error: 'Missing uid or topic' });
            return;
        }

        const result = await gameService.selectTopic(communityId, gameId, uid, topic);
        res.status(200).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to select topic';
        res.status(500).json({ error: message });
    }
}

// POST /api/game/:communityId/:gameId/submit-answer
export async function submitAnswer(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const { uid, displayName, answer, timeTakenMs } = req.body;

        if (!uid || answer === undefined || timeTakenMs === undefined) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const result = await gameService.submitAnswer(communityId, gameId, uid, displayName, answer, timeTakenMs);
        res.status(200).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to submit answer';
        res.status(500).json({ error: message });
    }
}

// POST /api/game/:communityId/:gameId/advance
export async function advanceRound(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const result = await gameService.advanceRound(communityId, gameId);
        res.status(200).json({ data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to advance round';
        res.status(500).json({ error: message });
    }
}

// GET /api/game/:communityId/:gameId
export async function getGame(req: Request<Params>, res: Response) {
    try {
        const { communityId, gameId } = req.params;
        const game = await gameService.getGame(communityId, gameId);
        if (!game) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        res.status(200).json({ data: game });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get game';
        res.status(500).json({ error: message });
    }
}

// GET /api/game/:communityId
export async function listGames(req: Request<Params>, res: Response) {
    try {
        const { communityId } = req.params;
        const games = await gameService.listGames(communityId);
        res.status(200).json({ data: games });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to list games';
        res.status(500).json({ error: message });
    }
}

// GET /api/game/topics
export async function getTopics(req: Request, res: Response) {
    res.status(200).json({ data: gameService.getAvailableTopics() });
}
