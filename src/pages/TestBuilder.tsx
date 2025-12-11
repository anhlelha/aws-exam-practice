import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import {
    getTests,
    getTestQuestions,
    deleteTest,
    getTestForEdit,
    createTestWithQuestions,
    updateTest,
    getQuestionsForSelection,
    getCategories,
    type QuestionSummary
} from '../services/testBuilderService';

interface Category {
    id: number;
    name: string;
    color: string;
}

interface Test {
    id: number;
    name: string;
    duration_minutes: number;
    question_count: number;
    created_at: string;
}

interface TestQuestion {
    id: number;
    text: string;
    category_name?: string;
    category_color?: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function TestBuilder() {
    const navigate = useNavigate();

    // State
    const [categories, setCategories] = useState<Category[]>([]);
    const [existingTests, setExistingTests] = useState<Test[]>([]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Edit/Create form state
    const [editingTestId, setEditingTestId] = useState<number | null>(null);
    const [testName, setTestName] = useState('');
    const [duration, setDuration] = useState(60);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

    // Question browser state
    const [availableQuestions, setAvailableQuestions] = useState<QuestionSummary[]>([]);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');

    useEffect(() => {
        loadCategories();
        loadExistingTests();
    }, []);

    const loadCategories = async () => {
        try {
            const cats = await getCategories();
            setCategories(cats);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadExistingTests = async () => {
        try {
            const tests = await getTests();
            setExistingTests(tests);
            if (tests.length > 0 && !selectedTest) {
                handleSelectTest(tests[0]);
            }
        } catch (error) {
            console.error('Failed to load tests:', error);
        }
    };

    const loadAvailableQuestions = async () => {
        try {
            const result = await getQuestionsForSelection({
                category_id: filterCategoryId || undefined,
                search: searchQuery || undefined,
                limit: 100
            });
            setAvailableQuestions(result.questions);
        } catch (error) {
            console.error('Failed to load questions:', error);
        }
    };

    useEffect(() => {
        if (viewMode === 'create' || viewMode === 'edit') {
            loadAvailableQuestions();
        }
    }, [viewMode, filterCategoryId, searchQuery]);

    const handleSelectTest = async (test: Test) => {
        setSelectedTest(test);
        setViewMode('list');
        setLoadingQuestions(true);
        try {
            const data = await getTestQuestions(test.id);
            setTestQuestions(data.questions || []);
        } catch (error) {
            console.error('Failed to load test questions:', error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleDeleteTest = async (testId: number) => {
        if (!window.confirm('Delete this test? This action cannot be undone.')) return;
        try {
            await deleteTest(testId);
            setSelectedTest(null);
            setTestQuestions([]);
            await loadExistingTests();
        } catch (error) {
            console.error('Failed to delete test:', error);
        }
    };

    const handleCreateNew = () => {
        setViewMode('create');
        setEditingTestId(null);
        setTestName('');
        setDuration(60);
        setSelectedQuestionIds([]);
        setCheckedIds(new Set());
    };

    const handleEditTest = async (test: Test) => {
        setViewMode('edit');
        setEditingTestId(test.id);
        setTestName(test.name);
        setDuration(test.duration_minutes);
        try {
            const testData = await getTestForEdit(test.id);
            setSelectedQuestionIds(testData.question_ids);
        } catch (error) {
            console.error('Failed to load test for edit:', error);
        }
    };

    const handleCheckQuestion = (questionId: number, checked: boolean) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(questionId);
            else next.delete(questionId);
            return next;
        });
    };

    const handleAddSelected = () => {
        setSelectedQuestionIds(prev => [...new Set([...prev, ...checkedIds])]);
        setCheckedIds(new Set());
    };

    const handleRemoveQuestion = (questionId: number) => {
        setSelectedQuestionIds(prev => prev.filter(id => id !== questionId));
    };

    const handleSave = async () => {
        if (!testName.trim()) {
            alert('Please enter a test name');
            return;
        }
        if (selectedQuestionIds.length === 0) {
            alert('Please select at least one question');
            return;
        }

        setLoading(true);
        try {
            const data = {
                name: testName,
                duration_minutes: duration,
                question_ids: selectedQuestionIds
            };

            if (viewMode === 'edit' && editingTestId) {
                await updateTest(editingTestId, data);
            } else {
                await createTestWithQuestions(data);
            }

            setViewMode('list');
            await loadExistingTests();
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save test');
        } finally {
            setLoading(false);
        }
    };

    // Get question details for selected IDs
    const getQuestionById = (id: number) => availableQuestions.find(q => q.id === id);

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Test Builder</h1>
                        <p className="page-subtitle">Create and manage your practice tests.</p>
                    </div>
                    {(viewMode === 'create' || viewMode === 'edit') && (
                        <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
                            ← Back to Tests
                        </button>
                    )}
                </div>
            </header>

            <div className="page-body">
                {/* LIST MODE */}
                {viewMode === 'list' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', height: 'calc(100vh - 180px)' }}>
                        {/* Left Sidebar: My Tests */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div className="card-header" style={{ flexShrink: 0 }}>
                                <h3 className="card-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>My Tests</h3>
                                <span className="tag info">{existingTests.length}</span>
                            </div>
                            <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                {existingTests.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                                        <p>No tests yet</p>
                                    </div>
                                ) : (
                                    existingTests.map(test => (
                                        <div
                                            key={test.id}
                                            onClick={() => handleSelectTest(test)}
                                            style={{
                                                padding: '14px',
                                                marginBottom: '10px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-tertiary)',
                                                border: selectedTest?.id === test.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{test.name}</div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>{test.question_count} Qs</span>
                                                <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{test.duration_minutes} min</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateNew}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Create New Test
                                </button>
                            </div>
                        </div>

                        {/* Right: Test Details */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {selectedTest ? (
                                <>
                                    <div className="card-header" style={{ flexShrink: 0 }}>
                                        <div>
                                            <h3 className="card-title">{selectedTest.name}</h3>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg><strong>{testQuestions.length}</strong> Questions</span>
                                                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><strong>{selectedTest.duration_minutes}</strong> minutes</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-primary" onClick={() => navigate(`/practice?test=${selectedTest.id}`)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>Start Practice
                                            </button>
                                            <button className="btn btn-secondary" onClick={() => handleEditTest(selectedTest)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>Edit
                                            </button>
                                            <button className="btn btn-danger" onClick={() => handleDeleteTest(selectedTest.id)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                                        {loadingQuestions ? (
                                            <div style={{ textAlign: 'center', padding: '48px' }}>Loading...</div>
                                        ) : (
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '50px' }}>#</th>
                                                        <th>Question</th>
                                                        <th style={{ width: '140px' }}>Category</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {testQuestions.map((q, i) => (
                                                        <tr key={q.id} onClick={() => navigate(`/review?q=${q.id}`)} style={{ cursor: 'pointer' }}>
                                                            <td><span className="question-badge" style={{ fontSize: '12px' }}>{i + 1}</span></td>
                                                            <td style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {q.text}
                                                            </td>
                                                            <td>
                                                                {q.category_name && (
                                                                    <span className="tag" style={{ background: q.category_color || 'var(--color-primary)', color: 'white' }}>
                                                                        {q.category_name}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <h3>No Tests Yet</h3>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Create your first practice test!</p>
                                        <button className="btn btn-primary btn-lg" onClick={handleCreateNew}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Create New Test
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CREATE/EDIT MODE */}
                {(viewMode === 'create' || viewMode === 'edit') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', height: 'calc(100vh - 180px)' }}>
                        {/* Left: Question Browser */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div className="card-header" style={{ flexShrink: 0 }}>
                                <h3 className="card-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>Available Questions</h3>
                                <span className="tag info">{availableQuestions.length}</span>
                            </div>

                            {/* Filters */}
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search questions..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ flex: 1, minWidth: '200px' }}
                                />
                                <select
                                    className="form-input form-select"
                                    value={filterCategoryId}
                                    onChange={e => setFilterCategoryId(e.target.value ? Number(e.target.value) : '')}
                                    style={{ width: '200px' }}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Question List */}
                            <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setCheckedIds(new Set(availableQuestions.map(q => q.id)));
                                                        } else {
                                                            setCheckedIds(new Set());
                                                        }
                                                    }}
                                                    checked={checkedIds.size === availableQuestions.length && availableQuestions.length > 0}
                                                />
                                            </th>
                                            <th style={{ width: '50px' }}>#</th>
                                            <th>Question</th>
                                            <th style={{ width: '150px' }}>Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableQuestions.map(q => (
                                            <tr
                                                key={q.id}
                                                style={{
                                                    background: selectedQuestionIds.includes(q.id) ? 'rgba(255, 153, 0, 0.1)' : undefined
                                                }}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={checkedIds.has(q.id)}
                                                        disabled={selectedQuestionIds.includes(q.id)}
                                                        onChange={e => handleCheckQuestion(q.id, e.target.checked)}
                                                    />
                                                </td>
                                                <td><span className="question-badge" style={{ fontSize: '12px' }}>{q.id}</span></td>
                                                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {selectedQuestionIds.includes(q.id) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" style={{ marginRight: '6px', verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12" /></svg>}
                                                    {q.text}
                                                </td>
                                                <td>
                                                    {q.category_name && (
                                                        <span className="tag" style={{ fontSize: '11px', background: q.category_color || 'var(--bg-tertiary)' }}>
                                                            {q.category_name}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add Selected Button */}
                            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    <strong>{checkedIds.size}</strong> selected
                                </span>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddSelected}
                                    disabled={checkedIds.size === 0}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add Selected ({checkedIds.size})
                                </button>
                            </div>
                        </div>

                        {/* Right: Test Configuration */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div className="card-header" style={{ flexShrink: 0 }}>
                                <h3 className="card-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>Test Configuration</h3>
                                <span className="tag warning">{viewMode === 'edit' ? 'Edit Mode' : 'New Test'}</span>
                            </div>

                            <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Test Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter test name..."
                                        value={testName}
                                        onChange={e => setTestName(e.target.value)}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <label className="form-label">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min={1}
                                        max={180}
                                        value={duration}
                                        onChange={e => setDuration(parseInt(e.target.value) || 60)}
                                    />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Test Questions</span>
                                        <span className="tag success">{selectedQuestionIds.length}</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {selectedQuestionIds.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                No questions selected yet.<br />
                                                Select questions from the left panel.
                                            </div>
                                        ) : (
                                            selectedQuestionIds.map((qId, index) => {
                                                const q = getQuestionById(qId);
                                                return (
                                                    <div
                                                        key={qId}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '10px 12px',
                                                            background: 'var(--bg-tertiary)',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        <span className="question-badge" style={{ fontSize: '11px' }}>{index + 1}</span>
                                                        <span style={{ flex: 1, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {q?.text || `Question #${qId}`}
                                                        </span>
                                                        <button
                                                            className="btn btn-ghost btn-icon"
                                                            onClick={() => handleRemoveQuestion(qId)}
                                                            style={{ color: 'var(--color-danger)', padding: '4px' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setViewMode('list')}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 2 }}
                                    onClick={handleSave}
                                    disabled={loading || !testName.trim() || selectedQuestionIds.length === 0}
                                >
                                    {loading ? 'Saving...' : viewMode === 'edit' ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>Save Changes</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '6px', verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12" /></svg>Create Test</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
