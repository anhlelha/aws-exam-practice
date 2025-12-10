import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Review from './pages/Review';
import ManualEntry from './pages/ManualEntry';
import TestBuilder from './pages/TestBuilder';
import Practice from './pages/Practice';
import Settings from './pages/Settings';
import RoleSelection from './pages/RoleSelection';
import { RoleProvider, useRole } from './contexts/RoleContext';
import './index.css';

function AppContent() {
  const { role } = useRole();
  const location = useLocation();

  // If no role set and not on role selection, redirect to role selection
  if (!role && location.pathname !== '/select-role') {
    return <Navigate to="/select-role" replace />;
  }

  // If user role tries to access admin pages, redirect to practice
  const adminOnlyPaths = ['/', '/dashboard', '/upload', '/review', '/manual-entry', '/test-builder', '/settings'];
  if (role === 'user' && adminOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/practice" replace />;
  }

  return (
    <div className="app-container">
      {role && <Sidebar />}
      <main className={role ? "main-content" : "main-content-full"}>
        <Routes>
          <Route path="/select-role" element={<RoleSelection />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/review" element={<Review />} />
          <Route path="/manual-entry" element={<ManualEntry />} />
          <Route path="/test-builder" element={<TestBuilder />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppContent />
      </RoleProvider>
    </BrowserRouter>
  );
}

function Sidebar() {
  const { isAdmin, clearRole } = useRole();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <a href={isAdmin ? "/dashboard" : "/practice"} className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </div>
          <div>
            <div className="logo-text">AWS Prep</div>
            <div className="logo-subtitle">Exam Practice</div>
          </div>
        </a>
        {/* Role Badge */}
        <div className={isAdmin ? "role-badge admin" : "role-badge user"}>
          {isAdmin ? 'Admin' : 'User'}
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Dashboard</span>
              </NavLink>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">Data Preparation</div>
              <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload & Process</span>
              </NavLink>
              <NavLink to="/review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Question Review</span>
              </NavLink>
              <NavLink to="/manual-entry" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>Add Question</span>
              </NavLink>
            </div>
          </>
        )}

        <div className="nav-section">
          <div className="nav-section-title">Practice</div>
          {isAdmin && (
            <NavLink to="/test-builder" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span>Test Builder</span>
            </NavLink>
          )}
          <NavLink to="/practice" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
            </svg>
            <span>Practice Session</span>
          </NavLink>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-section-title">Configuration</div>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </NavLink>
          </div>
        )}

        {/* Switch Role Button */}
        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <button
            className="nav-item switch-role-btn"
            onClick={clearRole}
            style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg className="nav-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>Switch Role</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}

export default App;
