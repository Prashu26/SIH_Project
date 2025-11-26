import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

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
};

export default function Register() {
  const [role, setRole] = useState('Learner');
  const [form, setForm] = useState(learnerDefaults);
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setForm(role === 'Learner' ? learnerDefaults : institutionDefaults);
    setFeedback({ tone: '', text: '' });
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ tone: '', text: '' });
    setIsSubmitting(true);

    const payload = role === 'Learner' ? { role, ...form } : { role, ...form };
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
    navigate('/login');
  };

  const onChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card form-card">
      <h3>Create an account</h3>
      <p className="lead">Pick your role and unlock tailored workflows.</p>
      <form className="form" onSubmit={submit}>
        <label>
          I am a
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="Learner">Learner</option>
            <option value="Institution">Institution</option>
          </select>
        </label>

        {role === 'Learner' ? (
          <>
            <label>
              First name
              <input value={form.firstName} onChange={onChange('firstName')} placeholder="Ava" required />
            </label>
            <label>
              Last name
              <input value={form.lastName} onChange={onChange('lastName')} placeholder="Patel" required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={onChange('email')} placeholder="learner@domain.com" required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={onChange('password')} placeholder="Create a strong password" required />
            </label>
            <label>
              Learner ID
              <input value={form.learnerId} onChange={onChange('learnerId')} placeholder="e.g. LRN-2025-001" required />
            </label>
          </>
        ) : (
          <>
            <label>
              Institution name
              <input value={form.name} onChange={onChange('name')} placeholder="Future Skills Academy" required />
            </label>
            <label>
              Institution email
              <input type="email" value={form.email} onChange={onChange('email')} placeholder="admin@academy.com" required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={onChange('password')} placeholder="Create a strong password" required />
            </label>
          </>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      {feedback.text && (
        <p className={`form-feedback ${feedback.tone === 'error' ? 'error' : 'success'}`}>{feedback.text}</p>
      )}
    </div>
  );
}
