import express from 'express';
import { getDb } from '../db/schema.js';
import {
    selectRandomQuestions,
    selectWeightedQuestions,
    selectSmartQuestions,
    getAvailableQuestionCount
} from '../services/questionSelector.js';

const router = express.Router();

// GET /api/tests/stats - Get question pool statistics
router.get('/stats', (req, res) => {
    try {
        const stats = getAvailableQuestionCount();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tests/preview - Preview questions for a new test
router.post('/preview', (req, res) => {
    try {
        const {
            count = 10,
            selection_mode = 'random',
            category_ids = [],
            tag_ids = [],
            weights = []
        } = req.body;

        let questions;

        switch (selection_mode) {
            case 'random':
                questions = selectRandomQuestions({ count, categoryIds: category_ids, tagIds: tag_ids });
                break;
            case 'weighted':
                questions = selectWeightedQuestions({ count, weights });
                break;
            case 'new':
            case 'wrong':
            case 'flagged':
                questions = selectSmartQuestions({ count, mode: selection_mode });
                break;
            default:
                questions = selectRandomQuestions({ count });
        }

        res.json({
            count: questions.length,
            questions: questions.map(q => ({
                id: q.id,
                text: q.text.substring(0, 100) + (q.text.length > 100 ? '...' : ''),
                category_name: q.category_name
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tests/create-with-selection - Create test with selected questions
router.post('/create-with-selection', (req, res) => {
    try {
        const db = getDb();
        const {
            name,
            duration_minutes = 60,
            count = 10,
            selection_mode = 'random',
            category_ids = [],
            tag_ids = [],
            weights = []
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Test name is required' });
        }

        // Select questions
        let questions;
        switch (selection_mode) {
            case 'random':
                questions = selectRandomQuestions({ count, categoryIds: category_ids, tagIds: tag_ids });
                break;
            case 'weighted':
                questions = selectWeightedQuestions({ count, weights });
                break;
            case 'new':
            case 'wrong':
            case 'flagged':
                questions = selectSmartQuestions({ count, mode: selection_mode });
                break;
            default:
                questions = selectRandomQuestions({ count });
        }

        if (questions.length === 0) {
            return res.status(400).json({ error: 'No questions available for selection' });
        }

        // Create test
        const result = db.prepare(`
            INSERT INTO tests (name, duration_minutes)
            VALUES (?, ?)
        `).run(name, duration_minutes);

        const testId = result.lastInsertRowid;

        // Add questions to test
        const insertTestQuestion = db.prepare(`
            INSERT INTO test_questions (test_id, question_id, order_index)
            VALUES (?, ?, ?)
        `);

        questions.forEach((q, index) => {
            insertTestQuestion.run(testId, q.id, index + 1);
        });

        res.json({
            success: true,
            test_id: Number(testId),
            name,
            question_count: questions.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/tests - Get all tests
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const tests = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id) as question_count
      FROM tests t
      ORDER BY t.created_at DESC
    `).all();

        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tests - Create new test
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { name, duration_minutes, question_ids } = req.body;

        const result = db.prepare(`
      INSERT INTO tests (name, duration_minutes) VALUES (?, ?)
    `).run(name, duration_minutes || 65);

        const testId = result.lastInsertRowid;

        // Add questions to test
        if (question_ids && question_ids.length > 0) {
            const insert = db.prepare(`INSERT INTO test_questions (test_id, question_id, order_index) VALUES (?, ?, ?)`);
            question_ids.forEach((qId, i) => insert.run(testId, qId, i));
        }

        res.json({ success: true, id: testId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tests/generate - Generate test based on criteria
router.post('/generate', (req, res) => {
    try {
        const db = getDb();
        const { category_id, tag_ids, count = 20, name } = req.body;

        let query = `SELECT q.id FROM questions q WHERE 1=1`;
        const params = [];

        if (category_id) {
            query += ` AND q.category_id = ?`;
            params.push(category_id);
        }

        if (tag_ids && tag_ids.length > 0) {
            query += ` AND q.id IN (SELECT question_id FROM question_tags WHERE tag_id IN (${tag_ids.map(() => '?').join(',')}))`;
            params.push(...tag_ids);
        }

        query += ` ORDER BY RANDOM() LIMIT ?`;
        params.push(count);

        const questions = db.prepare(query).all(...params);
        const questionIds = questions.map(q => q.id);

        // Create test
        const result = db.prepare(`INSERT INTO tests (name, duration_minutes) VALUES (?, ?)`).run(
            name || `Practice Test - ${new Date().toLocaleDateString()}`,
            Math.ceil(count * 1.5) // ~1.5 min per question
        );

        const testId = result.lastInsertRowid;
        const insert = db.prepare(`INSERT INTO test_questions (test_id, question_id, order_index) VALUES (?, ?, ?)`);
        questionIds.forEach((qId, i) => insert.run(testId, qId, i));

        res.json({
            success: true,
            test_id: testId,
            question_count: questionIds.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/tests/:id - Get test with questions
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const test = db.prepare(`SELECT * FROM tests WHERE id = ?`).get(req.params.id);

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        test.questions = db.prepare(`
      SELECT q.*, tq.order_index FROM questions q
      JOIN test_questions tq ON q.id = tq.question_id
      WHERE tq.test_id = ?
      ORDER BY tq.order_index
    `).all(req.params.id);

        // Get answers for each question
        const stmtAnswers = db.prepare(`SELECT * FROM answers WHERE question_id = ? ORDER BY order_index`);
        test.questions = test.questions.map(q => ({
            ...q,
            answers: stmtAnswers.all(q.id)
        }));

        res.json(test);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/tests/:id/questions - Get all questions in a test (for preview)
router.get('/:id/questions', (req, res) => {
    try {
        const db = getDb();
        const testId = req.params.id;

        const test = db.prepare(`SELECT * FROM tests WHERE id = ?`).get(testId);
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        const questions = db.prepare(`
            SELECT q.id, q.text, q.explanation, c.name as category_name, c.color as category_color,
                   GROUP_CONCAT(t.name) as tags
            FROM questions q
            JOIN test_questions tq ON q.id = tq.question_id
            LEFT JOIN categories c ON q.category_id = c.id
            LEFT JOIN question_tags qt ON q.id = qt.question_id
            LEFT JOIN tags t ON qt.tag_id = t.id
            WHERE tq.test_id = ?
            GROUP BY q.id
            ORDER BY tq.order_index
        `).all(testId);

        res.json({
            test,
            questions: questions.map(q => ({
                ...q,
                tags: q.tags ? q.tags.split(',') : []
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/tests/:id - Delete a test
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const testId = req.params.id;

        const test = db.prepare(`SELECT * FROM tests WHERE id = ?`).get(testId);
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Delete test questions first
        db.prepare(`DELETE FROM test_questions WHERE test_id = ?`).run(testId);
        // Delete the test
        db.prepare(`DELETE FROM tests WHERE id = ?`).run(testId);

        res.json({ success: true, message: 'Test deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
