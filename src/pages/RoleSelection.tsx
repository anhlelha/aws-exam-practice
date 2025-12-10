import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useEffect } from 'react';

export default function RoleSelection() {
    const navigate = useNavigate();
    const { role, setRole } = useRole();

    // If role already set, redirect
    useEffect(() => {
        if (role === 'admin') {
            navigate('/dashboard');
        } else if (role === 'user') {
            navigate('/practice');
        }
    }, [role, navigate]);

    const handleSelectRole = (selectedRole: 'admin' | 'user') => {
        setRole(selectedRole);
        if (selectedRole === 'admin') {
            navigate('/dashboard');
        } else {
            navigate('/practice');
        }
    };

    return (
        <div className="role-selection-container">
            <div className="role-selection-header">
                <div className="role-selection-logo">
                    <div className="role-selection-logo-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                    </div>
                    <div>
                        <div className="role-selection-title">AWS Prep</div>
                        <div className="role-selection-subtitle">Exam Practice Application</div>
                    </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginTop: '16px' }}>
                    Select your role to continue
                </p>
            </div>

            <div className="role-cards">
                {/* Admin Card */}
                <div className="role-card" onClick={() => handleSelectRole('admin')}>
                    <div className="role-card-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </div>
                    <div className="role-card-title">Admin</div>
                    <div className="role-card-description">
                        Manage questions, create tests,<br />
                        configure settings, and more
                    </div>
                </div>

                {/* User/Practice Card */}
                <div className="role-card" onClick={() => handleSelectRole('user')}>
                    <div className="role-card-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                        </svg>
                    </div>
                    <div className="role-card-title">Practice</div>
                    <div className="role-card-description">
                        Take practice tests and<br />
                        prepare for your AWS exam
                    </div>
                </div>
            </div>

            <p style={{ marginTop: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                You can switch roles anytime from the sidebar
            </p>
        </div>
    );
}
