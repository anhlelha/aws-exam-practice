import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

// GET /api/sessions/active - Get active (incomplete) sessions
router.get('/active', (req, res) => {
    try {
        const db = getDb();

        const sessions = db.prepare(`
            SELECT ps.*, t.name as test_name, t.duration_minutes,
                (SELECT COUNT(*) FROM session_answers WHERE session_id = ps.id) as answered_count
            FROM practice_sessions ps
            JOIN tests t ON ps.test_id = t.id
            WHERE ps.completed_at IS NULL
            ORDER BY ps.started_at DESC
        `).all();

        res.json(sessions);
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sessions/history - Get completed sessions with scores
router.get('/history', (req, res) => {
    try {
        const db = getDb();
        const { limit = 10, offset = 0 } = req.query;

        const sessions = db.prepare(`
            SELECT 
                ps.*,
                t.name as test_name,
                t.duration_minutes,
                COUNT(sa.id) as questions_answered,
                SUM(CASE WHEN sa.flagged = 1 THEN 1 ELSE 0 END) as flagged_count
            FROM practice_sessions ps
            JOIN tests t ON ps.test_id = t.id
            LEFT JOIN session_answers sa ON ps.id = sa.session_id
            WHERE ps.completed_at IS NOT NULL
            GROUP BY ps.id
            ORDER BY ps.completed_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), parseInt(offset));

        const total = db.prepare(`
            SELECT COUNT(*) as count FROM practice_sessions WHERE completed_at IS NOT NULL
        `).get().count;

        res.json({
            sessions,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total
            }
        });
    } catch (error) {
        console.error('Get session history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sessions - Start new practice session
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { test_id, mode } = req.body;

        if (!test_id || !mode) {
            return res.status(400).json({ error: 'test_id and mode are required' });
        }

        if (!['timed', 'non-timed'].includes(mode)) {
            return res.status(400).json({ error: 'mode must be "timed" or "non-timed"' });
        }

        // Get test details
        const test = db.prepare(`SELECT * FROM tests WHERE id = ?`).get(test_id);
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Get questions for this test
        const questions = db.prepare(`
            SELECT q.*, tq.order_index 
            FROM questions q
            JOIN test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
            ORDER BY tq.order_index
        `).all(test_id);

        // Get answers for each question
        const stmtAnswers = db.prepare(`SELECT * FROM answers WHERE question_id = ? ORDER BY order_index`);
        const questionsWithAnswers = questions.map(q => ({
            ...q,
            answers: stmtAnswers.all(q.id)
        }));

        // Create practice session
        const result = db.prepare(`
            INSERT INTO practice_sessions (test_id, mode, total_questions)
            VALUES (?, ?, ?)
        `).run(test_id, mode, questions.length);

        const sessionId = result.lastInsertRowid;

        res.json({
            session_id: Number(sessionId),
            test_name: test.name,
            questions: questionsWithAnswers,
            duration_minutes: test.duration_minutes,
            mode: mode
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sessions/:id - Get session state
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;

        // Get session
        const session = db.prepare(`
            SELECT ps.*, t.name as test_name, t.duration_minutes
            FROM practice_sessions ps
            LEFT JOIN tests t ON ps.test_id = t.id
            WHERE ps.id = ?
        `).get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get questions for this test
        const questions = db.prepare(`
            SELECT q.*, tq.order_index 
            FROM questions q
            JOIN test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
            ORDER BY tq.order_index
        `).all(session.test_id);

        // Get answers for each question
        const stmtAnswers = db.prepare(`SELECT * FROM answers WHERE question_id = ? ORDER BY order_index`);
        const questionsWithAnswers = questions.map(q => ({
            ...q,
            answers: stmtAnswers.all(q.id)
        }));

        // Get submitted answers for this session
        const answersGiven = db.prepare(`
            SELECT * FROM session_answers WHERE session_id = ?
        `).all(sessionId);

        // Create a map of answered questions
        const answersMap = {};
        answersGiven.forEach(a => {
            answersMap[a.question_id] = {
                selected_answer_ids: a.selected_answer_ids ? JSON.parse(a.selected_answer_ids) : [],
                is_correct: a.is_correct,
                flagged: a.flagged
            };
        });

        res.json({
            session,
            questions: questionsWithAnswers,
            answers_given: answersMap
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/sessions/:id/answer - Submit answer
router.put('/:id/answer', (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;
        const { question_id, selected_answers } = req.body;

        if (!question_id || !Array.isArray(selected_answers)) {
            return res.status(400).json({ error: 'question_id and selected_answers array are required' });
        }

        // Check session exists and is not completed
        const session = db.prepare(`SELECT * FROM practice_sessions WHERE id = ?`).get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (session.completed_at) {
            return res.status(400).json({ error: 'Session already completed' });
        }

        // Get correct answers for this question
        const correctAnswers = db.prepare(`
            SELECT id FROM answers WHERE question_id = ? AND is_correct = 1
        `).all(question_id);
        const correctIds = correctAnswers.map(a => a.id);

        // Check if answer is correct (all correct answers selected, no wrong ones)
        const isCorrect = selected_answers.length === correctIds.length &&
            selected_answers.every(id => correctIds.includes(id));

        // Check if already answered
        const existing = db.prepare(`
            SELECT id FROM session_answers WHERE session_id = ? AND question_id = ?
        `).get(sessionId, question_id);

        if (existing) {
            // Update existing answer
            db.prepare(`
                UPDATE session_answers 
                SET selected_answer_ids = ?, is_correct = ?, answered_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(JSON.stringify(selected_answers), isCorrect ? 1 : 0, existing.id);
        } else {
            // Insert new answer
            db.prepare(`
                INSERT INTO session_answers (session_id, question_id, selected_answer_ids, is_correct)
                VALUES (?, ?, ?, ?)
            `).run(sessionId, question_id, JSON.stringify(selected_answers), isCorrect ? 1 : 0);
        }

        res.json({
            success: true,
            is_correct: isCorrect,
            question_id
        });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sessions/:id/complete - Finish session
router.post('/:id/complete', (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;

        // Get session
        const session = db.prepare(`SELECT * FROM practice_sessions WHERE id = ?`).get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (session.completed_at) {
            return res.status(400).json({ error: 'Session already completed' });
        }

        // Calculate results
        const answers = db.prepare(`
            SELECT * FROM session_answers WHERE session_id = ?
        `).all(sessionId);

        const total = session.total_questions;
        const correctCount = answers.filter(a => a.is_correct).length;
        const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

        // Calculate time taken using SQLite for accuracy (avoids timezone issues)
        const timeResult = db.prepare(`
            SELECT 
                CAST((julianday('now') - julianday(started_at)) * 24 * 60 * 60 AS INTEGER) as seconds,
                CAST((julianday('now') - julianday(started_at)) * 24 * 60 AS INTEGER) as minutes
            FROM practice_sessions WHERE id = ?
        `).get(sessionId);

        const timeTakenSeconds = Math.max(0, timeResult?.seconds || 0);
        const timeTakenMinutes = Math.max(0, timeResult?.minutes || 0);

        // Update session
        db.prepare(`
            UPDATE practice_sessions 
            SET completed_at = CURRENT_TIMESTAMP, score = ?, correct_count = ?
            WHERE id = ?
        `).run(score, correctCount, sessionId);

        // Get detailed breakdown per question
        const breakdown = answers.map(a => {
            const question = db.prepare(`SELECT text FROM questions WHERE id = ?`).get(a.question_id);
            return {
                question_id: a.question_id,
                question_text: question?.text?.substring(0, 100) + '...',
                is_correct: !!a.is_correct,
                flagged: !!a.flagged
            };
        });

        res.json({
            score,
            total,
            correct_count: correctCount,
            time_taken_seconds: timeTakenSeconds,
            time_taken_minutes: timeTakenMinutes,
            breakdown
        });
    } catch (error) {
        console.error('Complete session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/sessions/:id/flag - Toggle flag on question
router.put('/:id/flag', (req, res) => {
    try {
        const db = getDb();
        const sessionId = req.params.id;
        const { question_id, flagged } = req.body;

        if (question_id === undefined || flagged === undefined) {
            return res.status(400).json({ error: 'question_id and flagged are required' });
        }

        // Check session exists
        const session = db.prepare(`SELECT * FROM practice_sessions WHERE id = ?`).get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if answer record exists
        const existing = db.prepare(`
            SELECT id FROM session_answers WHERE session_id = ? AND question_id = ?
        `).get(sessionId, question_id);

        if (existing) {
            // Update existing
            db.prepare(`
                UPDATE session_answers SET flagged = ? WHERE id = ?
            `).run(flagged ? 1 : 0, existing.id);
        } else {
            // Insert new record with just the flag
            db.prepare(`
                INSERT INTO session_answers (session_id, question_id, flagged)
                VALUES (?, ?, ?)
            `).run(sessionId, question_id, flagged ? 1 : 0);
        }

        res.json({
            success: true,
            question_id,
            flagged
        });
    } catch (error) {
        console.error('Flag question error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
