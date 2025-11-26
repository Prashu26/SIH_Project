import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

const defaultForm = {
  learnerEmail: '',
  learnerId: '',
  courseName: '',
  skills: '',
};

export default function InstitutionDashboard({ token }) {
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setCertificates([]);
      setForm(() => ({ ...defaultForm }));
      setFeedback({ tone: '', text: '' });
      return;
    }

    let ignore = false;
    setIsLoading(true);

    apiFetch('/api/institution/certificates', { token }).then((response) => {
      if (ignore) return;
      if (!response.ok) {
        setFeedback({ tone: 'error', text: response.data?.message || 'Unable to load certificates.' });
      } else {
        setCertificates(response.data.certificates || []);
      }
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="card form-card">
        <h3>Institution dashboard</h3>
        <p className="empty-state">Sign in as an institution to issue credentials.</p>
      </div>
    );
  }

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ tone: '', text: '' });

    const payload = {
      learnerEmail: form.learnerEmail.trim(),
      courseName: form.courseName.trim(),
      skillsAcquired: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    };

    if (!payload.learnerEmail || !payload.courseName) {
      setFeedback({ tone: 'error', text: 'Learner email and course name are required.' });
      return;
    }

    if (form.learnerId.trim()) {
      payload.learnerId = form.learnerId.trim();
    }

    setIsSubmitting(true);

    const response = await apiFetch('/api/institution/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setFeedback({ tone: 'error', text: response.data?.message || 'Failed to create certificate.' });
      return;
    }

    setFeedback({ tone: 'success', text: 'Certificate created successfully.' });
    setCertificates((prev) => [response.data.certificate, ...prev]);
    setForm(() => ({ ...defaultForm }));
  };

  return (
    <div className="dashboard">
      <h3 className="section-title">Institution workspace</h3>
      {feedback.text && (
        <p className={`form-feedback ${feedback.tone === 'error' ? 'error' : 'success'}`}>{feedback.text}</p>
      )}

      <div className="grid-two">
        <section className="card">
          <h4 className="section-title">Issue a credential</h4>
          <form className="form" onSubmit={submit}>
            <label>
              Learner email
              <input
                type="email"
                value={form.learnerEmail}
                onChange={updateField('learnerEmail')}
                placeholder="learner@domain.com"
                required
              />
            </label>
            <label>
              Learner ID (optional)
              <input
                value={form.learnerId}
                onChange={updateField('learnerId')}
                placeholder="LRN-2025-045"
              />
            </label>
            <label>
              Course name
              <input
                value={form.courseName}
                onChange={updateField('courseName')}
                placeholder="Full Stack Web Bootcamp"
                required
              />
            </label>
            <label>
              Skills covered
              <input
                value={form.skills}
                onChange={updateField('skills')}
                placeholder="React, Node.js, MongoDB"
              />
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing…' : 'Issue credential'}
            </button>
          </form>
        </section>

        <section className="card">
          <h4 className="section-title">Issued certificates</h4>
          {isLoading && certificates.length === 0 && <p className="empty-state">Loading certificates…</p>}
          {!isLoading && certificates.length === 0 && <p className="empty-state">You have not issued any certificates yet.</p>}
          {certificates.length > 0 && (
            <div className="cert-list">
              {certificates.map((certificate) => (
                <article key={certificate._id} className="cert">
                  <strong>{certificate.courseName}</strong>
                  <div className="badge">{certificate.uniqueId}</div>
                  <small>Issued {new Date(certificate.issueDate).toLocaleDateString()}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
