import { Router } from 'express';
import * as parentController from '../controllers/parentController';

const router = Router();

// Profile
router.get('/profile/:uid', parentController.getProfile);

// Link Student
router.post('/link-student', parentController.linkStudent);

// Linked Students
router.get('/students/:uid', parentController.getLinkedStudents);

// Sessions (for all linked students)
router.get('/sessions/:uid', parentController.getSessions);

// Spending Summary
router.get('/spending/:uid', parentController.getSpending);

// Tutor Reviews
router.get('/reviews/:uid', parentController.getReviews);

export default router;
