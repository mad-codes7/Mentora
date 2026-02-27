import { Request, Response } from 'express';
import * as communityService from '../services/communityService';

// POST /api/community
export const createCommunity = async (req: Request, res: Response): Promise<void> => {
    try {
        const community = await communityService.createCommunity(req.body);
        res.status(201).json(community);
    } catch (error: any) {
        console.error('Error creating community:', error);
        res.status(500).json({ error: error.message || 'Failed to create community' });
    }
};

// GET /api/community
export const listCommunities = async (req: Request, res: Response): Promise<void> => {
    try {
        const tag = req.query.tag as string | undefined;
        const communities = await communityService.listCommunities(tag);
        res.json(communities);
    } catch (error: any) {
        console.error('Error listing communities:', error);
        res.status(500).json({ error: error.message || 'Failed to list communities' });
    }
};

// GET /api/community/user/:uid
export const getUserCommunities = async (req: Request, res: Response): Promise<void> => {
    try {
        const uid = String(req.params.uid);
        const communities = await communityService.getUserCommunities(uid);
        res.json(communities);
    } catch (error: any) {
        console.error('Error fetching user communities:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch user communities' });
    }
};

// GET /api/community/:id
export const getCommunity = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const community = await communityService.getCommunity(id);
        if (!community) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }
        res.json(community);
    } catch (error: any) {
        console.error('Error fetching community:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch community' });
    }
};

// POST /api/community/:id/join
export const joinCommunity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid, displayName, userRole } = req.body;
        const id = String(req.params.id);
        const result = await communityService.joinCommunity(id, uid, displayName, userRole);
        res.json(result);
    } catch (error: any) {
        console.error('Error joining community:', error);
        const status = error.message === 'Community not found' ? 404
            : error.message === 'Community is full' ? 400
                : error.message === 'Already a member' ? 409
                    : 500;
        res.status(status).json({ error: error.message || 'Failed to join community' });
    }
};

// POST /api/community/:id/leave
export const leaveCommunity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid } = req.body;
        const id = String(req.params.id);
        const result = await communityService.leaveCommunity(id, uid);
        res.json(result);
    } catch (error: any) {
        console.error('Error leaving community:', error);
        res.status(400).json({ error: error.message || 'Failed to leave community' });
    }
};

// GET /api/community/:id/members
export const getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const members = await communityService.getMembers(id);
        res.json(members);
    } catch (error: any) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch members' });
    }
};

// POST /api/community/:id/messages
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { senderId, senderName, senderRole, text, type } = req.body;
        const id = String(req.params.id);
        const result = await communityService.sendMessage(id, senderId, senderName, senderRole, text, type);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error sending message:', error);
        res.status(400).json({ error: error.message || 'Failed to send message' });
    }
};

// GET /api/community/:id/messages
export const getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const limit = parseInt(req.query.limit as string) || 50;
        const messages = await communityService.getMessages(id, limit);
        res.json(messages);
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
};
