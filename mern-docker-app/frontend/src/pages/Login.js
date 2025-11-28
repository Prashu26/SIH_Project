import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import 'boxicons/css/boxicons.min.css';

// Create a simple auth context for this component
const AuthContext = React.createContext();

// Hook to use auth context
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback to localStorage-based auth
    return {
      login: (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = '/';
      }
    };
  }
  return context;
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const { ok, data } = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setIsSubmitting(false);

      if (!ok) {
        setMessage(data.message || 'Login failed');
        return;
      }

      const role = (data.role || '').toLowerCase();
      
      // Use the login function from context or fallback
      login(data, data.token);

      const destination = role === 'learner' ? '/learner' : (role === 'institution' || role === 'institute') ? '/institution' : role === 'admin' ? '/admin' : '/';
      navigate(destination);
    } catch (error) {
      setIsSubmitting(false);
      setMessage('Network error. Please try again.');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i className="bx bx-log-in text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-300">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Email Address</label>
              <div className="relative">
                <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">Password</label>
              <div className="relative">
                <i className="bx bx-lock-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {message && (
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <i className="bx bx-error-circle text-red-400"></i>
                  <span className="text-red-300">{message}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt animate-spin"></i>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bx bx-log-in"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Sign up here
              </Link>
            </p>
            <p className="text-gray-500 text-sm mt-2">
              <Link to="/verify" className="hover:text-gray-400 transition-colors">
                Or verify a certificate
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-gray-900/50 backdrop-blur-md border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <i className="bx bx-info-circle text-blue-400"></i>
            Demo Credentials
          </h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p><span className="text-gray-400">Learner:</span> learner@example.com / password123</p>
            <p><span className="text-gray-400">Institution:</span> institute@example.com / password123</p>
            <p><span className="text-gray-400">Admin:</span> admin@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
