import { useEffect, useState, useCallback } from 'react';
import Timer from '../components/Timer';
import QuestionNav from '../components/QuestionNav';
import ChatPanel from '../components/ChatPanel';
import { startSession, submitAnswer, toggleFlagAPI, completeSession } from '../services/sessionService';

interface Test {
    id: number;
    name: string;
    duration_minutes: number;
    question_count: number;
}

interface Question {
    id: number;
    text: string;
    answers: { id: number; text: string; is_correct: boolean }[];
    explanation?: string;
    diagram_path?: string;
}

interface PracticeState {
    test: Test | null;
    questions: Question[];
    currentIndex: number;
    selectedAnswers: Record<number, number[]>; // questionId -> answerIds
    flagged: number[];
    mode: 'timed' | 'non-timed';
    startedAt: Date | null;
    isPaused: boolean;
}

interface Results {
    correct: number;
    total: number;
    percentage: number;
    timeTaken: string;
    breakdown: { questionId: number; isCorrect: boolean }[];
}

export default function Practice() {
    const [tests, setTests] = useState<Test[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
    const [mode, setMode] = useState<'timed' | 'non-timed'>('timed');
    const [isActive, setIsActive] = useState(false);
    const [state, setState] = useState<PracticeState>({
        test: null,
        questions: [],
        currentIndex: 0,
        selectedAnswers: {},
        flagged: [],
        mode: 'timed',
        startedAt: null,
        isPaused: false
    });
    const [results, setResults] = useState<Results | null>(null);
    const [sessionId, setSessionId] = useState<number | null>(null);
    // Track which questions have been submitted (for non-timed mode)
    const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
    // Review mode: view the test just taken with answers
    const [reviewMode, setReviewMode] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    // Zoom diagram
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        fetch('http://localhost:3001/api/tests')
            .then(res => res.json())
            .then(setTests)
            .catch(console.error);
    }, []);

    const startPractice = async () => {
        if (!selectedTestId) return;

        try {
            // Call session API to start
            const result = await startSession(selectedTestId, mode);

            setSessionId(result.session_id);
            setState({
                test: {
                    id: selectedTestId,
                    name: result.test_name,
                    duration_minutes: result.duration_minutes,
                    question_count: result.questions.length
                },
                questions: result.questions || [],
                currentIndex: 0,
                selectedAnswers: {},
                flagged: [],
                mode: result.mode,
                startedAt: new Date(),
                isPaused: false
            });
            setIsActive(true);
        } catch (error) {
            console.error('Error starting practice:', error);
            alert('Không thể bắt đầu session. Vui lòng thử lại.');
        }
    };

    const handleTimeUp = useCallback(() => {
        finishPractice();
    }, []);

    const finishPractice = async () => {
        if (!sessionId) {
            // Fallback to local calculation
            const { questions, selectedAnswers, startedAt } = state;

            let correct = 0;
            const breakdown = questions.map(q => {
                const selected = selectedAnswers[q.id] || [];
                const correctAnswers = q.answers.filter(a => a.is_correct).map(a => a.id);
                const isCorrect = correctAnswers.length === selected.length &&
                    correctAnswers.every(id => selected.includes(id));
                if (isCorrect) correct++;
                return { questionId: q.id, isCorrect };
            });

            const timeTaken = startedAt
                ? formatTime(Math.floor((Date.now() - startedAt.getTime()) / 1000))
                : '0:00';

            setResults({
                correct,
                total: questions.length,
                percentage: Math.round((correct / questions.length) * 100),
                timeTaken,
                breakdown
            });
            setIsActive(false);
            return;
        }

        try {
            const result = await completeSession(sessionId);

            // Format time taken nicely
            const secs = result.time_taken_seconds || 0;
            const mins = Math.floor(secs / 60);
            const remainingSecs = secs % 60;
            let timeTakenStr = '';
            if (mins === 0) {
                timeTakenStr = `${remainingSecs} giây`;
            } else if (remainingSecs === 0) {
                timeTakenStr = `${mins} phút`;
            } else {
                timeTakenStr = `${mins} phút ${remainingSecs} giây`;
            }

            setResults({
                correct: result.correct_count,
                total: result.total,
                percentage: result.score,
                timeTaken: timeTakenStr,
                breakdown: result.breakdown.map((b: any) => ({
                    questionId: b.question_id,
                    isCorrect: b.is_correct
                }))
            });
            setIsActive(false);
            setSessionId(null);
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const selectAnswer = async (answerId: number) => {
        const question = state.questions[state.currentIndex];
        const newSelected = [answerId]; // Single select for now

        // Optimistic update
        setState(prev => ({
            ...prev,
            selectedAnswers: {
                ...prev.selectedAnswers,
                [question.id]: newSelected
            }
        }));

        // Call API
        if (sessionId) {
            try {
                await submitAnswer(sessionId, question.id, newSelected);
            } catch (error) {
                console.error('Failed to submit answer:', error);
            }
        }
    };

    const toggleFlag = async () => {
        const questionIndex = state.currentIndex;
        const questionId = state.questions[questionIndex].id;
        const isFlagged = state.flagged.includes(questionIndex);

        // Optimistic update
        setState(prev => ({
            ...prev,
            flagged: isFlagged
                ? prev.flagged.filter(i => i !== questionIndex)
                : [...prev.flagged, questionIndex]
        }));

        // Call API
        if (sessionId) {
            try {
                await toggleFlagAPI(sessionId, questionId, !isFlagged);
            } catch (error) {
                console.error('Failed to toggle flag:', error);
            }
        }
    };

    // Submit answer for non-timed mode (reveal correct answer)
    const handleSubmitAnswer = (questionId: number) => {
        setSubmittedQuestions(prev => new Set([...prev, questionId]));
    };

    // Review Mode: View the test just taken with answers (check BEFORE results screen)
    if (reviewMode && results && state.questions.length > 0) {
        const reviewQuestion = state.questions[reviewIndex];
        const reviewSelected = state.selectedAnswers[reviewQuestion.id] || [];
        const reviewBreakdown = results.breakdown.find(b => b.questionId === reviewQuestion.id);

        return (
            <div className="fade-in">
                {/* Header */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ margin: 0 }}>Review: {state.test?.name}</h2>
                        <span className={`tag ${reviewBreakdown?.isCorrect ? 'success' : 'danger'}`}>
                            {reviewBreakdown?.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setReviewMode(false)}>
                        ← Back to Results
                    </button>
                </div>

                {/* Main Content - 2 columns */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 350px',
                    height: 'calc(100vh - 130px)'
                }}>
                    {/* Left: Question */}
                    <div style={{ padding: '24px', overflow: 'auto' }}>
                        <div className="question-card">
                            <div className="question-header">
                                <span style={{ fontWeight: 600 }}>Question {reviewIndex + 1} of {state.questions.length}</span>
                            </div>
                            <div className="question-body">
                                <p className="question-text">{reviewQuestion.text}</p>
                                <div className="answer-options">
                                    {reviewQuestion.answers.map((a, i) => {
                                        const isSelected = reviewSelected.includes(a.id);
                                        const isCorrect = a.is_correct;
                                        let className = 'answer-option';
                                        if (isCorrect) className += ' correct';
                                        else if (isSelected && !isCorrect) className += ' incorrect';

                                        return (
                                            <div key={a.id} className={className} style={{ cursor: 'default' }}>
                                                <div className="answer-marker">{String.fromCharCode(65 + i)}</div>
                                                <div style={{ flex: 1 }}>{a.text}</div>
                                                {isCorrect && <span style={{ color: 'var(--color-success)', marginLeft: '8px' }}>✓ Correct</span>}
                                                {isSelected && !isCorrect && <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>✗ Your answer</span>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation if available */}
                                {reviewQuestion.explanation && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid var(--color-primary)'
                                    }}>
                                        <strong style={{ color: 'var(--color-primary)' }}>Explanation:</strong>
                                        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>{reviewQuestion.explanation}</p>
                                    </div>
                                )}

                                {/* Diagram if available - clickable to zoom */}
                                {reviewQuestion.diagram_path && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        position: 'relative',
                                        cursor: 'zoom-in'
                                    }}
                                        onClick={() => setZoomedImage(`http://localhost:3001/diagrams/${reviewQuestion.diagram_path}`)}
                                    >
                                        <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '12px' }}>Architecture Diagram:</strong>
                                        <img
                                            src={`http://localhost:3001/diagrams/${reviewQuestion.diagram_path}`}
                                            alt="Architecture Diagram"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                objectFit: 'contain',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '24px',
                                            right: '24px',
                                            background: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px'
                                        }}>
                                            🔍 Click to zoom
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary btn-lg"
                                disabled={reviewIndex === 0}
                                onClick={() => setReviewIndex(prev => prev - 1)}
                            >
                                ← Previous
                            </button>
                            {reviewIndex === state.questions.length - 1 ? (
                                <button className="btn btn-primary btn-lg" onClick={() => setReviewMode(false)}>
                                    Back to Results
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => setReviewIndex(prev => prev + 1)}
                                >
                                    Next →
                                </button>
                            )}
                        </div>

                        {/* Question Nav */}
                        <div style={{ marginTop: '24px' }}>
                            <QuestionNav
                                total={state.questions.length}
                                current={reviewIndex}
                                answered={results.breakdown.filter(b => b.isCorrect).map(b =>
                                    state.questions.findIndex(q => q.id === b.questionId)
                                )}
                                flagged={results.breakdown.filter(b => !b.isCorrect).map(b =>
                                    state.questions.findIndex(q => q.id === b.questionId)
                                )}
                                onSelect={setReviewIndex}
                            />
                            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--color-success)' }}>● Correct</span>
                                <span style={{ marginLeft: '12px', color: 'var(--color-danger)' }}>● Incorrect</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Mentor Chat Panel */}
                    <div style={{ borderLeft: '1px solid var(--border-color)', height: '100%' }}>
                        <ChatPanel questionContext={reviewQuestion.text} questionId={reviewQuestion.id} />
                    </div>
                </div>

                {/* Zoom Modal for Diagram */}
                {zoomedImage && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.9)',
                            zIndex: 1001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'zoom-out',
                            padding: '40px'
                        }}
                        onClick={() => setZoomedImage(null)}
                    >
                        <button
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setZoomedImage(null)}
                        >
                            ✕
                        </button>
                        <img
                            src={zoomedImage}
                            alt="Zoomed Diagram"
                            style={{
                                maxWidth: '95vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px'
                            }}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Results Screen
    if (results) {
        return (
            <div className="fade-in">
                <header className="page-header">
                    <div className="page-header-content">
                        <div>
                            <h1 className="page-title">Practice Complete!</h1>
                            <p className="page-subtitle">Here's how you did on this practice session.</p>
                        </div>
                    </div>
                </header>

                <div className="page-body">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <div className="card-body" style={{ textAlign: 'center', padding: '48px' }}>
                                <div style={{
                                    fontSize: '72px',
                                    fontWeight: 700,
                                    color: results.percentage >= 70 ? 'var(--color-success)' : 'var(--color-warning)',
                                    marginBottom: '8px'
                                }}>
                                    {results.percentage}%
                                </div>
                                <div style={{ fontSize: '24px', marginBottom: '24px' }}>
                                    {results.correct} / {results.total} Correct
                                </div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                    Time Taken: {results.timeTaken}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: '16px',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <button className="btn btn-primary btn-lg" onClick={() => {
                                        setResults(null);
                                        setSelectedTestId(null);
                                        setSubmittedQuestions(new Set());
                                    }}>
                                        Practice Again
                                    </button>
                                    <button className="btn btn-secondary btn-lg" onClick={() => {
                                        setReviewMode(true);
                                        setReviewIndex(0);
                                    }}>
                                        Review Questions
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Question Breakdown</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {results.breakdown.map((item, i) => (
                                        <div key={i} style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: item.isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 600
                                        }}>
                                            {i + 1}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <span style={{ color: 'var(--color-success)' }}>● Correct</span>
                                    <span style={{ marginLeft: '16px', color: 'var(--color-danger)' }}>● Incorrect</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active Practice Screen
    if (isActive && state.questions.length > 0) {
        const currentQuestion = state.questions[state.currentIndex];
        const selected = state.selectedAnswers[currentQuestion.id] || [];
        const answeredIndices = Object.keys(state.selectedAnswers).map(qId =>
            state.questions.findIndex(q => q.id === parseInt(qId))
        ).filter(i => i >= 0);

        return (
            <div className="fade-in">
                {/* Header */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ margin: 0 }}>{state.test?.name}</h2>
                        <span className="tag info">
                            Question {state.currentIndex + 1} of {state.questions.length}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {state.mode === 'timed' && state.test && (
                            <Timer
                                initialMinutes={state.test.duration_minutes}
                                onTimeUp={handleTimeUp}
                                isPaused={state.isPaused}
                            />
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
                        >
                            {state.isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button className="btn btn-danger" onClick={finishPractice}>
                            End Test
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 350px',
                    height: 'calc(100vh - 130px)'
                }}>
                    {/* Left: Question */}
                    <div style={{ padding: '24px', overflow: 'auto' }}>
                        <div className="question-card">
                            <div className="question-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontWeight: 600 }}>Question {state.currentIndex + 1}</span>
                                </div>
                                <button
                                    className={`btn ${state.flagged.includes(state.currentIndex) ? 'btn-warning' : 'btn-ghost'}`}
                                    onClick={toggleFlag}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    {state.flagged.includes(state.currentIndex) ? 'Flagged' : 'Flag'}
                                </button>
                            </div>
                            <div className="question-body">
                                <p className="question-text">{currentQuestion.text}</p>
                                <div className="answer-options">
                                    {currentQuestion.answers.map((a, i) => {
                                        const isSubmitted = submittedQuestions.has(currentQuestion.id);
                                        const isSelected = selected.includes(a.id);
                                        const isCorrect = a.is_correct;

                                        // Determine styling based on submission state
                                        let className = 'answer-option';
                                        if (isSubmitted) {
                                            if (isCorrect) className += ' correct';
                                            else if (isSelected && !isCorrect) className += ' incorrect';
                                        } else if (isSelected) {
                                            className += ' selected';
                                        }

                                        return (
                                            <div
                                                key={a.id}
                                                className={className}
                                                onClick={() => !isSubmitted && selectAnswer(a.id)}
                                                style={{ cursor: isSubmitted ? 'default' : 'pointer' }}
                                            >
                                                <div className="answer-marker">{String.fromCharCode(65 + i)}</div>
                                                <div style={{ flex: 1 }}>{a.text}</div>
                                                {isSubmitted && isCorrect && (
                                                    <span style={{ color: 'var(--color-success)', marginLeft: '8px' }}>✓</span>
                                                )}
                                                {isSubmitted && isSelected && !isCorrect && (
                                                    <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>✗</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation after submit (non-timed mode) */}
                                {state.mode === 'non-timed' && submittedQuestions.has(currentQuestion.id) && currentQuestion.explanation && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid var(--color-primary)'
                                    }}>
                                        <strong style={{ color: 'var(--color-primary)' }}>Explanation:</strong>
                                        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>{currentQuestion.explanation}</p>
                                    </div>
                                )}

                                {/* Diagram after submit (non-timed mode) */}
                                {state.mode === 'non-timed' && submittedQuestions.has(currentQuestion.id) && currentQuestion.diagram_path && (
                                    <div
                                        style={{
                                            marginTop: '16px',
                                            padding: '16px',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            position: 'relative',
                                            cursor: 'zoom-in'
                                        }}
                                        onClick={() => setZoomedImage(`http://localhost:3001/diagrams/${currentQuestion.diagram_path}`)}
                                    >
                                        <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '12px' }}>Architecture Diagram:</strong>
                                        <img
                                            src={`http://localhost:3001/diagrams/${currentQuestion.diagram_path}`}
                                            alt="Architecture Diagram"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                objectFit: 'contain',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '24px',
                                            right: '24px',
                                            background: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px'
                                        }}>
                                            🔍 Click to zoom
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary btn-lg"
                                disabled={state.currentIndex === 0}
                                onClick={() => setState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }))}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Previous
                            </button>

                            {/* Non-timed mode: Show Submit button alongside Next */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {state.mode === 'non-timed' && !submittedQuestions.has(currentQuestion.id) && (
                                    <button
                                        className="btn btn-success btn-lg"
                                        disabled={selected.length === 0}
                                        onClick={() => handleSubmitAnswer(currentQuestion.id)}
                                    >
                                        ✓ Submit
                                    </button>
                                )}
                                {state.currentIndex === state.questions.length - 1 ? (
                                    <button className="btn btn-primary btn-lg" onClick={finishPractice}>
                                        Finish Test
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))}
                                    >
                                        Next
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Question Nav */}
                        <div style={{ marginTop: '24px' }}>
                            <QuestionNav
                                total={state.questions.length}
                                current={state.currentIndex}
                                answered={answeredIndices}
                                flagged={state.flagged}
                                onSelect={(i) => setState(prev => ({ ...prev, currentIndex: i }))}
                            />
                        </div>
                    </div>

                    {/* Right: Chat Panel */}
                    <div style={{ borderLeft: '1px solid var(--border-color)', height: '100%' }}>
                        <ChatPanel questionContext={currentQuestion.text} questionId={currentQuestion.id} />
                    </div>
                </div>

                {/* Zoom Modal for Diagram */}
                {zoomedImage && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.9)',
                            zIndex: 1001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'zoom-out',
                            padding: '40px'
                        }}
                        onClick={() => setZoomedImage(null)}
                    >
                        <button
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setZoomedImage(null)}
                        >
                            ✕
                        </button>
                        <img
                            src={zoomedImage}
                            alt="Zoomed Diagram"
                            style={{
                                maxWidth: '95vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px'
                            }}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Start Screen
    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Practice Session</h1>
                        <p className="page-subtitle">Select a test and start practicing.</p>
                    </div>
                </div>
            </header>

            <div className="page-body">
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Start New Practice</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Select Test</label>
                                <select
                                    className="form-input form-select"
                                    value={selectedTestId || ''}
                                    onChange={(e) => setSelectedTestId(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Choose a test...</option>
                                    {tests.map(test => (
                                        <option key={test.id} value={test.id}>
                                            {test.name} ({test.question_count} questions)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Practice Mode</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        className={`btn ${mode === 'timed' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setMode('timed')}
                                        style={{ flex: 1 }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        Timed
                                    </button>
                                    <button
                                        className={`btn ${mode === 'non-timed' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setMode('non-timed')}
                                        style={{ flex: 1 }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                        </svg>
                                        Non-Timed
                                    </button>
                                </div>
                            </div>

                            <button
                                className="btn btn-success btn-lg"
                                style={{ width: '100%', marginTop: '16px' }}
                                onClick={startPractice}
                                disabled={!selectedTestId}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Start Practice
                            </button>

                            {tests.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)' }}>
                                    <p>No tests available yet.</p>
                                    <a href="/test-builder" className="btn btn-secondary" style={{ marginTop: '8px' }}>
                                        Create a Test
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
