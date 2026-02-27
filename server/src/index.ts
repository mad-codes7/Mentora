import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import tutorRoutes from './routes/tutorRoutes';
import studentRoutes from './routes/studentRoutes';
import parentRoutes from './routes/parentRoutes';
import aiRoutes from './routes/aiRoutes';
import communityRoutes from './routes/communityRoutes';


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check route
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        message: 'Mentora API is running',
        timestamp: new Date().toISOString(),
    });
});

// Module routes
app.use('/api/tutor', tutorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/community', communityRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Mentora server is running on http://localhost:${PORT}`);
});

export default app;
