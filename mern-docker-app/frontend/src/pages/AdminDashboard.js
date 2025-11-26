import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

export default function AdminDashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: '' });

  useEffect(() => {
    if (!token) {
      setOverview(null);
      setCourses([]);
      setUsers([]);
      return;
    }

    let ignore = false;
    setStatus({ loading: true, error: '' });

    Promise.all([
      apiFetch('/api/admin/overview', { token }),
      apiFetch('/api/admin/courses', { token }),
      apiFetch('/api/admin/users?role=learner', { token }),
    ]).then(([overviewRes, coursesRes, usersRes]) => {
      if (ignore) return;

      if (!overviewRes.ok) {
        setStatus({ loading: false, error: overviewRes.data?.message || 'Unable to load admin overview.' });
      } else {
        setOverview(overviewRes.data);
        setStatus((prev) => ({ ...prev, loading: false }));
      }

      if (coursesRes.ok) {
        setCourses(coursesRes.data.courses || []);
      }

      if (usersRes.ok) {
        setUsers(usersRes.data.users || []);
      }
    }).catch((error) => {
      if (ignore) return;
      setStatus({ loading: false, error: error.message || 'Unexpected admin fetch error.' });
    });

    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="card form-card">
        <h3>Admin console</h3>
        <p className="empty-state">Sign in as an administrator to view system metrics.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h3 className="section-title">Platform control center</h3>
      {status.error && <p className="form-feedback error">{status.error}</p>}

      <div className="card">
        <h4 className="section-title">Key metrics</h4>
        {status.loading && !overview && <p className="empty-state">Loading metrics…</p>}
        {overview && (
          <ul className="stat-grid">
            <li>
              <span className="stat-value">{overview.stats?.users ?? '—'}</span>
              <span className="stat-label">Users</span>
            </li>
            <li>
              <span className="stat-value">{overview.stats?.courses ?? '—'}</span>
              <span className="stat-label">Courses</span>
            </li>
            <li>
              <span className="stat-value">{overview.stats?.proofs ?? '—'}</span>
              <span className="stat-label">Proofs</span>
            </li>
            <li>
              <span className="stat-value">{overview.stats?.certificates ?? '—'}</span>
              <span className="stat-label">Certificates</span>
            </li>
          </ul>
        )}
      </div>

      <div className="grid-two">
        <section className="card">
          <h4 className="section-title">Recent proofs</h4>
          {!overview && status.loading && <p className="empty-state">Loading proofs…</p>}
          {overview && overview.recentProofs?.length === 0 && <p className="empty-state">No recent proofs.</p>}
          {overview && overview.recentProofs?.length > 0 && (
            <div className="cert-list">
              {overview.recentProofs.map((proof) => (
                <article key={proof.id} className="cert">
                  <strong>{proof.moduleTitle}</strong>
                  <div className="badge">{proof.status}</div>
                  <small>{proof.learner?.name || 'Learner'} · {proof.course?.title || 'Course'}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h4 className="section-title">Active courses</h4>
          {courses.length === 0 && <p className="empty-state">No courses configured yet.</p>}
          {courses.length > 0 && (
            <div className="cert-list">
              {courses.map((course) => (
                <article key={course._id} className="cert">
                  <strong>{course.title}</strong>
                  <div className="badge">{course.modules?.length || 0} modules</div>
                  <small>{course.platform || 'Custom platform'}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h4 className="section-title">Learner directory</h4>
        {users.length === 0 && <p className="empty-state">No learners found.</p>}
        {users.length > 0 && (
          <div className="cert-list">
            {users.map((user) => (
              <article key={user._id} className="cert">
                <strong>{user.name}</strong>
                <div className="badge">{user.learnerProfile?.learnerId || 'Unassigned ID'}</div>
                <small>{user.email}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
