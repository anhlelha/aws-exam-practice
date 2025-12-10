import fs from 'fs';
import path from 'path';
import { callLLM } from './llmService.js';
import { getDb } from '../db/schema.js';

const DIAGRAMS_DIR = 'uploads/diagrams';

// Ensure diagrams directory exists
if (!fs.existsSync(DIAGRAMS_DIR)) {
    fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
}

export async function generateDiagram(questionId, questionText, correctAnswer) {
    const systemPrompt = `You are an AWS Solutions Architect. Generate a DrawIO XML diagram that illustrates the AWS architecture described in the question.

Use these AWS icon styles:
- EC2: rounded rectangle, orange fill
- S3: bucket shape, green fill
- RDS: cylinder shape, blue fill
- Lambda: square with rounded corners, orange fill
- VPC: large dashed rectangle
- ALB/ELB: circle with arrows

Return ONLY valid DrawIO XML starting with <mxGraphModel>. No explanation.`;

    const userPrompt = `Create an architecture diagram for this AWS exam question:

Question: ${questionText}
Correct Answer: ${correctAnswer || 'Not specified'}

Show the key AWS services and their relationships.`;

    try {
        const response = await callLLM('LLM2', systemPrompt, userPrompt);

        // Extract XML from response
        const xmlMatch = response.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/);

        if (xmlMatch) {
            const xml = xmlMatch[0];
            const filename = `diagram_${questionId}_${Date.now()}.drawio`;
            const filepath = path.join(DIAGRAMS_DIR, filename);

            // Wrap in DrawIO file format
            const drawioContent = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" type="device">
  <diagram name="AWS Architecture">
    ${xml}
  </diagram>
</mxfile>`;

            fs.writeFileSync(filepath, drawioContent);

            // Update question with diagram path
            const db = getDb();
            db.prepare(`UPDATE questions SET diagram_path = ? WHERE id = ?`).run(filename, questionId);

            console.log(`✅ Diagram generated: ${filename}`);
            return filename;
        }

        throw new Error('Invalid DrawIO XML response');
    } catch (error) {
        console.error(`Diagram generation error for Q${questionId}:`, error.message);
        throw error;
    }
}
