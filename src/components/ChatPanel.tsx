import { useState } from 'react';
import { sendChatMessage } from '../services/chatService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    questionContext: string;
    questionId?: number;
}

export default function ChatPanel({ questionContext: _questionContext, questionId }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Xin chào! Tôi là AI Mentor. Tôi có thể giúp giải thích các khái niệm liên quan đến câu hỏi này. Bạn muốn hỏi gì?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const result = await sendChatMessage(
                userMessage,
                questionId,
                messages.filter(m => m.role !== 'assistant' || !m.content.includes("Xin chào!"))
            );
            setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
        } catch (error: any) {
            const errorMessage = error.message?.includes('not configured')
                ? '⚠️ AI Mentor chưa được cấu hình. Vui lòng thiết lập LLM3 trong Settings.'
                : 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.';
            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                    </svg>
                </div>
                <div>
                    <div style={{ fontWeight: 600 }}>AI Mentor</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-success)' }}>● Online</div>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)'
                    }}>
                        {msg.content}
                    </div>
                ))}
                {loading && (
                    <div style={{
                        alignSelf: 'flex-start',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)'
                    }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                display: 'flex',
                gap: '8px',
                padding: '16px',
                borderTop: '1px solid var(--border-color)'
            }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Ask about this question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleSend} disabled={loading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
