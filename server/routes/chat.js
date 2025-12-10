import express from 'express';
import { getDb } from '../db/schema.js';
import { chatWithMentor } from '../services/llmService.js';

const router = express.Router();

// POST /api/chat - AI Mentor Chat
router.post('/', async (req, res) => {
    try {
        const { question_id, message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        let questionContext = '';

        // Get question context if provided
        if (question_id) {
            const db = getDb();
            const question = db.prepare(`
                SELECT q.*, GROUP_CONCAT(a.text, '|||') as answer_texts
                FROM questions q
                LEFT JOIN answers a ON q.id = a.question_id
                WHERE q.id = ?
                GROUP BY q.id
            `).get(question_id);

            if (question) {
                questionContext = `Question: ${question.text}\n\nAnswer options:\n${question.answer_texts ?
                        question.answer_texts.split('|||').map((a, i) => `${String.fromCharCode(65 + i)}. ${a}`).join('\n') :
                        'No answers available'
                    }`;

                if (question.explanation) {
                    questionContext += `\n\nExplanation: ${question.explanation}`;
                }
            }
        }

        // Prepare full message with context
        const fullMessage = questionContext
            ? `${questionContext}\n\n---\nStudent's question: ${message}`
            : message;

        // Call LLM service
        const response = await chatWithMentor(
            questionContext || 'No specific question context',
            message,
            history || []
        );

        res.json({
            response,
            question_id: question_id || null
        });
    } catch (error) {
        console.error('Chat error:', error);

        // Check if it's a configuration error
        if (error.message.includes('not configured')) {
            return res.status(503).json({
                error: 'AI Mentor not configured. Please set up LLM3 in Settings.',
                details: error.message
            });
        }

        res.status(500).json({ error: error.message });
    }
});

// GET /api/chat/status - Check if AI Mentor is configured
router.get('/status', (req, res) => {
    try {
        const db = getDb();
        const config = db.prepare(`SELECT * FROM llm_configs WHERE role = 'LLM3'`).get();

        res.json({
            configured: !!(config && config.api_key),
            provider: config?.provider || null,
            model: config?.model || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
