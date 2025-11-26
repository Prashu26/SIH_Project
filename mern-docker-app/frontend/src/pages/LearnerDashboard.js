import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';

export default function LearnerDashboard({ token }) {
  const [profile, setProfile] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [uploadForm, setUploadForm] = useState({ courseId: '', moduleTitle: '', notes: '', file: null });
  const [uploadStatus, setUploadStatus] = useState({ submitting: false, message: '', tone: '' });

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setCertificates([]);
      setProofs([]);
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
        setProofs(profileRes.data.proofs || []);
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

  const courses = useMemo(() => profile?.courses || [], [profile]);
  const selectedCourse = useMemo(
    () => courses.find((course) => (course.id || course._id) === uploadForm.courseId),
    [courses, uploadForm.courseId]
  );
  const moduleListId = selectedCourse ? `modules-${selectedCourse.id || selectedCourse._id}` : 'module-options';
  const moduleSuggestions = Array.isArray(selectedCourse?.modules) ? selectedCourse.modules : [];

  const resetUploadStatus = () => setUploadStatus({ submitting: false, message: '', tone: '' });

  const updateUploadField = (field) => (event) => {
    const value = field === 'file' ? event.target.files[0] : event.target.value;
    setUploadForm((prev) => ({ ...prev, [field]: value }));
    resetUploadStatus();
  };

  const submitProof = async (event) => {
    event.preventDefault();
    const formElement = event.target;

    if (!uploadForm.courseId || !uploadForm.moduleTitle || !uploadForm.file) {
      setUploadStatus({ submitting: false, message: 'Course, module title, and proof file are required.', tone: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('courseId', uploadForm.courseId);
    formData.append('moduleTitle', uploadForm.moduleTitle.trim());
    if (uploadForm.notes) formData.append('notes', uploadForm.notes.trim());
    formData.append('proof', uploadForm.file);

    setUploadStatus({ submitting: true, message: '', tone: '' });

    const response = await apiFetch('/api/learner/proofs', {
      method: 'POST',
      body: formData,
      token,
    });

    if (!response.ok) {
      setUploadStatus({ submitting: false, message: response.data?.message || 'Failed to submit proof.', tone: 'error' });
      return;
    }

    setProofs((prev) => [response.data.proof, ...prev]);
    setUploadStatus({ submitting: false, message: 'Proof submitted for review.', tone: 'success' });
    setUploadForm({ courseId: '', moduleTitle: '', notes: '', file: null });
    formElement.reset();
  };

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
        <h4 className="section-title">Proof submissions</h4>
        {status.loading && proofs.length === 0 && <p className="empty-state">Loading proofs…</p>}
        {!status.loading && proofs.length === 0 && <p className="empty-state">No proofs submitted yet.</p>}
        {proofs.length > 0 && (
          <div className="cert-list">
            {proofs.map((proof) => (
              <article key={proof.id} className="cert">
                <strong>{proof.moduleTitle}</strong>
                <div className="badge">{proof.status}</div>
                <small>{proof.course?.title || 'Unassigned course'}</small>
                {proof.notes && <small>{proof.notes}</small>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h4 className="section-title">Upload proof</h4>
        {courses.length === 0 && <p className="empty-state">No courses assigned yet. Contact your institution to begin.</p>}
        {courses.length > 0 && (
          <form className="form" onSubmit={submitProof}>
            <label>
              Course
              <select value={uploadForm.courseId} onChange={updateUploadField('courseId')} required>
                <option value="">Select a course…</option>
                {courses.map((course) => (
                  <option key={course.id || course._id} value={course.id || course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Module title
              <input
                value={uploadForm.moduleTitle}
                onChange={updateUploadField('moduleTitle')}
                placeholder="Module 1: Foundations"
                list={moduleSuggestions.length > 0 ? moduleListId : undefined}
                required
              />
              {moduleSuggestions.length > 0 && (
                <datalist id={moduleListId}>
                  {moduleSuggestions.map((module) => (
                    <option key={module} value={module} />
                  ))}
                </datalist>
              )}
            </label>
            <label>
              Notes (optional)
              <textarea value={uploadForm.notes} onChange={updateUploadField('notes')} rows={3} placeholder="Provide optional context." />
            </label>
            <label>
              Proof file
              <input type="file" accept="image/*,.pdf" onChange={updateUploadField('file')} required />
            </label>
            <button type="submit" disabled={uploadStatus.submitting}>
              {uploadStatus.submitting ? 'Uploading…' : 'Submit for review'}
            </button>
          </form>
        )}
        {uploadStatus.message && (
          <p className={`form-feedback ${uploadStatus.tone === 'error' ? 'error' : 'success'}`}>{uploadStatus.message}</p>
        )}
      </section>
    </div>
  );
}
