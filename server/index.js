import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/schema.js';
import uploadRoutes from './routes/upload.js';
import questionsRoutes from './routes/questions.js';
import testsRoutes from './routes/tests.js';
import settingsRoutes from './routes/settings.js';
import sessionsRoutes from './routes/sessions.js';
import chatRoutes from './routes/chat.js';
import categoriesRoutes from './routes/categories.js';
import dataRoutes from './routes/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://aws-exam-practice.vercel.app', /\.vercel\.app$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
// Serve diagram files at /diagrams/ URL
app.use('/diagrams', express.static(path.join(__dirname, '../uploads/diagrams')));

// Initialize database
initDatabase();

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
