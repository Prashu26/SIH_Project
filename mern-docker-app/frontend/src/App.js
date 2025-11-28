import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/header';
import Hero from './components/Hero';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import LearnerDashboard from './pages/LearnerDashboard';
import IssuerDashboard from './pages/IssuerDashboard';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import Contact from './pages/Contact';
import Features from './pages/Features';
import Team from './pages/Team';

// Auth context for managing user state
const AuthContext = React.createContext();

function RequireAuth({ allowedRoles, children }) {
  const { user } = React.useContext(AuthContext);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Layout wrapper that conditionally shows header and hero
function Layout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isDashboard = ['/learner', '/institution', '/institute', '/admin'].some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-red-900 to-black">
      {/* Background elements */}
      <div className="fixed inset-0 opacity-10 pointer-events-none"></div>
      <div className="fixed top-[20%] right-[-5%] h-0 w-[40rem] shadow-[0_0_50px_#4cc9f0] -rotate-[30deg] opacity-30"></div>
      
      {/* Always show header */}
      <Header />
      
      {/* Show hero only on landing page */}
      {isLandingPage && <Hero />}
      
      {/* Main content grows to push footer down */}
      <main className={`${!isLandingPage ? 'pt-20' : ''} ${isDashboard ? 'min-h-screen' : ''} flex-1`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/team" element={<Team />} />
          <Route 
            path="/learner/*" 
            element={
              <RequireAuth allowedRoles={['learner']}>
                <LearnerDashboard />
              </RequireAuth>
            } 
          />
          <Route 
            path="/institution/*" 
            element={
              <RequireAuth allowedRoles={['institution', 'institute']}>
                <IssuerDashboard />
              </RequireAuth>
            } 
          />
          <Route 
            path="/institute/*" 
            element={
              <RequireAuth allowedRoles={['institution', 'institute']}>
                <IssuerDashboard />
              </RequireAuth>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <RequireAuth allowedRoles={['admin']}>
                <AdminDashboard />
              </RequireAuth>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      {/* Footer for non-dashboard pages */}
      {!isDashboard && (
        <footer className="mt-auto bg-gray-900/90 backdrop-blur-md border-t border-blue-500/20 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Skill Credentialing. Powered by blockchain technology.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Skill Credentialing...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}