import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login           from './pages/Login';
import Signup          from './pages/Signup';
import Dashboard       from './pages/Dashboard';
import CreatePost      from './pages/CreatePost';
import ScheduledPosts  from './pages/ScheduledPosts';
import EditPost        from './pages/EditPost';
import ConnectAccounts from './pages/ConnectAccounts';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes — wrapped in sidebar layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <DashboardLayout><CreatePost /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduled"
          element={
            <ProtectedRoute>
              <DashboardLayout><ScheduledPosts /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout><EditPost /></DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/connect-accounts"
          element={
            <ProtectedRoute>
              <DashboardLayout><ConnectAccounts /></DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
