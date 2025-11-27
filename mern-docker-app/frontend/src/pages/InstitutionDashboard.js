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
  const [artifactFile, setArtifactFile] = useState(null);
  const [fileKey, setFileKey] = useState(() => Date.now());
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [proofs, setProofs] = useState([]);

  useEffect(() => {
    if (!token) {
      setCertificates([]);
      setForm(() => ({ ...defaultForm }));
      setArtifactFile(null);
      setFileKey(Date.now());
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

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        formData.append(key, value.join(','));
      } else {
        formData.append(key, value);
      }
    });

    if (artifactFile) {
      formData.append('certificateFile', artifactFile);
    }

    const response = await apiFetch('/api/institution/upload', {
      method: 'POST',
      body: formData,
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
    setArtifactFile(null);
    setFileKey(Date.now());

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
            <label>
              Certificate PDF (optional)
              <input
                key={fileKey}
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files && event.target.files[0];
                  setArtifactFile(file || null);
                }}
              />
              <small className="input-help">Upload the signed credential PDF to anchor it on IPFS and blockchain.</small>
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing…' : 'Issue credential'}
            </button>
          </form>
        </section>

        <section className="card">
          <h4 className="section-title">Batch issue credentials (Merkle)</h4>
          <form className="form" onSubmit={async (e) => {
            e.preventDefault();
            if (!artifactFile) {
              setFeedback({ tone: 'error', text: 'Please select a CSV or JSON file.' });
              return;
            }
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('file', artifactFile);
            
            const response = await apiFetch('/api/institution/certificates/batch', {
              method: 'POST',
              body: formData,
              token,
            });

            setIsSubmitting(false);
            if (!response.ok) {
              setFeedback({ tone: 'error', text: response.data?.message || 'Batch issuance failed.' });
              return;
            }

            setFeedback({ 
              tone: 'success', 
              text: `Successfully issued ${response.data.results?.length || 0} certificates in batch #${response.data.batchId || 'N/A'}` 
            });
            
            // Refresh certificates
            const updatedCerts = await apiFetch('/api/institution/certificates', { token });
            if (updatedCerts.ok) {
              setCertificates(updatedCerts.data.certificates || []);
            }
            setArtifactFile(null);
            setFileKey(Date.now());
          }}>
            <label>
              CSV or JSON file
              <input
                key={fileKey + 1}
                type="file"
                accept=".csv,.json"
                onChange={(event) => {
                  const file = event.target.files && event.target.files[0];
                  setArtifactFile(file || null);
                }}
              />
              <small className="input-help">
                Upload CSV with columns: learnerEmail, studentUniqueCode, courseName, skills, validUntil (optional)
              </small>
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing batch…' : 'Issue batch'}
            </button>
          </form>
        </section>
      </div>

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
                  {certificate.ipfsCid && (
                    <small>IPFS: {certificate.ipfsCid.slice(0, 18)}…</small>
                  )}
                  {certificate.artifactHash && (
                    <small>Hash: {certificate.artifactHash.slice(0, 18)}…</small>
                  )}
                  {certificate.batchId && (
                    <small>Batch: #{certificate.batchId}</small>
                  )}
                  {certificate.merkleRoot && (
                    <small>Merkle Root: {certificate.merkleRoot.slice(0, 18)}…</small>
                  )}
                  {certificate.blockchainTxHash && (
                    <small>TX: {certificate.blockchainTxHash.slice(0, 18)}…</small>
                  )}
                  <div className="cta-row">
                    <button
                      type="button"
                      className="cta"
                      onClick={async () => {
                        try {
                          // Download proof JSON for this certificate
                          const tokenHeader = token ? { Authorization: `Bearer ${token}` } : {};
                          const res = await fetch(`/api/institution/certificates/${certificate.id || certificate._id}/proof`, {
                            method: 'GET',
                            headers: { ...tokenHeader },
                          });
                          if (!res.ok) {
                            const body = await res.json().catch(() => ({}));
                            setFeedback({ tone: 'error', text: body.message || 'Unable to download proof' });
                            return;
                          }
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `proof-${certificate.certificateId || certificate.certificateId || (certificate.id || certificate._id)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          setFeedback({ tone: 'error', text: err.message || 'Download failed' });
                        }
                      }}
                    >
                      Download proof
                    </button>
                    <a className="cta" href={`/verify?query=${certificate.certificateId}`}>
                      Verify
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

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
