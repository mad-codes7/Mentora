import { Router } from 'express';
import * as gameController from '../controllers/gameController';

const router = Router();

// Game topics
router.get('/topics', gameController.getTopics);

// Game CRUD
router.post('/:communityId/create', gameController.createGame);
router.get('/:communityId', gameController.listGames);
router.get('/:communityId/:gameId', gameController.getGame);
router.post('/:communityId/:gameId/join', gameController.joinGame);
router.post('/:communityId/:gameId/start', gameController.startGame);
router.post('/:communityId/:gameId/select-topic', gameController.selectTopic);
router.post('/:communityId/:gameId/submit-answer', gameController.submitAnswer);
router.post('/:communityId/:gameId/advance', gameController.advanceRound);

export default router;
