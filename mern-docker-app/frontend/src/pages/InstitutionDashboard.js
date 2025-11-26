import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

const defaultForm = {
  learnerEmail: '',
  learnerId: '',
  learnerName: '',
  courseName: '',
  courseId: '',
  skills: '',
  validUntil: '',
};

export default function InstitutionDashboard({ token }) {
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [proofs, setProofs] = useState([]);

  useEffect(() => {
    if (!token) {
      setCertificates([]);
      setForm(() => ({ ...defaultForm }));
      setFeedback({ tone: '', text: '' });
      setCourses([]);
      setProofs([]);
      return;
    }

    let ignore = false;
    setIsLoading(true);

    Promise.all([
      apiFetch('/api/institution/certificates', { token }),
      apiFetch('/api/courses'),
      apiFetch('/api/institution/proofs?status=Pending', { token }),
    ]).then(([certificateRes, coursesRes, proofsRes]) => {
      if (ignore) return;
      if (!certificateRes.ok) {
        setFeedback({ tone: 'error', text: certificateRes.data?.message || 'Unable to load certificates.' });
      } else {
        setCertificates(certificateRes.data.certificates || []);
      }

      if (coursesRes.ok) {
        setCourses(coursesRes.data.courses || []);
      }

      if (proofsRes.ok) {
        setProofs(proofsRes.data.proofs || []);
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

  const updateProofStatus = async (proofId, nextStatus) => {
    const response = await apiFetch(`/api/institution/proofs/${proofId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
      token,
    });

    if (!response.ok) {
      setFeedback({ tone: 'error', text: response.data?.message || 'Unable to update proof status.' });
      return;
    }

    setProofs((prev) => {
      if (response.data.proof.status !== 'Pending') {
        return prev.filter((proof) => proof.id !== proofId);
      }
      return prev.map((proof) => (proof.id === proofId ? response.data.proof : proof));
    });
    setFeedback({ tone: 'success', text: `Proof marked as ${nextStatus}.` });
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ tone: '', text: '' });

    const payload = {
      learnerEmail: form.learnerEmail.trim().toLowerCase(),
      courseName: form.courseName.trim(),
      courseId: form.courseId || undefined,
      name: form.learnerName.trim() || undefined,
      skillsAcquired: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      validUntil: form.validUntil || undefined,
    };

    if (!payload.learnerEmail || (!payload.courseName && !payload.courseId)) {
      setFeedback({ tone: 'error', text: 'Learner email and a course (name or selection) are required.' });
      return;
    }

    if (!payload.courseName) {
      delete payload.courseName;
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

    const updatedCourses = await apiFetch('/api/courses');
    if (updatedCourses.ok) {
      setCourses(updatedCourses.data.courses || []);
    }
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
              Learner name (optional)
              <input
                value={form.learnerName}
                onChange={updateField('learnerName')}
                placeholder="Jordan Lee"
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
              Course
              <select value={form.courseId} onChange={updateField('courseId')}>
                <option value="">Select a mapped course…</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Course name (fallback)
              <input
                value={form.courseName}
                onChange={updateField('courseName')}
                placeholder="Full Stack Web Bootcamp"
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
            <label>
              Valid until (optional)
              <input type="date" value={form.validUntil} onChange={updateField('validUntil')} />
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
                <article key={certificate.id || certificate._id} className="cert">
                  <strong>{certificate.courseName}</strong>
                  <div className="badge">{certificate.uniqueId}</div>
                  <small>Issued {new Date(certificate.issueDate).toLocaleDateString()}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h4 className="section-title">Pending proofs</h4>
        {isLoading && proofs.length === 0 && <p className="empty-state">Loading proofs…</p>}
        {!isLoading && proofs.length === 0 && <p className="empty-state">No pending proofs for review.</p>}
        {proofs.length > 0 && (
          <div className="cert-list">
            {proofs.map((proof) => (
              <article key={proof.id} className="cert">
                <strong>{proof.learner?.name || proof.learner?.learnerId || 'Learner'}</strong>
                <div className="badge">{proof.moduleTitle}</div>
                <small>Status: {proof.status}</small>
                <small>{proof.course?.title || 'Course not mapped'}</small>
                <div className="cta-row">
                  <button
                    type="button"
                    className="cta primary"
                    disabled={proof.status === 'Approved'}
                    onClick={() => updateProofStatus(proof.id, 'Approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="cta"
                    disabled={proof.status === 'Rejected'}
                    onClick={() => updateProofStatus(proof.id, 'Rejected')}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
