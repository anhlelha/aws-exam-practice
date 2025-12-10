import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// TEMPORARILY DISABLED for Railway deploy - see BACKLOG.md
// import { GoogleGenAI } from '@google/genai';
import { getDb } from '../db/schema.js';

// Get LLM config from database
function getLLMConfig(role) {
    const db = getDb();
    return db.prepare(`SELECT * FROM llm_configs WHERE role = ?`).get(role);
}

// Create OpenAI client
function getOpenAIClient(apiKey) {
    return new OpenAI({ apiKey });
}

// Create Anthropic client
function getAnthropicClient(apiKey) {
    return new Anthropic({ apiKey });
}

// TEMPORARILY DISABLED - Google GenAI client
// function getGoogleClient(apiKey) {
//     return new GoogleGenAI({ apiKey });
// }

// Call LLM based on provider
async function callLLM(role, systemPrompt, userPrompt) {
    const config = getLLMConfig(role);

    if (!config || !config.api_key) {
        throw new Error(`${role} not configured. Please set up in Settings.`);
    }

    const finalSystemPrompt = config.system_prompt || systemPrompt;

    if (config.provider === 'openai') {
        const client = getOpenAIClient(config.api_key);
        const response = await client.chat.completions.create({
            model: config.model || 'gpt-4o',
            messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: config.max_tokens || 4096,
            temperature: config.temperature || 0.7
        });
        return response.choices[0].message.content;
    }

    if (config.provider === 'anthropic') {
        const client = getAnthropicClient(config.api_key);
        const response = await client.messages.create({
            model: config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: config.max_tokens || 4096,
            system: finalSystemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        });
        return response.content[0].text;
    }

    // TEMPORARILY DISABLED - Google provider
    if (config.provider === 'google') {
        throw new Error('Google AI temporarily disabled. Please use OpenAI, Anthropic, or OpenRouter.');
    }

    if (config.provider === 'openrouter') {
        // OpenRouter uses OpenAI-compatible API
        const client = new OpenAI({
            apiKey: config.api_key,
            baseURL: 'https://openrouter.ai/api/v1'
        });
        const response = await client.chat.completions.create({
            model: config.model || 'openai/gpt-4o',
            messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: config.max_tokens || 4096,
            temperature: config.temperature || 0.7
        });
        return response.choices[0].message.content;
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
}

// TEMPORARILY DISABLED - Google Gemini API call
// async function callGoogleGemini(config, systemPrompt, userPrompt) {
//     const client = getGoogleClient(config.api_key);
//     const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
//     const response = await client.models.generateContent({
//         model: config.model || 'gemini-2.0-flash',
//         contents: fullPrompt,
//         config: { maxOutputTokens: config.max_tokens || 4096, temperature: config.temperature || 0.7 }
//     });
//     return response.text || '';
// }

// LLM1: Extract questions from PDF text
export async function extractQuestionsWithLLM(pdfText) {
    const systemPrompt = `You are an AWS certification exam expert. Extract questions and answers from the provided text.

For each question, return a JSON array with this structure:
[
  {
    "text": "The full question text",
    "answers": [
      { "text": "Answer A text", "isCorrect": false },
      { "text": "Answer B text", "isCorrect": true },
      ...
    ],
    "explanation": "Why the correct answer is correct",
    "tags": ["EC2", "Auto-Scaling", "High-Availability"],
    "isMultipleChoice": false
  }
]

Return ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Extract all exam questions from this text:\n\n${pdfText.substring(0, 50000)}`; // Limit text size

    try {
        const response = await callLLM('LLM1', systemPrompt, userPrompt);

        // Parse JSON response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback - try parsing entire response
        return JSON.parse(response);
    } catch (error) {
        console.error('LLM extraction error:', error);
        // Return empty array on error
        return [];
    }
}

// LLM3: AI Mentor chat
export async function chatWithMentor(questionText, userMessage, conversationHistory = []) {
    const systemPrompt = `You are a friendly AWS certification tutor helping a student understand exam questions.
Be encouraging, explain concepts clearly, and provide real-world examples.`;

    const context = `Current exam question:\n${questionText}\n\nStudent's message: ${userMessage}`;

    return callLLM('LLM3', systemPrompt, context);
}

export { callLLM };

// LLM1: Auto-tag question with AWS services
export async function tagQuestionWithLLM(question) {
    const systemPrompt = `You are an AWS certification expert. Identify AWS services and topics mentioned in exam questions.

Return a JSON array of AWS service/topic names. Examples:
- "S3", "EC2", "Lambda", "VPC", "IAM", "RDS", "DynamoDB"
- "Auto Scaling", "CloudFront", "Route 53", "ELB"
- "SQS", "SNS", "Kinesis", "API Gateway"
- "KMS", "Secrets Manager", "WAF", "Shield"

Return ONLY a valid JSON array, no explanation. Example: ["S3", "CloudFront", "IAM"]`;

    const userPrompt = `Question: ${question.text}
${question.answer_texts ? `Answers: ${question.answer_texts.replace(/\|\|\|/g, ', ')}` : ''}

Extract the AWS services/topics mentioned:`;

    try {
        const response = await callLLM('LLM1', systemPrompt, userPrompt);

        // Parse JSON array from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const tags = JSON.parse(jsonMatch[0]);
            return tags.filter(t => typeof t === 'string' && t.length > 0);
        }
        return [];
    } catch (error) {
        console.error('Tagging LLM error:', error);
        return [];
    }
}

// LLM1: Classify question into exam domain
export async function classifyQuestionWithLLM(question, categories) {
    const categoryList = categories.map(c => `${c.id}: ${c.name}`).join('\n');

    const systemPrompt = `You are an AWS Solutions Architect exam expert. Classify exam questions into the correct domain.

Available domains:
${categoryList}

Return ONLY the domain ID number that best matches the question. No explanation.

Domain Classification Guide:
- Security: IAM, encryption, access control, compliance, VPC security, KMS, Secrets Manager, WAF, Shield
- Resilient: High availability, fault tolerance, disaster recovery, backups, multi-AZ, Route 53, Auto Scaling
- High-Performing: Caching, scaling, performance optimization, low latency, CloudFront, ElastiCache, read replicas
- Cost-Optimized: Reserved instances, spot instances, right-sizing, storage tiers, Savings Plans, lifecycle policies`;

    const userPrompt = `Question: ${question.text}

${question.tags ? `Tags: ${question.tags}` : ''}

Return only the domain ID number:`;

    try {
        const response = await callLLM('LLM1', systemPrompt, userPrompt);

        // Extract number from response
        const match = response.match(/\d+/);
        if (match) {
            const categoryId = parseInt(match[0]);
            // Verify it's a valid category
            if (categories.some(c => c.id === categoryId)) {
                return categoryId;
            }
        }

        return null;
    } catch (error) {
        console.error('Classification LLM error:', error);
        return null;
    }
}
