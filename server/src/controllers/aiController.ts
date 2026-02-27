import { Request, Response } from 'express';
import * as aiService from '../services/aiService';

// POST /api/ai/chat
export async function chat(req: Request, res: Response) {
    try {
        const { messages, topic } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ error: 'messages array is required' });
            return;
        }

        const reply = await aiService.chatWithTutor(messages, topic);
        res.status(200).json({ data: { reply } });
    } catch (error: unknown) {
        console.error('[AI Chat] Error:', error);
        const message = error instanceof Error ? error.message : 'AI chat failed';
        res.status(500).json({ error: message });
    }
}

// POST /api/ai/generate-quiz
export async function generateQuiz(req: Request, res: Response) {
    try {
        const { topic, numQuestions } = req.body;

        if (!topic) {
            res.status(400).json({ error: 'topic is required' });
            return;
        }

        const reply = await aiService.generateQuiz(topic, numQuestions || 5);
        res.status(200).json({ data: { reply } });
    } catch (error: unknown) {
        console.error('[AI Quiz] Error:', error);
        const message = error instanceof Error ? error.message : 'Quiz generation failed';
        res.status(500).json({ error: message });
    }
}
