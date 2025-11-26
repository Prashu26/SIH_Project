import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

export default function LearnerDashboard({ token }) {
  const [profile, setProfile] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setCertificates([]);
      return;
    }

    let ignore = false;
    setStatus({ loading: true, error: '' });

    const loadData = async () => {
      const [profileRes, certificateRes] = await Promise.all([
        apiFetch('/api/learner/profile', { token }),
        apiFetch('/api/learner/certificates', { token }),
      ]);

      if (ignore) return;

      if (!profileRes.ok) {
        setStatus({ loading: false, error: profileRes.data?.message || 'Could not load profile.' });
      } else {
        setProfile(profileRes.data.learner || null);
      }

      if (!certificateRes.ok) {
        setStatus((prev) => ({ ...prev, loading: false, error: certificateRes.data?.message || prev.error }));
      } else {
        setCertificates(certificateRes.data.certificates || []);
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="card form-card">
        <h3>Learner dashboard</h3>
        <p className="empty-state">Sign in to view your learner profile and issued credentials.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h3 className="section-title">Learner workspace</h3>
      {status.error && <p className="form-feedback error">{status.error}</p>}

      <div className="grid-two">
        <section className="card">
          <h4 className="section-title">Profile overview</h4>
          <pre className="code-block">{profile ? JSON.stringify(profile, null, 2) : status.loading ? 'Loading profile…' : 'Profile unavailable'}</pre>
        </section>

        <section className="card">
          <h4 className="section-title">Issued certificates</h4>
          {status.loading && certificates.length === 0 && <p className="empty-state">Loading certificates…</p>}
          {!status.loading && certificates.length === 0 && <p className="empty-state">No certificates issued yet.</p>}
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
