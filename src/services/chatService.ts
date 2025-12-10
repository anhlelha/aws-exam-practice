// Chat Service - API calls for AI Mentor chat
import API_BASE_URL from '../config/api';
const API_BASE = `${API_BASE_URL}/api`;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Gửi chat message
export async function sendChatMessage(
    message: string,
    questionId?: number,
    history?: ChatMessage[]
) {
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, question_id: questionId, history })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat failed');
    }
    return response.json();
}

// Kiểm tra cấu hình AI Mentor
export async function checkChatStatus() {
    const response = await fetch(`${API_BASE}/chat/status`);
    return response.json();
}
