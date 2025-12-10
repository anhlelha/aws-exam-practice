import express from 'express';
import { getDb } from '../db/schema.js';
// TEMPORARILY DISABLED for Railway deploy - see BACKLOG.md\n// import { GoogleGenAI } from '@google/genai';

const router = express.Router();

// === LLM Configurations ===

// GET /api/settings/llm - Get all LLM configs
router.get('/llm', (req, res) => {
    try {
        const db = getDb();
        const configs = db.prepare(`SELECT * FROM llm_configs`).all();

        // Mask API keys
        const masked = configs.map(c => ({
            ...c,
            api_key: c.api_key ? '••••••••' + c.api_key.slice(-4) : null
        }));

        res.json(masked);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings/llm/:role - Update LLM config
router.put('/llm/:role', (req, res) => {
    try {
        const db = getDb();
        const { provider, model, api_key, system_prompt, max_tokens, temperature } = req.body;

        const existing = db.prepare(`SELECT * FROM llm_configs WHERE role = ?`).get(req.params.role);

        if (existing) {
            // Only update api_key if provided (not masked value)
            const newApiKey = api_key && !api_key.includes('••') ? api_key : existing.api_key;

            db.prepare(`
        UPDATE llm_configs 
        SET provider = ?, model = ?, api_key = ?, system_prompt = ?, max_tokens = ?, temperature = ?, updated_at = CURRENT_TIMESTAMP
        WHERE role = ?
      `).run(provider, model, newApiKey, system_prompt, max_tokens || 4096, temperature || 0.7, req.params.role);
        } else {
            db.prepare(`
        INSERT INTO llm_configs (role, provider, model, api_key, system_prompt, max_tokens, temperature)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.role, provider, model, api_key, system_prompt, max_tokens || 4096, temperature || 0.7);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/llm/:role/test - Test LLM connection (REAL)
router.post('/llm/:role/test', async (req, res) => {
    try {
        const db = getDb();
        const config = db.prepare(`SELECT * FROM llm_configs WHERE role = ?`).get(req.params.role);

        if (!config || !config.api_key) {
            return res.status(400).json({ error: 'LLM not configured or missing API key' });
        }

        let testResult;
        const testMessage = "Hello, respond with just 'OK' to confirm connection.";

        switch (config.provider) {
            case 'openai':
                testResult = await testOpenAI(config.api_key, config.model, testMessage);
                break;
            case 'anthropic':
                testResult = await testAnthropic(config.api_key, config.model, testMessage);
                break;
            case 'google':
                testResult = await testGoogle(config.api_key, config.model, testMessage);
                break;
            case 'openrouter':
                testResult = await testOpenRouter(config.api_key, config.model, testMessage);
                break;
            default:
                return res.status(400).json({ error: `Unknown provider: ${config.provider}` });
        }

        res.json(testResult);
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: error.message,
            details: error.response?.data || null
        });
    }
});

// Test functions for each provider
async function testOpenAI(apiKey, model, message) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: message }],
            max_tokens: 50
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return {
        success: true,
        message: 'Connection successful!',
        response: data.choices[0]?.message?.content || 'OK'
    };
}

async function testAnthropic(apiKey, model, message) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 50,
            messages: [{ role: 'user', content: message }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return {
        success: true,
        message: 'Connection successful!',
        response: data.content[0]?.text || 'OK'
    };
}

// TEMPORARILY DISABLED - Google AI
async function testGoogle(apiKey, model, message) {
    return {
        success: false,
        message: 'Google AI temporarily disabled for deployment. See BACKLOG.md'
    };
}

async function testOpenRouter(apiKey, model, message) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'AWS Exam Practice'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: message }],
            max_tokens: 50
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
        success: true,
        message: 'Connection successful!',
        response: data.choices[0]?.message?.content || 'OK'
    };
}

// === Certifications ===

// GET /api/settings/certifications - Get all certifications with categories
router.get('/certifications', (req, res) => {
    try {
        const db = getDb();
        const certs = db.prepare(`SELECT * FROM certifications`).all();

        const stmtCats = db.prepare(`SELECT * FROM categories WHERE certification_id = ?`);
        const result = certs.map(c => ({
            ...c,
            categories: stmtCats.all(c.id)
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/certifications - Add certification
router.post('/certifications', (req, res) => {
    try {
        const db = getDb();
        const { code, name, level, categories } = req.body;

        const result = db.prepare(`INSERT INTO certifications (code, name, level) VALUES (?, ?, ?)`).run(code, name, level);
        const certId = result.lastInsertRowid;

        if (categories && categories.length > 0) {
            const insertCat = db.prepare(`INSERT INTO categories (certification_id, name, color) VALUES (?, ?, ?)`);
            const checkExisting = db.prepare(`SELECT id FROM categories WHERE certification_id = ? AND name = ?`);

            categories.forEach(cat => {
                // Only insert if not already exists
                const existing = checkExisting.get(certId, cat.name);
                if (!existing) {
                    insertCat.run(certId, cat.name, cat.color || '#FF9900');
                }
            });
        }

        res.json({ success: true, id: certId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === Tags ===

// GET /api/settings/tags - Get all tags
router.get('/tags', (req, res) => {
    try {
        const db = getDb();
        const tags = db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM question_tags WHERE tag_id = t.id) as question_count
      FROM tags t
      ORDER BY t.name
    `).all();
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/tags - Add tag
router.post('/tags', (req, res) => {
    try {
        const db = getDb();
        const { name, color } = req.body;
        const result = db.prepare(`INSERT INTO tags (name, color) VALUES (?, ?)`).run(name, color || '#232F3E');
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
