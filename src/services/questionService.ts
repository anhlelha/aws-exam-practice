import API_BASE_URL from '../config/api';
const API_BASE = `${API_BASE_URL}/api`;

export interface Answer {
    text: string;
    isCorrect: boolean;
}

export interface QuestionInput {
    text: string;
    answers: Answer[];
    explanation: string;
    isMultipleChoice: boolean;
    categoryId: number | null;
    tags: string[];
}

export interface Category {
    id: number;
    name: string;
    color: string;
}

export async function createQuestion(question: QuestionInput) {
    const response = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: question.text,
            answers: question.answers.map(a => ({ text: a.text, is_correct: a.isCorrect })),
            explanation: question.explanation,
            is_multiple_choice: question.isMultipleChoice,
            category_id: question.categoryId,
            tags: question.tags
        })
    });
    if (!response.ok) throw new Error('Failed to create question');
    return response.json();
}

export async function generateDiagram(questionText: string) {
    const response = await fetch(`${API_BASE}/questions/generate-diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: questionText })
    });
    if (!response.ok) throw new Error('Failed to generate diagram');
    return response.json();
}

export async function uploadDiagram(questionId: number, file: File) {
    const formData = new FormData();
    formData.append('diagram', file);

    const response = await fetch(`${API_BASE}/questions/${questionId}/diagram/upload`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload diagram');
    return response.json();
}

export async function getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/questions/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
}

export async function getQuestionById(questionId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`);
    if (!response.ok) throw new Error('Failed to fetch question');
    return response.json();
}

export async function updateQuestion(questionId: number, question: QuestionInput) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: question.text,
            answers: question.answers.map(a => ({ text: a.text, is_correct: a.isCorrect })),
            explanation: question.explanation,
            is_multiple_choice: question.isMultipleChoice,
            category_id: question.categoryId,
            tags: question.tags
        })
    });
    if (!response.ok) throw new Error('Failed to update question');
    return response.json();
}

export async function deleteQuestion(questionId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete question');
    return response.json();
}
