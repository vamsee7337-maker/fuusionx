import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingSpinner } from './components/common';
import DashboardLayout from './components/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import OfficerManagement from './pages/admin/OfficerManagement';
import AdminCases from './pages/admin/AdminCases';
import AuditLog from './pages/admin/AuditLog';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import CaseList from './pages/officer/CaseList';
import CaseDetail from './pages/officer/CaseDetail';
import EvidenceDetail from './pages/officer/EvidenceDetail';

// Route Guards
function PrivateRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen bg-dark-950"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/officer'} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute allowedRole="ADMIN"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/officers" element={<PrivateRoute allowedRole="ADMIN"><OfficerManagement /></PrivateRoute>} />
          <Route path="/admin/cases" element={<PrivateRoute allowedRole="ADMIN"><AdminCases /></PrivateRoute>} />
          <Route path="/admin/audit" element={<PrivateRoute allowedRole="ADMIN"><AuditLog /></PrivateRoute>} />

          {/* Officer Routes */}
          <Route path="/officer" element={<PrivateRoute allowedRole="LEGAL_OFFICER"><OfficerDashboard /></PrivateRoute>} />
          <Route path="/officer/cases" element={<PrivateRoute allowedRole="LEGAL_OFFICER"><CaseList /></PrivateRoute>} />
          <Route path="/officer/cases/:id" element={<PrivateRoute allowedRole="LEGAL_OFFICER"><CaseDetail /></PrivateRoute>} />
          <Route path="/officer/evidence/:id" element={<PrivateRoute allowedRole="LEGAL_OFFICER"><EvidenceDetail /></PrivateRoute>} />

          {/* Fallback Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
