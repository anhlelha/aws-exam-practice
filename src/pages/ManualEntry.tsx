import API_BASE_URL from '../config/api';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createQuestion, getQuestionById, updateQuestion, deleteQuestion, uploadDiagram, getCategories, type Answer, type Category } from '../services/questionService';

export default function ManualEntry() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Edit mode
    const editId = searchParams.get('edit');
    const isEditMode = !!editId;
    const [loading, setLoading] = useState(isEditMode);

    // Question state
    const [questionText, setQuestionText] = useState('');
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [explanation, setExplanation] = useState('');

    // Answers state (default 4 answers)
    const [answers, setAnswers] = useState<Answer[]>([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
    ]);

    // Tags state
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Categories from API
    const [categories, setCategories] = useState<Category[]>([]);

    // UI state
    const [saving, setSaving] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [diagramPath, setDiagramPath] = useState<string | null>(null);
    const [diagramFile, setDiagramFile] = useState<File | null>(null);

    // Fetch categories on mount
    useEffect(() => {
        getCategories().then(setCategories).catch(console.error);
    }, []);

    // Fetch question data in edit mode
    useEffect(() => {
        if (editId) {
            setLoading(true);
            getQuestionById(parseInt(editId))
                .then(question => {
                    setQuestionText(question.text);
                    setExplanation(question.explanation || '');
                    setCategoryId(question.category_id);
                    setIsMultipleChoice(Boolean(question.is_multiple_choice));
                    setDiagramPath(question.diagram_path);

                    // Map answers
                    if (question.answers && question.answers.length > 0) {
                        setAnswers(question.answers.map((a: { text: string; is_correct: boolean }) => ({
                            text: a.text,
                            isCorrect: a.is_correct
                        })));
                    }

                    // Map tags
                    if (question.tags && question.tags.length > 0) {
                        setTags(question.tags.map((t: { name: string }) => t.name));
                    }
                })
                .catch(err => {
                    setError('Failed to load question: ' + err.message);
                })
                .finally(() => setLoading(false));
        }
    }, [editId]);

    // Add new answer option
    const addAnswer = () => {
        if (answers.length < 8) {
            setAnswers([...answers, { text: '', isCorrect: false }]);
        }
    };

    // Remove answer option
    const removeAnswer = (index: number) => {
        if (answers.length > 2) {
            setAnswers(answers.filter((_, i) => i !== index));
        }
    };

    // Update answer text
    const updateAnswerText = (index: number, text: string) => {
        const newAnswers = [...answers];
        newAnswers[index].text = text;
        setAnswers(newAnswers);
    };

    // Toggle correct answer
    const toggleCorrect = (index: number) => {
        const newAnswers = [...answers];
        if (!isMultipleChoice) {
            // Single choice - uncheck others
            newAnswers.forEach((a, i) => a.isCorrect = i === index);
        } else {
            newAnswers[index].isCorrect = !newAnswers[index].isCorrect;
        }
        setAnswers(newAnswers);
    };

    // Add tag
    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    // Remove tag
    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    // Validate form
    const validate = (): string | null => {
        if (!questionText.trim()) return 'Question text is required';
        if (answers.filter(a => a.text.trim()).length < 2) return 'At least 2 answers required';
        if (!answers.some(a => a.isCorrect)) return 'Mark at least one correct answer';
        return null;
    };

    // Save question (create or update)
    const handleSave = async (addAnother: boolean) => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError('');

        try {
            const questionData = {
                text: questionText,
                answers: answers.filter(a => a.text.trim()),
                explanation,
                isMultipleChoice,
                categoryId,
                tags
            };

            if (isEditMode && editId) {
                // Update existing question
                await updateQuestion(parseInt(editId), questionData);

                // Upload diagram if new file selected
                if (diagramFile) {
                    await uploadDiagram(parseInt(editId), diagramFile);
                }

                setSuccess('Question updated successfully!');
                setTimeout(() => navigate('/review'), 1000);
            } else {
                // Create new question
                const result = await createQuestion(questionData);

                // Upload diagram if file selected
                if (diagramFile && result.questionId) {
                    await uploadDiagram(result.questionId, diagramFile);
                }

                setSessionCount(prev => prev + 1);
                setSuccess('Question saved successfully!');

                if (addAnother) {
                    // Reset form
                    setQuestionText('');
                    setAnswers([
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ]);
                    setExplanation('');
                    setTags([]);
                    setDiagramPath(null);
                    setDiagramFile(null);
                    setTimeout(() => setSuccess(''), 3000);
                } else {
                    // Navigate back to review page
                    navigate('/review');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // Delete question
    const handleDelete = async () => {
        if (!editId) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this question?\n\nThis action cannot be undone!'
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            await deleteQuestion(parseInt(editId));
            setSuccess('Question deleted successfully!');
            setTimeout(() => navigate('/review'), 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setSaving(false);
        }
    };

    const letters = 'ABCDEFGH';

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">
                            {isEditMode ? 'Edit Question' : 'Add New Question'}
                        </h1>
                        <p className="page-subtitle">
                            Data Preparation &gt; {isEditMode ? 'Edit' : 'Manual Entry'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {!isEditMode && (
                            <span style={{ color: 'var(--text-secondary)' }}>
                                Question {sessionCount + 1} of this session
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="page-body">
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="manual-entry-layout">
                    {/* Main Form Column */}
                    <div className="manual-entry-main">
                        {/* Question Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Question</h3>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <textarea
                                        className="form-input form-textarea"
                                        placeholder="Enter your exam question here..."
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="manual-entry-row">
                                    <div className="form-group">
                                        <label className="form-label">Question Type</label>
                                        <select
                                            className="form-input form-select"
                                            value={isMultipleChoice ? 'multiple' : 'single'}
                                            onChange={(e) => {
                                                const newType = e.target.value === 'multiple';
                                                setIsMultipleChoice(newType);
                                                // Reset selections when type changes
                                                setAnswers(answers.map(a => ({ ...a, isCorrect: false })));
                                            }}
                                        >
                                            <option value="single">Single Choice</option>
                                            <option value="multiple">Multiple Choice</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            className="form-input form-select"
                                            value={categoryId || ''}
                                            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">-- Select Category --</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Answers Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Answers</h3>
                            </div>
                            <div className="card-body">
                                <div className="answers-list">
                                    {answers.map((answer, index) => (
                                        <div key={index} className="answer-row-new">
                                            <div className={`answer-badge ${answer.isCorrect ? 'correct' : ''}`}>
                                                {letters[index]}
                                            </div>
                                            <input
                                                type="text"
                                                className={`form-input ${answer.isCorrect ? 'correct' : ''}`}
                                                placeholder={`Answer ${letters[index]}...`}
                                                value={answer.text}
                                                onChange={e => updateAnswerText(index, e.target.value)}
                                            />
                                            <label className="correct-label">
                                                <input
                                                    type={isMultipleChoice ? 'checkbox' : 'radio'}
                                                    name="correctAnswer"
                                                    checked={answer.isCorrect}
                                                    onChange={() => toggleCorrect(index)}
                                                />
                                                Correct
                                            </label>
                                            {answers.length > 2 && (
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => removeAnswer(index)}
                                                    title="Remove"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {answers.length < 8 && (
                                    <button className="btn btn-secondary" onClick={addAnswer} style={{ marginTop: '16px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Add Answer
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Explanation Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Explanation</h3>
                            </div>
                            <div className="card-body">
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Explain why the correct answer is correct..."
                                    value={explanation}
                                    onChange={e => setExplanation(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="manual-entry-sidebar">
                        {/* Tags Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Tags</h3>
                            </div>
                            <div className="card-body">
                                <div className="tags-list">
                                    {tags.map(tag => (
                                        <span key={tag} className="tag primary">
                                            {tag}
                                            <button onClick={() => removeTag(tag)}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <div className="tag-input-row">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Add tag..."
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    />
                                    <button className="btn btn-secondary" onClick={addTag}>+ Add</button>
                                </div>
                            </div>
                        </div>

                        {/* Diagram Section */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Architecture Diagram</h3>
                            </div>
                            <div className="card-body">
                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    id="diagram-upload-input"
                                    accept=".png,.jpg,.jpeg,.svg,.drawio"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Create preview URL
                                            const url = URL.createObjectURL(file);
                                            setDiagramPath(url);
                                            // Store file for upload
                                            setDiagramFile(file);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />

                                <div className="diagram-placeholder">
                                    {diagramPath ? (
                                        <img
                                            src={diagramPath.startsWith('blob:') ? diagramPath : `${API_BASE_URL}/diagrams/${diagramPath}`}
                                            alt="Diagram"
                                            style={{ maxWidth: '100%', maxHeight: '200px' }}
                                        />
                                    ) : (
                                        <>
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <div>No diagram yet</div>
                                        </>
                                    )}
                                </div>
                                <div className="diagram-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => document.getElementById('diagram-upload-input')?.click()}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Upload
                                    </button>
                                    <button className="btn btn-primary" disabled>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                        Generate
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions Section */}
                        <div className="card">
                            <div className="card-body actions-card">
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {saving ? 'Saving...' : (isEditMode ? 'Update Question' : 'Save Question')}
                                </button>

                                {!isEditMode && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleSave(true)}
                                        disabled={saving}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Save & Add Another
                                    </button>
                                )}

                                {isEditMode && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDelete}
                                        disabled={saving}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Delete Question
                                    </button>
                                )}

                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate('/review')}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
