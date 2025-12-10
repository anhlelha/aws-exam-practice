import API_BASE_URL from '../config/api';
const API_BASE = `${API_BASE_URL}/api`;

export interface ReviewQuestion {
    id: number;
    text: string;
    category_id: number | null;
    category_name: string | null;
    tags: string | null;
    explanation: string | null;
}

// Get questions with filters
export async function getQuestionsForReview(params: {
    category_id?: number;
    tag?: string;
    unclassified?: boolean;
    page?: number;
    limit?: number;
}) {
    const searchParams = new URLSearchParams();
    if (params.category_id) searchParams.set('category_id', String(params.category_id));
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.unclassified) searchParams.set('unclassified', 'true');
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const response = await fetch(`${API_BASE}/questions?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
}

// Auto-tag a question
export async function autoTagQuestion(questionId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}/auto-tag`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to auto-tag');
    return response.json();
}

// Auto-classify a question
export async function autoClassifyQuestion(questionId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}/auto-classify`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to auto-classify');
    return response.json();
}

// Bulk process questions
export async function bulkProcessQuestions(questionIds: number[]) {
    // Tag first
    const tagResult = await fetch(`${API_BASE}/questions/bulk-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: questionIds })
    });

    // Then classify
    const classifyResult = await fetch(`${API_BASE}/questions/bulk-classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: questionIds })
    });

    return {
        tagging: await tagResult.json(),
        classification: await classifyResult.json()
    };
}

// Update question tags
export async function updateQuestionTags(questionId: number, tagIds: number[]) {
    const response = await fetch(`${API_BASE}/questions/${questionId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: tagIds })
    });
    if (!response.ok) throw new Error('Failed to update tags');
    return response.json();
}

// Update question category
export async function updateQuestionCategory(questionId: number, categoryId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId })
    });
    if (!response.ok) throw new Error('Failed to update category');
    return response.json();
}

// Get all available tags
export async function getAllTags() {
    const response = await fetch(`${API_BASE}/settings/tags`);
    return response.json();
}

// Get all categories
export async function getAllCategories() {
    const response = await fetch(`${API_BASE}/settings/certifications`);
    return response.json();
}

// Update full question (text, answers, explanation, category, tags)
export async function updateQuestion(questionId: number, data: {
    text: string;
    explanation?: string | null;
    category_id?: number | null;
    answers?: { text: string; is_correct: boolean }[];
    tags?: number[];
}) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update question');
    return response.json();
}

// Delete question
export async function deleteQuestion(questionId: number) {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete question');
    return response.json();
}
