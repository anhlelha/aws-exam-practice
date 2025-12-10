import { getDb } from '../db/schema.js';

/**
 * Validate that required fields are present in request body
 * @param {string[]} fields - Array of required field names
 */
export function validateRequired(fields) {
    return (req, res, next) => {
        const missing = fields.filter(f => req.body[f] === undefined);
        if (missing.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missing: missing
            });
        }
        next();
    };
}

/**
 * Validate that session exists and attach it to request
 */
export function validateSession(req, res, next) {
    const db = getDb();
    const session = db.prepare('SELECT * FROM practice_sessions WHERE id = ?')
        .get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    req.session = session;
    next();
}

/**
 * Validate that session is not completed
 */
export function validateSessionActive(req, res, next) {
    if (req.session.completed_at) {
        return res.status(400).json({ error: 'Session already completed' });
    }
    next();
}

/**
 * Validate that question exists
 */
export function validateQuestion(req, res, next) {
    const db = getDb();
    const questionId = req.body.question_id || req.params.questionId;

    if (!questionId) {
        return res.status(400).json({ error: 'question_id is required' });
    }

    const question = db.prepare('SELECT * FROM questions WHERE id = ?')
        .get(questionId);

    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    req.question = question;
    next();
}
