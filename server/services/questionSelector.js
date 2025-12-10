import { getDb } from '../db/schema.js';

/**
 * Select questions randomly from pool
 * @param {Object} options - Selection options
 * @param {number} options.count - Number of questions to select
 * @param {number[]} options.categoryIds - Filter by categories (optional)
 * @param {number[]} options.tagIds - Filter by tags (optional)
 * @param {number[]} options.excludeIds - Question IDs to exclude (optional)
 * @returns {Object[]} Selected questions
 */
export function selectRandomQuestions(options) {
    const db = getDb();
    const { count = 10, categoryIds = [], tagIds = [], excludeIds = [] } = options;

    let whereClause = '1=1';
    const params = [];

    // Filter by categories
    if (categoryIds.length > 0) {
        whereClause += ` AND q.category_id IN (${categoryIds.map(() => '?').join(',')})`;
        params.push(...categoryIds);
    }

    // Filter by tags
    if (tagIds.length > 0) {
        whereClause += ` AND q.id IN (
            SELECT DISTINCT qt.question_id FROM question_tags qt WHERE qt.tag_id IN (${tagIds.map(() => '?').join(',')})
        )`;
        params.push(...tagIds);
    }

    // Exclude certain questions
    if (excludeIds.length > 0) {
        whereClause += ` AND q.id NOT IN (${excludeIds.map(() => '?').join(',')})`;
        params.push(...excludeIds);
    }

    const questions = db.prepare(`
        SELECT q.*, c.name as category_name
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        WHERE ${whereClause}
        ORDER BY RANDOM()
        LIMIT ?
    `).all(...params, count);

    return questions;
}

/**
 * Select questions with weighted distribution by category
 * @param {Object} options - Selection options
 * @param {number} options.count - Total number of questions
 * @param {Object[]} options.weights - Category weights [{categoryId: 1, weight: 30}, ...]
 * @returns {Object[]} Selected questions
 */
export function selectWeightedQuestions(options) {
    const db = getDb();
    const { count = 10, weights = [] } = options;

    if (weights.length === 0) {
        // Default to random if no weights provided
        return selectRandomQuestions({ count });
    }

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const questions = [];

    for (const { categoryId, weight } of weights) {
        const categoryCount = Math.round((weight / totalWeight) * count);
        if (categoryCount > 0) {
            const categoryQuestions = db.prepare(`
                SELECT q.*, c.name as category_name
                FROM questions q
                LEFT JOIN categories c ON q.category_id = c.id
                WHERE q.category_id = ?
                ORDER BY RANDOM()
                LIMIT ?
            `).all(categoryId, categoryCount);
            questions.push(...categoryQuestions);
        }
    }

    // Shuffle final list
    return shuffleArray(questions).slice(0, count);
}

/**
 * Get questions user hasn't practiced or got wrong
 * @param {Object} options - Selection options
 * @param {number} options.count - Number of questions
 * @param {string} options.mode - 'new' | 'wrong' | 'flagged'
 * @returns {Object[]} Selected questions
 */
export function selectSmartQuestions(options) {
    const db = getDb();
    const { count = 10, mode = 'new' } = options;

    let query;
    switch (mode) {
        case 'new':
            // Questions never answered
            query = `
                SELECT q.*, c.name as category_name
                FROM questions q
                LEFT JOIN categories c ON q.category_id = c.id
                WHERE q.id NOT IN (SELECT DISTINCT question_id FROM session_answers)
                ORDER BY RANDOM()
                LIMIT ?
            `;
            break;
        case 'wrong':
            // Questions answered incorrectly
            query = `
                SELECT q.*, c.name as category_name, COUNT(sa.id) as wrong_count
                FROM questions q
                LEFT JOIN categories c ON q.category_id = c.id
                JOIN session_answers sa ON q.id = sa.question_id AND sa.is_correct = 0
                GROUP BY q.id
                ORDER BY wrong_count DESC, RANDOM()
                LIMIT ?
            `;
            break;
        case 'flagged':
            // Questions flagged for review
            query = `
                SELECT q.*, c.name as category_name
                FROM questions q
                LEFT JOIN categories c ON q.category_id = c.id
                JOIN session_answers sa ON q.id = sa.question_id AND sa.flagged = 1
                GROUP BY q.id
                ORDER BY RANDOM()
                LIMIT ?
            `;
            break;
        default:
            return selectRandomQuestions({ count });
    }

    return db.prepare(query).all(count);
}

/**
 * Get available question count by filters
 * @param {Object} options - Filter options
 * @returns {Object} Count information
 */
export function getAvailableQuestionCount(options = {}) {
    const db = getDb();
    const { categoryIds = [], tagIds = [] } = options;

    let whereClause = '1=1';
    const params = [];

    if (categoryIds.length > 0) {
        whereClause += ` AND q.category_id IN (${categoryIds.map(() => '?').join(',')})`;
        params.push(...categoryIds);
    }

    if (tagIds.length > 0) {
        whereClause += ` AND q.id IN (
            SELECT DISTINCT qt.question_id FROM question_tags qt WHERE qt.tag_id IN (${tagIds.map(() => '?').join(',')})
        )`;
        params.push(...tagIds);
    }

    const total = db.prepare(`
        SELECT COUNT(*) as count FROM questions q WHERE ${whereClause}
    `).get(...params);

    // Count by category
    const byCategory = db.prepare(`
        SELECT c.id, c.name, COUNT(q.id) as count
        FROM categories c
        LEFT JOIN questions q ON q.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    `).all();

    // Count new questions (never practiced)
    const newCount = db.prepare(`
        SELECT COUNT(*) as count FROM questions 
        WHERE id NOT IN (SELECT DISTINCT question_id FROM session_answers)
    `).get();

    // Count wrong questions
    const wrongCount = db.prepare(`
        SELECT COUNT(DISTINCT question_id) as count 
        FROM session_answers WHERE is_correct = 0
    `).get();

    // Count flagged questions
    const flaggedCount = db.prepare(`
        SELECT COUNT(DISTINCT question_id) as count 
        FROM session_answers WHERE flagged = 1
    `).get();

    return {
        total: total.count,
        byCategory,
        newQuestions: newCount.count,
        wrongQuestions: wrongCount.count,
        flaggedQuestions: flaggedCount.count
    };
}

// Helper: Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default {
    selectRandomQuestions,
    selectWeightedQuestions,
    selectSmartQuestions,
    getAvailableQuestionCount
};
