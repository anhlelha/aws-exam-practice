import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { extractQuestionsWithLLM } from './llmService.js';
import { generateDiagram } from './diagramGenerator.js';
import { getDb } from '../db/schema.js';

const execAsync = promisify(exec);

// Extract text from PDF using pdftotext (poppler)
async function extractTextFromPDF(filePath) {
    try {
        // Use pdftotext to extract text (outputs to stdout with -)
        const { stdout } = await execAsync(`pdftotext -layout "${filePath}" -`);

        // Get page count using pdfinfo
        const { stdout: pdfInfoOutput } = await execAsync(`pdfinfo "${filePath}"`);
        const pagesMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
        const numPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;

        return {
            text: stdout,
            numPages
        };
    } catch (error) {
        console.error('pdftotext error:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

export async function processUploadedPdf(filePath, originalName) {
    const db = getDb();

    try {
        console.log(`📄 Processing: ${originalName}`);

        // Extract text from PDF using pdftotext (poppler)
        const pdfData = await extractTextFromPDF(filePath);

        console.log(`   Total pages: ${pdfData.numPages}`);
        console.log(`   Text length: ${pdfData.text.length} chars`);

        // Extract questions using LLM1
        console.log(`   Calling LLM1 to extract questions...`);
        const questions = await extractQuestionsWithLLM(pdfData.text);

        console.log(`   Extracted: ${questions.length} questions`);

        // Store questions in database
        const insertQuestion = db.prepare(`
      INSERT INTO questions (text, explanation, is_multiple_choice, category_id, source_file)
      VALUES (?, ?, ?, ?, ?)
    `);

        const insertAnswer = db.prepare(`
      INSERT INTO answers (question_id, text, is_correct, order_index)
      VALUES (?, ?, ?, ?)
    `);

        const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
        const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`);
        const linkTag = db.prepare(`INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`);

        const questionIds = [];

        for (const q of questions) {
            // Insert question
            const result = insertQuestion.run(
                q.text,
                q.explanation || null,
                q.isMultipleChoice ? 1 : 0,
                null, // category_id - to be assigned later
                originalName
            );
            const questionId = result.lastInsertRowid;
            questionIds.push(questionId);

            // Insert answers
            if (q.answers && Array.isArray(q.answers)) {
                q.answers.forEach((a, i) => {
                    insertAnswer.run(questionId, a.text, a.isCorrect ? 1 : 0, i);
                });
            }

            // Insert and link tags
            if (q.tags && q.tags.length > 0) {
                for (const tagName of q.tags.slice(0, 5)) { // Max 5 tags
                    insertTag.run(tagName);
                    const tag = getTagId.get(tagName);
                    if (tag) {
                        linkTag.run(questionId, tag.id);
                    }
                }
            }

            // Generate diagram (async - don't wait)
            generateDiagram(questionId, q.text, q.answers?.find(a => a.isCorrect)?.text)
                .catch(err => console.error(`Diagram error for Q${questionId}:`, err.message));
        }

        return {
            filename: originalName,
            pages: pdfData.numPages,
            questionsExtracted: questions.length,
            questionIds
        };

    } catch (error) {
        console.error('PDF processing error:', error);
        throw error;
    }
}
