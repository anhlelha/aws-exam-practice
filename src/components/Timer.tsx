import { useEffect, useState } from 'react';

interface TimerProps {
    initialMinutes: number;
    onTimeUp: () => void;
    isPaused: boolean;
}

export default function Timer({ initialMinutes, onTimeUp, isPaused }: TimerProps) {
    const [seconds, setSeconds] = useState(initialMinutes * 60);

    useEffect(() => {
        if (isPaused || seconds <= 0) return;

        const interval = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, seconds, onTimeUp]);

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const isLow = seconds < 300; // Less than 5 minutes

    return (
        <div className="timer" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: isLow ? 'var(--color-danger-bg)' : 'var(--bg-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            color: isLow ? 'var(--color-danger)' : 'var(--text-primary)'
        }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'monospace' }}>
                {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
        </div>
    );
}
