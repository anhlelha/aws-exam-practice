interface QuestionNavProps {
    total: number;
    current: number;
    answered: number[];
    flagged: number[];
    onSelect: (index: number) => void;
}

export default function QuestionNav({ total, current, answered, flagged, onSelect }: QuestionNavProps) {
    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--border-radius-md)'
        }}>
            {Array.from({ length: total }, (_, i) => {
                const isAnswered = answered.includes(i);
                const isFlagged = flagged.includes(i);
                const isCurrent = current === i;

                return (
                    <button
                        key={i}
                        onClick={() => onSelect(i)}
                        style={{
                            width: '36px',
                            height: '36px',
                            border: isCurrent ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: isAnswered
                                ? 'var(--color-success)'
                                : isFlagged
                                    ? 'var(--color-warning)'
                                    : 'var(--bg-secondary)',
                            color: isAnswered || isFlagged ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: isCurrent ? 600 : 400,
                            position: 'relative',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {i + 1}
                        {isFlagged && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '10px',
                                height: '10px',
                                background: 'var(--color-danger)',
                                borderRadius: '50%'
                            }} />
                        )}
                    </button>
                );
            })}

            <div style={{
                width: '100%',
                marginTop: '12px',
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: 'var(--text-muted)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', background: 'var(--color-success)', borderRadius: '3px' }} />
                    Answered ({answered.length})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', background: 'var(--color-warning)', borderRadius: '3px' }} />
                    Flagged ({flagged.length})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '3px' }} />
                    Unanswered ({total - answered.length})
                </span>
            </div>
        </div>
    );
}
