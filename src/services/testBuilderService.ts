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
