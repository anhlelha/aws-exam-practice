import API_BASE_URL from '../config/api';
const API_BASE = `${API_BASE_URL}/api`;

export interface PreviewQuestion {
    id: number;
    text: string;
    category_name: string | null;
}

export interface PreviewResult {
    count: number;
    questions: PreviewQuestion[];
}

export interface TestConfig {
    name: string;
    duration_minutes: number;
    count: number;
    selection_mode: 'random' | 'weighted' | 'new' | 'wrong' | 'flagged';
    category_ids?: number[];
    weights?: { categoryId: number; weight: number }[];
}

// Get preview of questions to be selected
export async function previewQuestions(config: Omit<TestConfig, 'name' | 'duration_minutes'>): Promise<PreviewResult> {
    const response = await fetch(`${API_BASE}/tests/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to preview questions');
    return response.json();
}

// Create test with selected questions
export async function createTestWithSelection(config: TestConfig) {
    const response = await fetch(`${API_BASE}/tests/create-with-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to create test');
    return response.json();
}

// Get test questions for preview
export async function getTestQuestions(testId: number) {
    const response = await fetch(`${API_BASE}/tests/${testId}/questions`);
    if (!response.ok) throw new Error('Failed to get test questions');
    return response.json();
}

// Get all existing tests
export async function getTests() {
    const response = await fetch(`${API_BASE}/tests`);
    if (!response.ok) throw new Error('Failed to get tests');
    return response.json();
}

// Delete a test
export async function deleteTest(testId: number) {
    const response = await fetch(`${API_BASE}/tests/${testId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete test');
    return response.json();
}

// ============================================================================
// New functions for Test Builder Edit/Create with manual selection
// ============================================================================

export interface QuestionSummary {
    id: number;
    text: string;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    tags: string[];
    answers?: Array<{ id: number; text: string; is_correct: number }>;
}

export interface QuestionsResponse {
    questions: QuestionSummary[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface TestForEdit {
    id: number;
    name: string;
    duration_minutes: number;
    question_ids: number[];
    created_at: string;
}

/**
 * Get test data for editing (with question IDs)
 */
export async function getTestForEdit(testId: number): Promise<TestForEdit> {
    const response = await fetch(`${API_BASE}/tests/${testId}`);
    if (!response.ok) throw new Error('Failed to fetch test');

    const test = await response.json();
    // Extract question IDs from the questions array
    const question_ids = test.questions?.map((q: { id: number }) => q.id) || [];

    return {
        id: test.id,
        name: test.name,
        duration_minutes: test.duration_minutes,
        question_ids,
        created_at: test.created_at
    };
}

/**
 * Create a new test with manually selected questions
 */
export async function createTestWithQuestions(data: {
    name: string;
    duration_minutes: number;
    question_ids: number[];
}): Promise<{ success: boolean; id: number }> {
    const response = await fetch(`${API_BASE}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: data.name,
            duration_minutes: data.duration_minutes,
            question_ids: data.question_ids
        })
    });
    if (!response.ok) throw new Error('Failed to create test');
    return response.json();
}

/**
 * Update an existing test
 */
export async function updateTest(testId: number, data: {
    name: string;
    duration_minutes: number;
    question_ids: number[];
}): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: data.name,
            duration_minutes: data.duration_minutes,
            question_ids: data.question_ids
        })
    });
    if (!response.ok) throw new Error('Failed to update test');
    return response.json();
}

/**
 * Get questions with optional filters for selection
 */
export async function getQuestionsForSelection(filters?: {
    category_id?: number;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<QuestionsResponse> {
    const params = new URLSearchParams();
    if (filters?.category_id) params.set('category_id', String(filters.category_id));
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.search) params.set('search', filters.search);
    params.set('page', String(filters?.page || 1));
    params.set('limit', String(filters?.limit || 100));

    const response = await fetch(`${API_BASE}/questions?${params}`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
}

/**
 * Get all categories for filter dropdown
 */
export async function getCategories(): Promise<Array<{
    id: number;
    name: string;
    color: string;
}>> {
    const response = await fetch(`${API_BASE}/questions/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
}
