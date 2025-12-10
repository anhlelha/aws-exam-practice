import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

// GET /api/categories - Get all categories
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const categories = db.prepare(`
            SELECT c.*, cert.code as certification_code, cert.name as certification_name
            FROM categories c
            LEFT JOIN certifications cert ON c.certification_id = cert.id
            ORDER BY c.id
        `).all();

        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/:id - Get single category with question count
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const category = db.prepare(`
            SELECT c.*, cert.code as certification_code
            FROM categories c
            LEFT JOIN certifications cert ON c.certification_id = cert.id
            WHERE c.id = ?
        `).get(req.params.id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const questionCount = db.prepare(`
            SELECT COUNT(*) as count FROM questions WHERE category_id = ?
        `).get(req.params.id).count;

        res.json({ ...category, question_count: questionCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats/overview', (req, res) => {
    try {
        const db = getDb();

        const stats = db.prepare(`
            SELECT 
                c.id,
                c.name,
                c.color,
                COUNT(q.id) as question_count
            FROM categories c
            LEFT JOIN questions q ON c.id = q.category_id
            GROUP BY c.id
            ORDER BY c.id
        `).all();

        const unclassified = db.prepare(`
            SELECT COUNT(*) as count FROM questions WHERE category_id IS NULL
        `).get().count;

        res.json({
            categories: stats,
            unclassified_count: unclassified,
            total_questions: stats.reduce((sum, c) => sum + c.question_count, 0) + unclassified
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
