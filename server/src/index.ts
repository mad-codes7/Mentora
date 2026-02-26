import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import tutorRoutes from './routes/tutorRoutes';


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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Mentora server is running on http://localhost:${PORT}`);
});

export default app;
