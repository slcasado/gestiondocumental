import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WorkspaceView from './components/WorkspaceView';
import UserManagement from './components/admin/UserManagement';
import TeamManagement from './components/admin/TeamManagement';
import MetadataManagement from './components/admin/MetadataManagement';
import WorkspaceManagement from './components/admin/WorkspaceManagement';
import PublicDocumentViewer from './pages/PublicDocumentViewer';
import MainLayout from './components/MainLayout';
import '@/App.css';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/public/:publicUrl"
        element={<PublicDocumentViewer />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <WorkspaceView />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute adminOnly>
            <MainLayout>
              <TeamManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/metadata"
        element={
          <ProtectedRoute adminOnly>
            <MainLayout>
              <MetadataManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspaces"
        element={
          <ProtectedRoute adminOnly>
            <MainLayout>
              <WorkspaceManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
