const API_BASE = 'http://localhost:3001/api';

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

// Create new question
export async function createQuestion(question: QuestionInput): Promise<{ questionId: number }> {
    const response = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
}

// Generate diagram with LLM
export async function generateDiagram(questionId: number): Promise<{ diagramPath: string }> {
    const response = await fetch(`${API_BASE}/questions/${questionId}/diagram/generate`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
}

// Upload diagram file
export async function uploadDiagram(questionId: number, file: File): Promise<{ diagramPath: string }> {
    const formData = new FormData();
    formData.append('diagram', file);

    const response = await fetch(`${API_BASE}/questions/${questionId}/diagram/upload`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
}

// Get single question by ID (for edit mode)
export async function getQuestionById(questionId: number): Promise<{
    id: number;
    text: string;
    explanation: string | null;
    category_id: number | null;
    is_multiple_choice: boolean;
    diagram_path: string | null;
    answers: { id: number; text: string; is_correct: boolean }[];
    tags: { id: number; name: string }[];
}> {
    const response = await fetch(`${API_BASE}/questions/${questionId}`);
    if (!response.ok) throw new Error('Question not found');
    return response.json();
}

// Update existing question
export async function updateQuestion(questionId: number, data: {
    text: string;
    answers: Answer[];
    explanation?: string;
    isMultipleChoice: boolean;
    categoryId: number | null;
    tags: string[];
}): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
}

// Delete question
export async function deleteQuestion(questionId: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
}

// Fetch categories
export async function getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
}
