import API_BASE_URL from '../config/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { previewQuestions, createTestWithSelection, getTests, getTestQuestions, deleteTest } from '../services/testBuilderService';
import type { PreviewResult } from '../services/testBuilderService';

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

export default function TestBuilder() {
    const navigate = useNavigate();

    // State
    const [categories, setCategories] = useState<Category[]>([]);
    const [existingTests, setExistingTests] = useState<Test[]>([]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // View mode: 'list' (show selected test) or 'create' (show create form)
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'preview'>('list');
    const [preview, setPreview] = useState<PreviewResult | null>(null);

    // Create form state
    const [config, setConfig] = useState({
        name: '',
        duration_minutes: 60,
        count: 10,
        selection_mode: 'random' as const,
        category_ids: [] as number[]
    });

    useEffect(() => {
        // Load categories
        fetch('http://localhost:3001/api/settings/certifications')
            .then(res => res.json())
            .then(data => {
                const allCategories = data.flatMap((cert: any) => cert.categories || []);
                setCategories(allCategories);
            });

        // Load existing tests
        loadExistingTests();
    }, []);

    const loadExistingTests = async () => {
        try {
            const tests = await getTests();
            setExistingTests(tests);
            // Auto-select first test if available
            if (tests.length > 0 && !selectedTest) {
                handleSelectTest(tests[0]);
            }
        } catch (error) {
            console.error('Failed to load tests:', error);
        }
    };

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
        setConfig({ name: '', duration_minutes: 60, count: 10, selection_mode: 'random', category_ids: [] });
    };

    const handlePreview = async () => {
        if (!config.name.trim()) {
            alert('Please enter a test name');
            return;
        }
        setLoading(true);
        try {
            const result = await previewQuestions({
                count: config.count,
                selection_mode: config.selection_mode,
                category_ids: config.category_ids.length > 0 ? config.category_ids : undefined
            });
            setPreview(result);
            setViewMode('preview');
        } catch (error) {
            console.error('Preview error:', error);
            alert('Failed to preview questions');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTest = async () => {
        setLoading(true);
        try {
            await createTestWithSelection(config);
            setViewMode('list');
            await loadExistingTests();
        } catch (error) {
            console.error('Create error:', error);
            alert('Failed to create test');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Test Builder</h1>
                        <p className="page-subtitle">Create and manage your practice tests.</p>
                    </div>
                </div>
            </header>

            <div className="page-body">
                {/* Two-column layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', height: 'calc(100vh - 180px)' }}>

                    {/* Left Sidebar: My Tests */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="card-header" style={{ flexShrink: 0 }}>
                            <h3 className="card-title">📚 My Tests</h3>
                            <span className="tag info">{existingTests.length}</span>
                        </div>
                        <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                            {existingTests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                                    <p>No tests yet</p>
                                    <p style={{ fontSize: '12px' }}>Create your first test!</p>
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
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{test.name}</div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                            <span>📝 {test.question_count} Qs</span>
                                            <span>⏱️ {test.duration_minutes} min</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                            {new Date(test.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Create New Button */}
                        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateNew}>
                                ➕ Create New Test
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* VIEW MODE: Show selected test details */}
                        {viewMode === 'list' && selectedTest && (
                            <>
                                <div className="card-header" style={{ flexShrink: 0 }}>
                                    <div>
                                        <h3 className="card-title">{selectedTest.name}</h3>
                                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                            <span>📝 <strong>{testQuestions.length}</strong> Questions</span>
                                            <span>⏱️ <strong>{selectedTest.duration_minutes}</strong> minutes</span>
                                            <span>📅 {new Date(selectedTest.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-primary" onClick={() => navigate(`/practice?test=${selectedTest.id}`)}>
                                            🎯 Start Practice
                                        </button>
                                        <button className="btn btn-danger" onClick={() => handleDeleteTest(selectedTest.id)}>
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                                    {loadingQuestions ? (
                                        <div style={{ textAlign: 'center', padding: '48px' }}>
                                            <div className="spinner" />
                                            <p>Loading questions...</p>
                                        </div>
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
                                                    <tr
                                                        key={q.id}
                                                        onClick={() => navigate(`/review?q=${q.id}`)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
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
                        )}

                        {/* VIEW MODE: No test selected */}
                        {viewMode === 'list' && !selectedTest && existingTests.length === 0 && (
                            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                                    <h3>No Tests Yet</h3>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Create your first practice test to get started!</p>
                                    <button className="btn btn-primary btn-lg" onClick={handleCreateNew}>
                                        ➕ Create New Test
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CREATE MODE: Show create form */}
                        {viewMode === 'create' && (
                            <>
                                <div className="card-header" style={{ flexShrink: 0 }}>
                                    <h3 className="card-title">Create New Test</h3>
                                    <button className="btn btn-ghost" onClick={() => setViewMode('list')}>✕ Cancel</button>
                                </div>
                                <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
                                    <div style={{ maxWidth: '600px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Test Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g., SAA Practice Test 1"
                                                value={config.name}
                                                onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className="form-group">
                                                <label className="form-label">Duration (minutes)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min={5}
                                                    max={180}
                                                    value={config.duration_minutes}
                                                    onChange={e => setConfig(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Number of Questions</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min={1}
                                                    max={100}
                                                    value={config.count}
                                                    onChange={e => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Selection Mode</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                {[
                                                    { value: 'random', label: '🎲 Random' },
                                                    { value: 'new', label: '✨ New Only' },
                                                    { value: 'wrong', label: '❌ Wrong Answers' },
                                                    { value: 'flagged', label: '🚩 Flagged' }
                                                ].map(mode => (
                                                    <div
                                                        key={mode.value}
                                                        onClick={() => setConfig(prev => ({ ...prev, selection_mode: mode.value as any }))}
                                                        style={{
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            border: config.selection_mode === mode.value ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                                            background: config.selection_mode === mode.value ? 'rgba(255, 153, 0, 0.1)' : 'var(--bg-tertiary)',
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            fontWeight: config.selection_mode === mode.value ? 600 : 400
                                                        }}
                                                    >
                                                        {mode.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {categories.length > 0 && (
                                            <div className="form-group">
                                                <label className="form-label">Categories (optional)</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {categories.map(cat => (
                                                        <label
                                                            key={cat.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 14px',
                                                                borderRadius: '20px',
                                                                background: config.category_ids.includes(cat.id) ? cat.color || 'var(--color-primary)' : 'var(--bg-tertiary)',
                                                                color: config.category_ids.includes(cat.id) ? 'white' : 'inherit',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={config.category_ids.includes(cat.id)}
                                                                onChange={e => {
                                                                    setConfig(prev => ({
                                                                        ...prev,
                                                                        category_ids: e.target.checked
                                                                            ? [...prev.category_ids, cat.id]
                                                                            : prev.category_ids.filter(id => id !== cat.id)
                                                                    }));
                                                                }}
                                                                style={{ display: 'none' }}
                                                            />
                                                            {cat.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ width: '100%', marginTop: '16px' }}
                                            onClick={handlePreview}
                                            disabled={loading || !config.name.trim()}
                                        >
                                            {loading ? 'Loading...' : 'Preview Questions →'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PREVIEW MODE: Show preview questions */}
                        {viewMode === 'preview' && preview && (
                            <>
                                <div className="card-header" style={{ flexShrink: 0 }}>
                                    <div>
                                        <h3 className="card-title">Preview: {config.name}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                            {preview.count} questions selected
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-ghost" onClick={() => setViewMode('create')}>← Back</button>
                                        <button className="btn btn-success" onClick={handleCreateTest} disabled={loading}>
                                            {loading ? 'Creating...' : '✓ Create Test'}
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                <th>Question</th>
                                                <th style={{ width: '140px' }}>Category</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.questions.map((q, i) => (
                                                <tr key={q.id}>
                                                    <td><span className="question-badge" style={{ fontSize: '12px' }}>{i + 1}</span></td>
                                                    <td style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {q.text}
                                                    </td>
                                                    <td>
                                                        {q.category_name && <span className="tag info">{q.category_name}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
