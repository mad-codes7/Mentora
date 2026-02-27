import { Router } from 'express';
import * as communityController from '../controllers/communityController';

const router = Router();

// Community CRUD
router.post('/', communityController.createCommunity);
router.get('/', communityController.listCommunities);
router.get('/user/:uid', communityController.getUserCommunities);
router.get('/:id', communityController.getCommunity);

// Membership
router.post('/:id/join', communityController.joinCommunity);
router.post('/:id/leave', communityController.leaveCommunity);
router.get('/:id/members', communityController.getMembers);

// Messages
router.post('/:id/messages', communityController.sendMessage);
router.get('/:id/messages', communityController.getMessages);

export default router;
