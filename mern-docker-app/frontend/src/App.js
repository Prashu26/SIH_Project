import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/header';
import Hero from './components/Hero';
import Home from './pages/Home';
import Login from './pages/LoginNew';
import Register from './pages/Register';
import Verify from './pages/Verify';
import StudentDashboard from './pages/StudentDashboard';
import Documents from './pages/Documents';
import Dashboard from './pages/IssuerDashboard';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import Contact from './pages/Contact';
import Features from './pages/Features';
import Team from './pages/Team';
import OrganizationRegister from './pages/OrganizationRegister';
import OrganizationLogin from './pages/OrganizationLogin';
import OrganizationDashboard from './pages/OrganizationDashboard';

// Auth context for managing user state (moved to separate module)
import AuthContext, { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

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
  const isDashboard = ['/learner', '/institution', '/institute', '/admin', '/organization/dashboard'].some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-beige-900 via-beige-700 to-white">
      {/* Background elements */}
      <div className="fixed inset-0 opacity-10 pointer-events-none"></div>
      <div className="fixed top-[20%] right-[-5%] h-0 w-[40rem] shadow-[0_0_50px_#4cc9f0] -rotate-[30deg] opacity-30"></div>
      
      {/* Show header only for non-organization auth pages */}
      {!location.pathname.startsWith('/organization') && <Header />}
      
      {/* Show hero only on landing page */}
      {isLandingPage && <Hero />}
      
      {/* Main content grows to push footer down */}
      <main className={`${!isLandingPage && !location.pathname.startsWith('/organization') ? 'pt-20' : ''} ${isDashboard ? 'min-h-screen' : ''} flex-1`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/features" element={<Features />} />
          <Route path="/team" element={<Team />} />
          
          {/* Organization Routes */}
          <Route path="/organization/register" element={<OrganizationRegister />} />
          <Route path="/organization/login" element={<OrganizationLogin />} />
          <Route path="/organization/dashboard" element={<OrganizationDashboard />} />
          
          <Route 
            path="/learner/*" 
            element={
              <RequireAuth allowedRoles={['learner']}>
                <StudentDashboard />
              </RequireAuth>
            } 
          />
          <Route 
            path="/documents" 
            element={
              <RequireAuth allowedRoles={['learner']}>
                <Documents />
              </RequireAuth>
            }
          />
          <Route 
            path="/institution/*" 
            element={
              <RequireAuth allowedRoles={['institution', 'institute']}>
                <Dashboard />
              </RequireAuth>
            } 
          />
          <Route 
            path="/institute/*" 
            element={
              <RequireAuth allowedRoles={['institution', 'institute']}>
                <Dashboard />
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

const SCENE_URL = 'https://prod.spline.design/S82vCD0u7Y-1ZAF0/scene.splinecode';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [SplineComp, setSplineComp] = useState(null);
  const [splineFailed, setSplineFailed] = useState(false);

  // Keep a short loading state while AuthProvider initializes
  useEffect(() => setLoading(false), []);

  useEffect(() => {
    let mounted = true;
    // dynamic import avoids dev server chunk-loading issues
    import('@splinetool/react-spline')
      .then((mod) => {
        if (mounted && mod && mod.default) setSplineComp(() => mod.default);
      })
      .catch(() => {
        if (mounted) setSplineFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="relative min-h-screen">
            {/* Full-viewport spline background (interactive when possible) */}
            <div aria-hidden className="fixed inset-0 -z-10">
              {SplineComp && !splineFailed ? (
                <SplineComp
                  scene={SCENE_URL}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  onError={() => setSplineFailed(true)}
                />
              ) : (
                <iframe
                  title="spline-background"
                  src={SCENE_URL}
                  className="absolute inset-0 w-full h-full pointer-events-none border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              )}
            </div>

            {/* Your app content goes here */}
            <div className="relative z-10">
              <Layout />
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}