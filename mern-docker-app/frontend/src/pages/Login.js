import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(form),
    });

    setIsSubmitting(false);

    if (!ok) {
      setMessage(data.message || 'Login failed');
      return;
    }

    onLogin(data.token, data.role);
    navigate(data.role === 'Learner' ? '/learner' : '/institution');
  };

  return (
    <div className="card form-card">
      <h3>Welcome back</h3>
      <p className="lead">Sign in to issue or verify credentials.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {message && <p className="form-feedback error">{message}</p>}
    </div>
  );
}
