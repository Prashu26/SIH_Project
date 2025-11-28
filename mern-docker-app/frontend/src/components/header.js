import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';

// Simple auth hook for header
function useAuth() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  return {
    user: token && userData ? JSON.parse(userData) : null,
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };
}

const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const toggleMobileMenu = () => {
    setOpen(!open);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', label: 'Home', icon: 'bx-home' },
    { path: '/verify', label: 'Verify', icon: 'bx-shield-check' },
    { path: '/features', label: 'Features', icon: 'bx-star' },
    { path: '/about', label: 'About', icon: 'bx-info-circle' },
    { path: '/contact', label: 'Contact', icon: 'bx-phone' },
    { path: '/team', label: 'Team', icon: 'bx-group' }
  ];

  const dashboardItems = user ? [
    ...(user.role === 'learner' ? [{ path: '/learner', label: 'My Certificates', icon: 'bx-certificate' }] : []),
    ...((user.role === 'institution' || user.role === 'institute') ? [
      { path: '/institution', label: 'Dashboard', icon: 'bx-building' },
      { path: '/institution', label: 'Issue Certificate', icon: 'bx-add-to-queue' }
    ] : []),
    ...(user.role === 'admin' ? [{ path: '/admin', label: 'Admin Panel', icon: 'bx-cog' }] : [])
  ] : [];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-blue-500/20">
      <div className="container mx-auto flex justify-between items-center py-4 px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center group">
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-2 rounded-lg mr-3 group-hover:scale-105 transition-transform">
            <i className="bx bx-certificate text-white text-xl"></i>
          </div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Skill Credentialing
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <i className={`bx ${item.icon}`}></i>
              {item.label}
            </Link>
          ))}
          
          {/* Dashboard Links */}
          {dashboardItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <i className={`bx ${item.icon}`}></i>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <i className="bx bx-log-out"></i>
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-all"
              >
                <i className="bx bx-log-in"></i>
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/25"
              >
                <i className="bx bx-user-plus"></i>
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden text-white p-2 rounded-lg hover:bg-gray-800/50 transition-colors z-50 relative"
        >
          <i className={`bx ${open ? 'bx-x' : 'bx-menu'} text-2xl`}></i>
        </button>

        {/* Mobile Menu */}
        {open && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md md:hidden z-40">
            <div className="flex flex-col h-full pt-20 p-6">
              <nav className="flex flex-col gap-4 flex-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-xl text-lg transition-all duration-300 ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <i className={`bx ${item.icon} text-xl`}></i>
                    {item.label}
                  </Link>
                ))}
                
                {dashboardItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-xl text-lg transition-all duration-300 ${
                      isActive(item.path)
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <i className={`bx ${item.icon} text-xl`}></i>
                    {item.label}
                  </Link>
                ))}
                
                <div className="border-t border-gray-700 pt-4 mt-4">
                  {user ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-gray-400 capitalize">{user.role}</p>
                      </div>
                      <button
                        onClick={() => { logout(); setOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl transition-colors"
                      >
                        <i className="bx bx-log-out"></i>
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="w-full flex items-center justify-center gap-2 border border-gray-600 text-white py-3 px-6 rounded-xl hover:bg-gray-800/50 transition-all"
                      >
                        <i className="bx bx-log-in"></i>
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setOpen(false)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl transition-all shadow-lg"
                      >
                        <i className="bx bx-user-plus"></i>
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
