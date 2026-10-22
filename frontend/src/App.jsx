import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DatasetPage from './pages/DatasetPage.jsx';
import ReportBuilderPage from './pages/ReportBuilderPage.jsx';
import SharedReportPage from './pages/SharedReportPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--color-bg)' }}>
      <div className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & About Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* Protected Application Pages */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/datasets/:id" element={<ProtectedRoute><DatasetPage /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />

          {/* Public Share View — Tokenized, Read-Only */}
          <Route path="/share/:token" element={<SharedReportPage />} />

          {/* 404 Fallback */}
          <Route path="*" element={
            <div className="empty-state" style={{ height: '100vh', background: 'var(--color-bg)' }}>
              <span className="icon">🔭</span>
              <h3>Page not found</h3>
              <p>The page you're looking for doesn't exist.</p>
              <a href="/" className="btn btn-primary mt-3">Go to Home</a>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
