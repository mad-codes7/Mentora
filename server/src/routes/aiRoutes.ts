import { Router } from 'express';
import * as aiController from '../controllers/aiController';

const router = Router();

router.post('/chat', aiController.chat);
router.post('/generate-quiz', aiController.generateQuiz);

export default router;
