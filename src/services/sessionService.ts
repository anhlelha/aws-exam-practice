// Session Service - API calls for practice sessions
const API_BASE = 'http://localhost:3001/api';

// Bắt đầu session mới
export async function startSession(testId: number, mode: 'timed' | 'non-timed') {
    const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId, mode })
    });
    if (!response.ok) throw new Error('Failed to start session');
    return response.json();
}

// Lấy trạng thái session
export async function getSession(sessionId: number) {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Failed to get session');
    return response.json();
}

// Submit câu trả lời
export async function submitAnswer(sessionId: number, questionId: number, selectedAnswers: number[]) {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected_answers: selectedAnswers })
    });
    if (!response.ok) throw new Error('Failed to submit answer');
    return response.json();
}

// Toggle flag
export async function toggleFlagAPI(sessionId: number, questionId: number, flagged: boolean) {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/flag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, flagged })
    });
    if (!response.ok) throw new Error('Failed to toggle flag');
    return response.json();
}

// Hoàn thành session
export async function completeSession(sessionId: number) {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to complete session');
    return response.json();
}
