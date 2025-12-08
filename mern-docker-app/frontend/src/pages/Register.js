import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import 'boxicons/css/boxicons.min.css';

const learnerDefaults = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  learnerId: '',
};

const institutionDefaults = {
  name: '',
  email: '',
  password: '',
  registrationId: '',
};

export default function Register() {
  const [role, setRole] = useState('learner');
  const [form, setForm] = useState(learnerDefaults);
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setForm(role === 'learner' ? learnerDefaults : institutionDefaults);
    setFeedback({ tone: '', text: '' });
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ tone: '', text: '' });
    setIsSubmitting(true);

    try {
      const payload = { role };

      if (role === 'learner') {
        const name = `${form.firstName} ${form.lastName}`.trim();
        if (!name) {
          setFeedback({ tone: 'error', text: 'First and last name are required.' });
          setIsSubmitting(false);
          return;
        }
        payload.name = name;
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        payload.learnerId = form.learnerId;
      } else if (role === 'institute') {
        payload.name = form.name;
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        if (form.registrationId) {
          payload.registrationId = form.registrationId;
        }
      }

      const { ok, data } = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsSubmitting(false);

      if (!ok) {
        setFeedback({ tone: 'error', text: data.message || 'Registration failed' });
        return;
      }

      setFeedback({ tone: 'success', text: 'Registration successful. Redirecting to login…' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setIsSubmitting(false);
      setFeedback({ tone: 'error', text: 'Network error. Please try again.' });
      console.error('Registration error:', error);
    }
  };

  const onChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-[#121212]">
      <div className="w-full max-w-md">
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-[#1DB954] p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.3)]">
              <i className="bx bx-user-plus text-black text-3xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-[#b3b3b3]">Join the blockchain credentialing revolution</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-[#b3b3b3] mb-3 font-medium text-sm uppercase tracking-wider">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('learner')}
                  className={`p-4 rounded-full border-2 transition-all duration-300 ${
                    role === 'learner'
                      ? 'border-[#1DB954] bg-[#1DB954]/10 text-white'
                      : 'border-[#282828] bg-[#282828] text-[#b3b3b3] hover:border-[#1DB954] hover:text-white'
                  }`}
                >
                  <i className="bx bx-user block text-2xl mb-2"></i>
                  <span className="font-bold">Learner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('institute')}
                  className={`p-4 rounded-full border-2 transition-all duration-300 ${
                    role === 'institute'
                      ? 'border-[#1DB954] bg-[#1DB954]/10 text-white'
                      : 'border-[#282828] bg-[#282828] text-[#b3b3b3] hover:border-[#1DB954] hover:text-white'
                  }`}
                >
                  <i className="bx bx-buildings block text-2xl mb-2"></i>
                  <span className="font-bold">Institution</span>
                </button>
              </div>
            </div>

            {/* Dynamic Form Fields */}
            {role === 'learner' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-2 font-bold text-sm">First Name</label>
                    <input
                      value={form.firstName}
                      onChange={onChange('firstName')}
                      className="w-full bg-[#282828] border border-transparent rounded-full px-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2 font-bold text-sm">Last Name</label>
                    <input
                      value={form.lastName}
                      onChange={onChange('lastName')}
                      className="w-full bg-[#282828] border border-transparent rounded-full px-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Email Address</label>
                  <div className="relative">
                    <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      type="email"
                      value={form.email}
                      onChange={onChange('email')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Password</label>
                  <div className="relative">
                    <i className="bx bx-lock-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      type="password"
                      value={form.password}
                      onChange={onChange('password')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="Create a strong password"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Learner ID</label>
                  <div className="relative">
                    <i className="bx bx-id-card absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      value={form.learnerId}
                      onChange={onChange('learnerId')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="e.g. LRN-2025-001"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Institution Name</label>
                  <div className="relative">
                    <i className="bx bx-buildings absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      value={form.name}
                      onChange={onChange('name')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="Future Skills Academy"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Institution Email</label>
                  <div className="relative">
                    <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      type="email"
                      value={form.email}
                      onChange={onChange('email')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="admin@academy.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Password</label>
                  <div className="relative">
                    <i className="bx bx-lock-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      type="password"
                      value={form.password}
                      onChange={onChange('password')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="Create a strong password"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-bold text-sm">Registration ID <span className="text-[#b3b3b3] font-normal">(Optional)</span></label>
                  <div className="relative">
                    <i className="bx bx-id-card absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3]"></i>
                    <input
                      value={form.registrationId}
                      onChange={onChange('registrationId')}
                      className="w-full bg-[#282828] border border-transparent rounded-full pl-10 pr-4 py-3 text-white placeholder-[#b3b3b3] focus:border-[#1DB954] focus:bg-[#333] focus:outline-none transition-colors"
                      placeholder="INST-2025-001"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Feedback Message */}
            {feedback.text && (
              <div className={`rounded-lg p-4 ${
                feedback.tone === 'error'
                  ? 'bg-red-600/20 border border-red-500/30'
                  : 'bg-green-600/20 border border-green-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  <i className={`bx ${feedback.tone === 'error' ? 'bx-error-circle text-red-400' : 'bx-check-circle text-green-400'}`}></i>
                  <span className={feedback.tone === 'error' ? 'text-red-300' : 'text-green-300'}>{feedback.text}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 disabled:bg-[#282828] disabled:text-[#b3b3b3] text-black py-3 rounded-full font-bold uppercase tracking-widest transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt animate-spin"></i>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="bx bx-user-plus"></i>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-[#282828]">
            <p className="text-[#b3b3b3]">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:text-[#1DB954] transition-colors font-bold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
