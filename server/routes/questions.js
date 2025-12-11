import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db/schema.js';
import { classifyQuestionWithLLM, tagQuestionWithLLM } from '../services/llmService.js';
import { generateDiagram } from '../services/diagramGenerator.js';

const router = express.Router();

// Multer setup for diagram uploads
const diagramStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/diagrams/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `diagram_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const diagramUpload = multer({
    storage: diagramStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.drawio', '.png', '.jpg', '.jpeg', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// GET /api/questions/categories - Get all categories
router.get('/categories', (req, res) => {
    try {
        const db = getDb();
        const categories = db.prepare(`SELECT * FROM categories ORDER BY id`).all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/questions/tags - Get all tags
router.get('/tags', (req, res) => {
    try {
        const db = getDb();
        const tags = db.prepare(`SELECT * FROM tags ORDER BY name`).all();
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/:id/auto-tag - Auto-tag a single question
router.post('/:id/auto-tag', async (req, res) => {
    try {
        const db = getDb();
        const questionId = req.params.id;

        const question = db.prepare(`
            SELECT q.*, 
                GROUP_CONCAT(a.text, '|||') as answer_texts
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            WHERE q.id = ?
            GROUP BY q.id
        `).get(questionId);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const tags = await tagQuestionWithLLM(question);

        if (tags.length === 0) {
            return res.json({ success: true, tags: [], message: 'No tags identified' });
        }

        // Insert tags if they don't exist, get their IDs
        const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
        const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`);
        const insertQuestionTag = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);

        const tagIds = [];
        for (const tagName of tags) {
            insertTag.run(tagName);
            const tag = getTagId.get(tagName);
            if (tag) {
                tagIds.push(tag.id);
                insertQuestionTag.run(questionId, tag.id);
            }
        }

        res.json({ success: true, tags, tag_ids: tagIds });
    } catch (error) {
        console.error('Auto-tag error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/:id/auto-classify - Auto-classify a single question
router.post('/:id/auto-classify', async (req, res) => {
    try {
        const db = getDb();
        const questionId = req.params.id;
        const categories = db.prepare(`SELECT * FROM categories`).all();

        const question = db.prepare(`
            SELECT q.*, 
                GROUP_CONCAT(a.text, '|||') as answer_texts,
                GROUP_CONCAT(t.name, ',') as tags
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            LEFT JOIN question_tags qt ON q.id = qt.question_id
            LEFT JOIN tags t ON qt.tag_id = t.id
            WHERE q.id = ?
            GROUP BY q.id
        `).get(questionId);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const categoryId = await classifyQuestionWithLLM(question, categories);

        if (categoryId) {
            db.prepare(`UPDATE questions SET category_id = ? WHERE id = ?`).run(categoryId, questionId);
            const category = categories.find(c => c.id === categoryId);
            res.json({
                success: true,
                category_id: categoryId,
                category_name: category?.name
            });
        } else {
            res.json({ success: false, message: 'Could not determine category' });
        }
    } catch (error) {
        console.error('Auto-classify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/bulk-tag - Tag multiple questions
router.post('/bulk-tag', async (req, res) => {
    try {
        const db = getDb();
        const { question_ids } = req.body;

        if (!question_ids || !Array.isArray(question_ids)) {
            return res.status(400).json({ error: 'question_ids array required' });
        }

        const results = [];
        for (const qId of question_ids) {
            try {
                const question = db.prepare(`
                    SELECT q.*, 
                        GROUP_CONCAT(a.text, '|||') as answer_texts
                    FROM questions q
                    LEFT JOIN answers a ON q.id = a.question_id
                    WHERE q.id = ?
                    GROUP BY q.id
                `).get(qId);

                if (question) {
                    const tags = await tagQuestionWithLLM(question);

                    const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
                    const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`);
                    const insertQuestionTag = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);

                    for (const tagName of tags) {
                        insertTag.run(tagName);
                        const tag = getTagId.get(tagName);
                        if (tag) {
                            insertQuestionTag.run(qId, tag.id);
                        }
                    }

                    results.push({ question_id: qId, tags, success: true });
                } else {
                    results.push({ question_id: qId, error: 'Question not found', success: false });
                }
            } catch (err) {
                results.push({ question_id: qId, error: err.message, success: false });
            }
        }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/bulk-classify - Classify multiple questions
router.post('/bulk-classify', async (req, res) => {
    try {
        const db = getDb();
        const { question_ids } = req.body;
        const categories = db.prepare(`SELECT * FROM categories`).all();

        if (!question_ids || !Array.isArray(question_ids)) {
            return res.status(400).json({ error: 'question_ids array required' });
        }

        const results = [];
        for (const qId of question_ids) {
            try {
                const question = db.prepare(`
                    SELECT q.*, 
                        GROUP_CONCAT(a.text, '|||') as answer_texts,
                        GROUP_CONCAT(t.name, ',') as tags
                    FROM questions q
                    LEFT JOIN answers a ON q.id = a.question_id
                    LEFT JOIN question_tags qt ON q.id = qt.question_id
                    LEFT JOIN tags t ON qt.tag_id = t.id
                    WHERE q.id = ?
                    GROUP BY q.id
                `).get(qId);

                if (question) {
                    const categoryId = await classifyQuestionWithLLM(question, categories);

                    if (categoryId) {
                        db.prepare(`UPDATE questions SET category_id = ? WHERE id = ?`)
                            .run(categoryId, qId);
                    }

                    const category = categories.find(c => c.id === categoryId);
                    results.push({
                        question_id: qId,
                        category_id: categoryId,
                        category_name: category?.name,
                        success: true
                    });
                }
            } catch (err) {
                results.push({ question_id: qId, error: err.message, success: false });
            }
        }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions - Create new question manually
router.post('/', async (req, res) => {
    try {
        const db = getDb();
        // Accept both camelCase and snake_case formats
        const text = req.body.text;
        const rawAnswers = req.body.answers || [];
        const explanation = req.body.explanation;
        const isMultipleChoice = req.body.isMultipleChoice ?? req.body.is_multiple_choice ?? false;
        const categoryId = req.body.categoryId ?? req.body.category_id ?? null;
        const tags = req.body.tags || [];

        // Normalize answers to handle both is_correct and isCorrect
        const answers = rawAnswers.map(a => ({
            text: a.text,
            isCorrect: a.isCorrect ?? a.is_correct ?? false
        }));

        // Validation
        if (!text || !answers || answers.length < 2) {
            return res.status(400).json({ error: 'Question text and at least 2 answers required' });
        }

        const hasCorrect = answers.some(a => a.isCorrect);
        if (!hasCorrect) {
            return res.status(400).json({ error: 'At least one answer must be marked as correct' });
        }

        // Insert question
        const result = db.prepare(`
            INSERT INTO questions (text, explanation, is_multiple_choice, category_id, source_file)
            VALUES (?, ?, ?, ?, 'manual_entry')
        `).run(text, explanation || null, isMultipleChoice ? 1 : 0, categoryId || null);

        const questionId = result.lastInsertRowid;

        // Insert answers
        const insertAnswer = db.prepare(`
            INSERT INTO answers (question_id, text, is_correct, order_index)
            VALUES (?, ?, ?, ?)
        `);
        answers.forEach((a, i) => {
            insertAnswer.run(questionId, a.text, a.isCorrect ? 1 : 0, i);
        });

        // Insert tags
        if (tags && tags.length > 0) {
            const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
            const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`);
            const linkTag = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);

            for (const tagName of tags.slice(0, 10)) {
                insertTag.run(tagName);
                const tag = getTagId.get(tagName);
                if (tag) {
                    linkTag.run(questionId, tag.id);
                }
            }
        }

        res.status(201).json({
            success: true,
            questionId,
            message: 'Question created successfully'
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/:id/diagram/generate - Generate diagram with LLM
router.post('/:id/diagram/generate', async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        // Get question
        const question = db.prepare(`
            SELECT q.*, GROUP_CONCAT(a.text, ' | ') as answers_text
            FROM questions q
            LEFT JOIN answers a ON a.question_id = q.id AND a.is_correct = 1
            WHERE q.id = ?
            GROUP BY q.id
        `).get(id);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Generate diagram using LLM2
        const diagramPath = await generateDiagram(
            question.id,
            question.text,
            question.answers_text
        );

        res.json({
            success: true,
            diagramPath,
            message: 'Diagram generated successfully'
        });
    } catch (error) {
        console.error('Generate diagram error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/:id/diagram/upload - Upload diagram file
router.post('/:id/diagram/upload', diagramUpload.single('diagram'), async (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No diagram file uploaded' });
        }

        // Check question exists
        const question = db.prepare(`SELECT id FROM questions WHERE id = ?`).get(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Update question with diagram path
        db.prepare(`UPDATE questions SET diagram_path = ? WHERE id = ?`)
            .run(req.file.filename, id);

        res.json({
            success: true,
            diagramPath: req.file.filename,
            message: 'Diagram uploaded successfully'
        });
    } catch (error) {
        console.error('Upload diagram error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/questions - Get all questions with pagination and filters
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { page = 1, limit = 20, category, category_id, tag, search, unclassified } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        // Support both 'category' and 'category_id' params
        const catId = category_id || category;
        if (catId) {
            whereClause += ' AND q.category_id = ?';
            params.push(catId);
        }

        if (unclassified === 'true') {
            whereClause += ' AND q.category_id IS NULL';
        }

        if (tag) {
            whereClause += ` AND q.id IN (
                SELECT qt.question_id FROM question_tags qt 
                JOIN tags t ON qt.tag_id = t.id 
                WHERE t.name LIKE ?
            )`;
            params.push(`%${tag}%`);
        }

        if (search) {
            whereClause += ' AND q.text LIKE ?';
            params.push(`%${search}%`);
        }

        const questions = db.prepare(`
            SELECT q.*, 
                c.name as category_name,
                c.color as category_color,
                GROUP_CONCAT(DISTINCT t.name) as tags
            FROM questions q
            LEFT JOIN categories c ON q.category_id = c.id
            LEFT JOIN question_tags qt ON q.id = qt.question_id
            LEFT JOIN tags t ON qt.tag_id = t.id
            WHERE ${whereClause}
            GROUP BY q.id
            ORDER BY q.id DESC
            LIMIT ? OFFSET ?
        `).all(...params, parseInt(limit), parseInt(offset));

        // Get answers for each question
        const stmtAnswers = db.prepare(`SELECT * FROM answers WHERE question_id = ? ORDER BY order_index`);
        const result = questions.map(q => ({
            ...q,
            answers: stmtAnswers.all(q.id),
            tags: q.tags ? q.tags.split(',') : []
        }));

        const total = db.prepare(`
            SELECT COUNT(DISTINCT q.id) as count 
            FROM questions q
            LEFT JOIN question_tags qt ON q.id = qt.question_id
            LEFT JOIN tags t ON qt.tag_id = t.id
            WHERE ${whereClause}
        `).get(...params).count;

        res.json({
            questions: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/questions/:id/auto-classify - Classify question into domain
router.post('/:id/auto-classify', async (req, res) => {
    try {
        const db = getDb();
        const questionId = req.params.id;

        // Get question with answers and existing tags
        const question = db.prepare(`
            SELECT q.*, 
                GROUP_CONCAT(a.text, '|||') as answer_texts,
                GROUP_CONCAT(t.name, ',') as tags
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            LEFT JOIN question_tags qt ON q.id = qt.question_id
            LEFT JOIN tags t ON qt.tag_id = t.id
            WHERE q.id = ?
            GROUP BY q.id
        `).get(questionId);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Get available categories
        const categories = db.prepare(`SELECT * FROM categories`).all();

        // Call LLM for classification
        const categoryId = await classifyQuestionWithLLM(question, categories);

        if (categoryId) {
            // Update question's category
            db.prepare(`UPDATE questions SET category_id = ? WHERE id = ?`)
                .run(categoryId, questionId);
        }

        const assignedCategory = categories.find(c => c.id === categoryId);

        res.json({
            success: true,
            question_id: questionId,
            category_id: categoryId,
            category_name: assignedCategory?.name || null
        });
    } catch (error) {
        console.error('Auto-classify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/questions/:id/stats - Get question statistics
router.get('/:id/stats', (req, res) => {
    try {
        const db = getDb();
        const questionId = req.params.id;

        // Check if question exists
        const question = db.prepare(`SELECT id, text FROM questions WHERE id = ?`).get(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
                ROUND(AVG(CASE WHEN is_correct = 1 THEN 100.0 ELSE 0 END), 1) as success_rate,
                SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) as flagged_count
            FROM session_answers
            WHERE question_id = ?
        `).get(questionId);

        res.json({
            question_id: Number(questionId),
            question_text: question.text.substring(0, 100) + '...',
            total_attempts: stats.total_attempts || 0,
            correct_count: stats.correct_count || 0,
            success_rate: stats.success_rate || 0,
            flagged_count: stats.flagged_count || 0
        });
    } catch (error) {
        console.error('Get question stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/questions/:id - Get single question
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const question = db.prepare(`
      SELECT q.*, c.name as category_name 
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?
    `).get(req.params.id);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        question.answers = db.prepare(`SELECT * FROM answers WHERE question_id = ? ORDER BY order_index`).all(question.id);
        question.tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN question_tags qt ON t.id = qt.tag_id
      WHERE qt.question_id = ?
    `).all(question.id);

        res.json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/questions/:id - Update question
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const { text, explanation, category_id, categoryId, answers, tags, isMultipleChoice } = req.body;

        // Support both naming conventions (category_id and categoryId)
        const catId = category_id ?? categoryId ?? null;

        db.prepare(`
      UPDATE questions 
      SET text = ?, explanation = ?, category_id = ?, is_multiple_choice = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(text, explanation || null, catId, isMultipleChoice ? 1 : 0, req.params.id);

        // Update answers
        if (answers) {
            db.prepare(`DELETE FROM answers WHERE question_id = ?`).run(req.params.id);
            const insertAnswer = db.prepare(`INSERT INTO answers (question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?)`);
            answers.forEach((a, i) => {
                // Support both is_correct and isCorrect naming
                const isCorrect = a.is_correct ?? a.isCorrect ?? false;
                insertAnswer.run(req.params.id, a.text, isCorrect ? 1 : 0, i);
            });
        }

        // Update tags - handle both string names and IDs
        if (tags && tags.length > 0) {
            db.prepare(`DELETE FROM question_tags WHERE question_id = ?`).run(req.params.id);

            const insertOrIgnoreTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
            const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`);
            const linkTag = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);

            for (const tagItem of tags.slice(0, 10)) {
                // If tagItem is a string (tag name), create/get the tag
                if (typeof tagItem === 'string') {
                    insertOrIgnoreTag.run(tagItem);
                    const tag = getTagId.get(tagItem);
                    if (tag) {
                        linkTag.run(req.params.id, tag.id);
                    }
                } else if (typeof tagItem === 'number') {
                    // If it's a number (tag ID), use directly
                    linkTag.run(req.params.id, tagItem);
                }
            }
        } else if (tags && tags.length === 0) {
            // If empty array, remove all tags
            db.prepare(`DELETE FROM question_tags WHERE question_id = ?`).run(req.params.id);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/questions/:id - Delete question
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const questionId = req.params.id;

        // Delete related records first (manual cascade)
        db.prepare(`DELETE FROM answers WHERE question_id = ?`).run(questionId);
        db.prepare(`DELETE FROM question_tags WHERE question_id = ?`).run(questionId);
        db.prepare(`DELETE FROM session_answers WHERE question_id = ?`).run(questionId);
        db.prepare(`DELETE FROM test_questions WHERE question_id = ?`).run(questionId);

        // Now delete the question
        db.prepare(`DELETE FROM questions WHERE id = ?`).run(questionId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
