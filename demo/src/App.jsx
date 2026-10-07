import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import CustomerChat from './pages/CustomerChat';
import ApproverQueue from './pages/ApproverQueue';
import AdminDashboard from './pages/AdminDashboard';
import OperationsView from './pages/OperationsView';
import { AppShell } from './ui';

// Authentication Context
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Protected Route Guard wrapper
function ProtectedRoute({ children, allowedRoles, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to respective default dashboard if role not allowed
    if (user.role === 'customer') return <Navigate to="/chat" replace />;
    if (user.role === 'approver') return <Navigate to="/approvals" replace />;
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell user={user} onLogout={logout} pageTitle={title}>
      {children}
    </AppShell>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tl_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('tl_token') || null;
    } catch {
      return null;
    }
  });

  const loginUser = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('tl_user', JSON.stringify(userData));
    localStorage.setItem('tl_token', userToken);
  };

  const logoutUser = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tl_user');
    localStorage.removeItem('tl_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login: loginUser, logout: logoutUser }}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                user.role === 'customer' ? (
                  <Navigate to="/chat" replace />
                ) : user.role === 'approver' ? (
                  <Navigate to="/approvals" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Login onLoginSuccess={loginUser} />
              )
            }
          />

          {/* Customer Chat */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']} title="Banking Support Assistant">
                <CustomerChat />
              </ProtectedRoute>
            }
          />

          {/* Approver Queue */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['approver', 'admin']} title="Approval Queue — Risk Review">
                <ApproverQueue />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']} title="Security Firewall & Grounding Analytics">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Operations View */}
          <Route
            path="/operations"
            element={
              <ProtectedRoute allowedRoles={['admin']} title="Live Operations View">
                <OperationsView />
              </ProtectedRoute>
            }
          />

          {/* Default Catch-all */}
          <Route
            path="*"
            element={
              user ? (
                user.role === 'customer' ? (
                  <Navigate to="/chat" replace />
                ) : user.role === 'approver' ? (
                  <Navigate to="/approvals" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
