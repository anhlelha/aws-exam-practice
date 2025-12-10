import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

// GET /api/data/export - Export all data as JSON
router.get('/export', (req, res) => {
    try {
        const db = getDb();

        // Export all tables
        const data = {
            questions: db.prepare(`SELECT * FROM questions`).all(),
            answers: db.prepare(`SELECT * FROM answers`).all(),
            categories: db.prepare(`SELECT * FROM categories`).all(),
            tags: db.prepare(`SELECT * FROM tags`).all(),
            question_tags: db.prepare(`SELECT * FROM question_tags`).all(),
            tests: db.prepare(`SELECT * FROM tests`).all(),
            test_questions: db.prepare(`SELECT * FROM test_questions`).all(),
            llm_configs: db.prepare(`SELECT id, role, provider, model, system_prompt, max_tokens, temperature FROM llm_configs`).all()
        };

        res.json(data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/data/import - Import data from JSON
router.post('/import', (req, res) => {
    try {
        const db = getDb();
        const data = req.body;

        // Start transaction
        const transaction = db.transaction(() => {
            // Clear existing data (except certifications and default LLM configs)
            db.exec(`DELETE FROM question_tags`);
            db.exec(`DELETE FROM test_questions`);
            db.exec(`DELETE FROM session_answers`);
            db.exec(`DELETE FROM practice_sessions`);
            db.exec(`DELETE FROM answers`);
            db.exec(`DELETE FROM questions`);
            db.exec(`DELETE FROM tests`);
            db.exec(`DELETE FROM tags`);

            let questionsImported = 0;
            let tagsImported = 0;
            let testsImported = 0;

            // Import tags
            if (data.tags && data.tags.length > 0) {
                const insertTag = db.prepare(`INSERT OR REPLACE INTO tags (id, name, color) VALUES (?, ?, ?)`);
                for (const tag of data.tags) {
                    insertTag.run(tag.id, tag.name, tag.color);
                    tagsImported++;
                }
            }

            // Import questions
            if (data.questions && data.questions.length > 0) {
                const insertQuestion = db.prepare(`
                    INSERT INTO questions (id, text, explanation, is_multiple_choice, category_id, diagram_path, source_file, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const q of data.questions) {
                    insertQuestion.run(q.id, q.text, q.explanation, q.is_multiple_choice || 0, q.category_id, q.diagram_path, q.source_file, q.created_at, q.updated_at);
                    questionsImported++;
                }
            }

            // Import answers
            if (data.answers && data.answers.length > 0) {
                const insertAnswer = db.prepare(`
                    INSERT INTO answers (id, question_id, text, is_correct, order_index)
                    VALUES (?, ?, ?, ?, ?)
                `);
                for (const a of data.answers) {
                    insertAnswer.run(a.id, a.question_id, a.text, a.is_correct, a.order_index || 0);
                }
            }

            // Import question_tags
            if (data.question_tags && data.question_tags.length > 0) {
                const insertQT = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);
                for (const qt of data.question_tags) {
                    insertQT.run(qt.question_id, qt.tag_id);
                }
            }

            // Import tests
            if (data.tests && data.tests.length > 0) {
                const insertTest = db.prepare(`
                    INSERT INTO tests (id, name, duration_minutes, is_confirmed, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `);
                for (const t of data.tests) {
                    insertTest.run(t.id, t.name, t.duration_minutes, t.is_confirmed || 0, t.created_at);
                    testsImported++;
                }
            }

            // Import test_questions
            if (data.test_questions && data.test_questions.length > 0) {
                const insertTQ = db.prepare(`INSERT OR IGNORE INTO test_questions (test_id, question_id, order_index) VALUES (?, ?, ?)`);
                for (const tq of data.test_questions) {
                    insertTQ.run(tq.test_id, tq.question_id, tq.order_index || 0);
                }
            }

            return { questionsImported, tagsImported, testsImported };
        });

        const result = transaction();

        res.json({
            success: true,
            message: 'Data imported successfully',
            ...result
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
