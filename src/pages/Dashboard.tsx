import API_BASE_URL from '../config/api';
import { useEffect, useState } from 'react';

interface Stats {
    totalQuestions: number;
    avgScore: number;
    practiceTime: string;
    testsCompleted: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        totalQuestions: 0,
        avgScore: 0,
        practiceTime: '0h 0m',
        testsCompleted: 0
    });

    useEffect(() => {
        // Fetch stats from API
        fetch('http://localhost:3001/api/questions?limit=1')
            .then(res => res.json())
            .then(data => {
                setStats(prev => ({
                    ...prev,
                    totalQuestions: data.pagination?.total || 0
                }));
            })
            .catch(console.error);
    }, []);

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-header-content">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Welcome back! Track your AWS exam preparation progress.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <a href="/upload" className="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Import Data
                        </a>
                        <a href="/practice" className="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                            </svg>
                            Start Practice
                        </a>
                    </div>
                </div>
            </header>

            <div className="page-body">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon primary">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalQuestions}</div>
                            <div className="stat-label">Total Questions</div>
                            <div className="stat-change positive">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="18 15 12 9 6 15" />
                                </svg>
                                In database
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.avgScore}%</div>
                            <div className="stat-label">Average Score</div>
                            <div className="stat-change positive">Practice more!</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon info">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.practiceTime}</div>
                            <div className="stat-label">Total Practice Time</div>
                            <div className="stat-change positive">This month</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon warning">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.testsCompleted}</div>
                            <div className="stat-label">Tests Completed</div>
                            <div className="stat-change positive">Keep going!</div>
                        </div>
                    </div>
                </div>

                <div className="grid-2">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Quick Actions</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a href="/upload" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    Upload New PDF
                                </a>
                                <a href="/test-builder" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="4" y="4" width="16" height="16" rx="2" />
                                        <path d="M9 9h6v6H9z" />
                                    </svg>
                                    Create New Test
                                </a>
                                <a href="/settings" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Configure LLM Settings
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Getting Started</h3>
                        </div>
                        <div className="card-body">
                            <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                <li style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Configure LLM Settings</strong>
                                    <br />Add your OpenAI or Anthropic API key in Settings
                                </li>
                                <li style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Upload Exam PDF</strong>
                                    <br />Upload practice exam PDFs to extract questions
                                </li>
                                <li style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Review Questions</strong>
                                    <br />Verify extracted questions and generated diagrams
                                </li>
                                <li>
                                    <strong style={{ color: 'var(--text-primary)' }}>Start Practicing!</strong>
                                    <br />Build tests and practice with AI mentor assistance
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
