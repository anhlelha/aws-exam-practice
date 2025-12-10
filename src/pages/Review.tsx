import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    getQuestionsForReview,
    autoTagQuestion,
    autoClassifyQuestion,
    bulkProcessQuestions,
    getAllTags,
    getAllCategories,
    deleteQuestion
} from '../services/reviewService';

interface Question {
    id: number;
    text: string;
    explanation: string | null;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    diagram_path: string | null;
    answers: { id: number; text: string; is_correct: boolean }[];
    tags: { id: number; name: string; color: string }[] | string | null;
}

interface Category {
    id: number;
    name: string;
    color: string;
}

interface Tag {
    id: number;
    name: string;
    color: string;
}

export default function Review() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [_tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Filters
    const [filter, setFilter] = useState({
        category_id: '',
        unclassified: false,
        tag: ''
    });

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        loadData();
    }, [filter, page]);

    // Auto-open question from URL query param
    useEffect(() => {
        const qId = searchParams.get('q');
        if (qId && questions.length > 0) {
            const question = questions.find(q => q.id === parseInt(qId));
            if (question) {
                setSelectedQuestion(question);
                // Clear the query param after opening
                setSearchParams({});
            }
        }
    }, [questions, searchParams]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [questionsData, categoriesData, tagsData] = await Promise.all([
                getQuestionsForReview({
                    category_id: filter.category_id ? parseInt(filter.category_id) : undefined,
                    unclassified: filter.unclassified,
                    tag: filter.tag || undefined,
                    page,
                    limit: 20
                }),
                getAllCategories(),
                getAllTags()
            ]);
            setQuestions(questionsData.questions || []);
            setTotal(questionsData.pagination?.total || 0);
            // Flatten categories from certifications
            const allCategories = categoriesData.flatMap((cert: any) => cert.categories || []);
            setCategories(allCategories);
            setTags(tagsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoTag = async (questionId: number) => {
        setProcessing(questionId);
        try {
            await autoTagQuestion(questionId);
            await loadData();
        } catch (error) {
            console.error('Error auto-tagging:', error);
            alert('Failed to auto-tag question');
        } finally {
            setProcessing(null);
        }
    };

    const handleAutoClassify = async (questionId: number) => {
        setProcessing(questionId);
        try {
            await autoClassifyQuestion(questionId);
            await loadData();
        } catch (error) {
            console.error('Error auto-classifying:', error);
            alert('Failed to auto-classify question');
        } finally {
            setProcessing(null);
        }
    };

    const handleBulkProcess = async () => {
        if (selected.length === 0) return;

        const confirmed = window.confirm(
            `This will process ${selected.length} questions using LLM API calls.\n\n` +
            `If using a paid LLM provider, this may incur costs.\n\nContinue?`
        );

        if (!confirmed) return;

        setBulkProcessing(true);
        try {
            await bulkProcessQuestions(selected);
            setSelected([]);
            await loadData();
            alert('Bulk processing completed!');
        } catch (error) {
            console.error('Error bulk processing:', error);
            alert('Failed to bulk process questions');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelected(questions.map(q => q.id));
        } else {
            setSelected([]);
        }
    };

    const handleSelectQuestion = (id: number, checked: boolean) => {
        if (checked) {
            setSelected(prev => [...prev, id]);
        } else {
            setSelected(prev => prev.filter(qId => qId !== id));
        }
    };

    // Navigate to edit page
    const handleEdit = (questionId: number) => {
        navigate(`/manual-entry?edit=${questionId}`);
    };

    // Delete question
    const handleDeleteQuestion = async (questionId: number) => {
        const confirmed = window.confirm('Delete this question? This action cannot be undone.');
        if (!confirmed) return;

        try {
            setProcessing(questionId);
            await deleteQuestion(questionId);
            await loadData();
            setSelectedQuestion(null);
        } catch (error) {
            console.error('Failed to delete question:', error);
            alert('Failed to delete question');
        } finally {
            setProcessing(null);
        }
    };

    // Get tags as array (handle both string and array formats)
    const getTagsArray = (question: Question): { id?: number; name: string; color?: string }[] => {
        if (!question.tags) return [];
        if (Array.isArray(question.tags)) return question.tags;
        if (typeof question.tags === 'string') {
            return question.tags.split(',').map(t => ({ name: t.trim() }));
        }
        return [];
    };

    const getStatusBadge = (question: Question) => {
        const hasTags = getTagsArray(question).length > 0;
        const hasCategory = question.category_id != null;

        if (hasTags && hasCategory) {
            return <span className="tag success">Ready</span>;
        } else if (hasTags || hasCategory) {
            return <span className="tag warning">Partial</span>;
        } else {
            return <span className="tag" style={{ background: 'var(--color-danger)' }}>Unprocessed</span>;
        }
    };

    const pageCount = Math.ceil(total / 20);

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Question Review</h1>
                        <p className="page-subtitle">
                            Review, tag, and classify questions before adding to tests. {total} questions total.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {selected.length > 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={handleBulkProcess}
                                disabled={bulkProcessing}
                            >
                                {bulkProcessing ? (
                                    <>
                                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                        Processing...
                                    </>
                                ) : (
                                    <>Process {selected.length} Selected</>
                                )}
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <div className="page-body">
                {/* Filter Bar */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            className="form-input form-select"
                            style={{ width: '200px' }}
                            value={filter.category_id}
                            onChange={e => {
                                setFilter(prev => ({ ...prev, category_id: e.target.value }));
                                setPage(1);
                            }}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={filter.unclassified}
                                onChange={e => {
                                    setFilter(prev => ({ ...prev, unclassified: e.target.checked }));
                                    setPage(1);
                                }}
                                style={{ width: 16, height: 16 }}
                            />
                            <span>Unclassified Only</span>
                        </label>

                        <input
                            type="text"
                            className="form-input"
                            placeholder="Filter by tag..."
                            style={{ width: '180px' }}
                            value={filter.tag}
                            onChange={e => {
                                setFilter(prev => ({ ...prev, tag: e.target.value }));
                                setPage(1);
                            }}
                        />

                        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '14px' }}>
                            Showing {questions.length} of {total} questions
                        </div>
                    </div>
                </div>

                {/* Questions Table */}
                <div className="card">
                    {loading ? (
                        <div style={{ padding: '64px', textAlign: 'center' }}>
                            <div className="spinner" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <h3 style={{ marginBottom: '8px' }}>No Questions Found</h3>
                            <p>Try adjusting your filters or upload a PDF to extract questions.</p>
                            <a href="/upload" className="btn btn-primary" style={{ marginTop: '16px' }}>
                                Upload PDF
                            </a>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selected.length === questions.length && questions.length > 0}
                                                onChange={e => handleSelectAll(e.target.checked)}
                                                style={{ width: 16, height: 16 }}
                                            />
                                        </th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '80px' }}>Status</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Question</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '200px' }}>Tags</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>Category</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', width: '150px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {questions.map(q => (
                                        <tr
                                            key={q.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-color)',
                                                background: selected.includes(q.id) ? 'var(--bg-tertiary)' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedQuestion(q)}
                                        >
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(q.id)}
                                                    onChange={e => handleSelectQuestion(q.id, e.target.checked)}
                                                    style={{ width: 16, height: 16 }}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {getStatusBadge(q)}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ maxWidth: '400px', fontSize: '14px' }}>
                                                    {q.text.length > 120 ? q.text.substring(0, 120) + '...' : q.text}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {getTagsArray(q).length > 0 ? (
                                                        getTagsArray(q).slice(0, 3).map((tag, i) => (
                                                            <span
                                                                key={i}
                                                                className="tag info"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                {tag.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                                                            No tags
                                                        </span>
                                                    )}
                                                    {getTagsArray(q).length > 3 && (
                                                        <span className="tag" style={{ fontSize: '11px', background: 'var(--bg-tertiary)' }}>
                                                            +{getTagsArray(q).length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {q.category_name ? (
                                                    <span
                                                        className="tag"
                                                        style={{
                                                            background: q.category_color || 'var(--color-primary)',
                                                            color: 'white',
                                                            fontSize: '11px'
                                                        }}
                                                    >
                                                        {q.category_name}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                                                        Unclassified
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleAutoTag(q.id)}
                                                        disabled={processing === q.id}
                                                        title="Auto-tag with LLM"
                                                    >
                                                        {processing === q.id ? '...' : '🏷️ Tag'}
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleAutoClassify(q.id)}
                                                        disabled={processing === q.id}
                                                        title="Auto-classify with LLM"
                                                    >
                                                        {processing === q.id ? '...' : '📁 Classify'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '16px',
                                borderTop: '1px solid var(--border-color)'
                            }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    ← Previous
                                </button>
                                <span style={{ padding: '0 16px', color: 'var(--text-secondary)' }}>
                                    Page {page} of {pageCount || 1}
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page >= pageCount}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Question Detail Modal - View Only */}
            {selectedQuestion && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px'
                    }}
                    onClick={() => setSelectedQuestion(null)}
                >
                    <div
                        className="card"
                        style={{
                            maxWidth: '1100px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            width: '100%'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title">Question Details</h3>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setSelectedQuestion(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: '24px' }}>
                                {/* Left Column - Question Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Status */}
                                    <div style={{ marginBottom: '16px' }}>
                                        {getStatusBadge(selectedQuestion)}
                                    </div>

                                    {/* Question Text */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label className="form-label">Question</label>
                                        <p style={{
                                            background: 'var(--bg-tertiary)',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            lineHeight: 1.6,
                                            margin: 0
                                        }}>
                                            {selectedQuestion.text}
                                        </p>
                                    </div>

                                    {/* Answers */}
                                    {selectedQuestion.answers && selectedQuestion.answers.length > 0 && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <label className="form-label">Answers</label>
                                            <div className="answer-options">
                                                {selectedQuestion.answers.map((a, i) => (
                                                    <div
                                                        key={a.id}
                                                        className={`answer-option ${a.is_correct ? 'correct' : ''}`}
                                                    >
                                                        <div className="answer-marker">{String.fromCharCode(65 + i)}</div>
                                                        <div>{a.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags & Category Row */}
                                    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                                        {/* Tags */}
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Tags</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {getTagsArray(selectedQuestion).length > 0 ? (
                                                    getTagsArray(selectedQuestion).map((tag, i) => (
                                                        <span key={i} className="tag info">{tag.name}</span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        No tags assigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Category</label>
                                            {selectedQuestion.category_name ? (
                                                <span
                                                    className="tag"
                                                    style={{
                                                        background: selectedQuestion.category_color || 'var(--color-primary)',
                                                        color: 'white'
                                                    }}
                                                >
                                                    {selectedQuestion.category_name}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Unclassified
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Explanation */}
                                    {selectedQuestion.explanation && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <label className="form-label">Explanation</label>
                                            <div style={{
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(34, 197, 94, 0.3)'
                                            }}>
                                                {selectedQuestion.explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Diagram */}
                                <div style={{
                                    width: '350px',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <label className="form-label">Architecture Diagram</label>
                                    <div style={{
                                        flex: 1,
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        border: '2px dashed var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '250px',
                                        padding: '16px',
                                        cursor: selectedQuestion.diagram_path ? 'zoom-in' : 'default',
                                        position: 'relative'
                                    }}
                                        onClick={() => {
                                            if (selectedQuestion.diagram_path) {
                                                setZoomedImage(`http://localhost:3001/diagrams/${selectedQuestion.diagram_path}`);
                                            }
                                        }}
                                    >
                                        {selectedQuestion.diagram_path ? (
                                            <>
                                                <img
                                                    src={`http://localhost:3001/diagrams/${selectedQuestion.diagram_path}`}
                                                    alt="Architecture Diagram"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '350px',
                                                        objectFit: 'contain',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '8px',
                                                    right: '8px',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px'
                                                }}>
                                                    🔍 Click to zoom
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '8px' }}>
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <polyline points="21 15 16 10 5 21" />
                                                </svg>
                                                <div style={{ fontSize: '14px' }}>No diagram</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '24px' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleEdit(selectedQuestion.id)}
                                >
                                    ✏️ Edit Question
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleAutoTag(selectedQuestion.id)}
                                    disabled={processing === selectedQuestion.id}
                                >
                                    {processing === selectedQuestion.id ? 'Processing...' : '🏷️ Auto Tag'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleAutoClassify(selectedQuestion.id)}
                                    disabled={processing === selectedQuestion.id}
                                >
                                    {processing === selectedQuestion.id ? 'Processing...' : '📁 Auto Classify'}
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                                    disabled={processing === selectedQuestion.id}
                                >
                                    🗑️ Delete
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ marginLeft: 'auto' }}
                                    onClick={() => setSelectedQuestion(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
