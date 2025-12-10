import { useState, useRef } from 'react';

interface ProcessingStatus {
    step: string;
    progress: number;
    message: string;
}

export default function Upload() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [status, setStatus] = useState<ProcessingStatus | null>(null);
    const [result, setResult] = useState<{ questionsExtracted: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleProcess = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStatus({ step: 'uploading', progress: 10, message: 'Uploading PDF...' });

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            // Simulate progress updates
            const progressSteps = [
                { step: 'parsing', progress: 30, message: 'Parsing PDF...' },
                { step: 'extracting', progress: 50, message: 'Extracting questions with LLM...' },
                { step: 'tagging', progress: 70, message: 'Generating tags & categories...' },
                { step: 'diagrams', progress: 90, message: 'Creating architecture diagrams...' },
            ];

            for (const step of progressSteps) {
                await new Promise(r => setTimeout(r, 1000));
                setStatus(step);
            }

            const response = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setStatus({ step: 'complete', progress: 100, message: 'Processing complete!' });
                setResult({ questionsExtracted: data.questionsExtracted });
                setIsComplete(true);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatus({ step: 'error', progress: 0, message: `Error: ${error}` });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isComplete && result) {
        return (
            <div className="fade-in">
                <header className="page-header">
                    <div className="page-header-content">
                        <div>
                            <h1 className="page-title">Processing Complete!</h1>
                            <p className="page-subtitle">Your PDF has been processed successfully.</p>
                        </div>
                    </div>
                </header>

                <div className="page-body">
                    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                        <div className="card-body" style={{ padding: '48px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>{result.questionsExtracted} Questions Extracted</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Questions have been tagged, categorized, and diagrams generated.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <a href="/review" className="btn btn-primary btn-lg">
                                    Review Questions
                                </a>
                                <button className="btn btn-secondary btn-lg" onClick={() => {
                                    setFile(null);
                                    setIsComplete(false);
                                    setResult(null);
                                    setStatus(null);
                                }}>
                                    Upload Another
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Upload & Process</h1>
                        <p className="page-subtitle">Upload exam PDFs to extract and process questions with AI.</p>
                    </div>
                </div>
            </header>

            <div className="page-body">
                <div className="grid-2">
                    {/* Upload Zone */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Upload PDF</h3>
                        </div>
                        <div className="card-body">
                            <div
                                className="upload-zone"
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="upload-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div className="upload-text">
                                    {file ? file.name : 'Drop PDF file here or click to browse'}
                                </div>
                                <div className="upload-hint">Supports PDF files up to 50MB</div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {file && (
                                <button
                                    className="btn btn-primary btn-lg"
                                    style={{ width: '100%', marginTop: '16px' }}
                                    onClick={handleProcess}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 2 11 13" />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                            Start Processing
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Processing Status */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Processing Status</h3>
                        </div>
                        <div className="card-body">
                            {status ? (
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span>{status.message}</span>
                                            <span>{status.progress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${status.progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {['PDF Parsing', 'Question Extraction', 'Tagging & Classification', 'Diagram Generation', 'Save to Database'].map((step, i) => (
                                            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: status.progress >= (i + 1) * 20 ? 'var(--color-success)' : 'var(--bg-tertiary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {status.progress >= (i + 1) * 20 && (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span style={{ color: status.progress >= (i + 1) * 20 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                    {step}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <p>Upload a PDF to start processing</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
