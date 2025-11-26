import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import LearnerDashboard from './pages/LearnerDashboard';
import InstitutionDashboard from './pages/InstitutionDashboard';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';

function RequireAuth({ token, role, allowedRoles, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ token, role, onLogout }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="brand">Skill Credentialing</h1>
        <NavBar token={token} role={role} onLogout={onLogout} />
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="footer">
        <small>© {currentYear} Skill Credentialing. All rights reserved.</small>
      </footer>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState(() => (localStorage.getItem('role') || '').toLowerCase());

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('role', role);
    } else {
      localStorage.removeItem('role');
    }
  }, [role]);

  const handleLogin = (newToken, newRole) => {
    setToken(newToken);
    setRole((newRole || '').toLowerCase());
  };

  const handleLogout = () => {
    setToken('');
    setRole('');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout token={token} role={role} onLogout={handleLogout} />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login onLogin={handleLogin} />} />
          <Route path="register" element={<Register />} />
          <Route path="verify" element={<Verify />} />
          <Route
            path="learner"
            element={
              <RequireAuth token={token} role={role} allowedRoles={['learner']}>
                <LearnerDashboard token={token} />
              </RequireAuth>
            }
          />
          <Route
            path="institution"
            element={
              <RequireAuth token={token} role={role} allowedRoles={['institute']}>
                <InstitutionDashboard token={token} />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth token={token} role={role} allowedRoles={['admin']}>
                <AdminDashboard token={token} />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
