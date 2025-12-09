import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { useLanguage } from '../contexts/LanguageContext';

export default function LearnerDashboard({ token }) {
  const { t } = useLanguage();
  // Use token from props or fallback to localStorage (handles direct page loads)
  const effectiveToken = token || localStorage.getItem("token");
  const [profile, setProfile] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [uploadForm, setUploadForm] = useState({
    courseId: "",
    moduleTitle: "",
    notes: "",
    file: null,
  });
  const [uploadStatus, setUploadStatus] = useState({
    submitting: false,
    message: "",
    tone: "",
  });

  useEffect(() => {
    if (!effectiveToken) {
      setProfile(null);
      setCertificates([]);
      setProofs([]);
      return;
    }

    let ignore = false;
    setStatus({ loading: true, error: "" });

    const loadData = async () => {
      const [profileRes, certificateRes] = await Promise.all([
        apiFetch("/api/learner/profile", { token: effectiveToken }),
        apiFetch("/api/learner/certificates", { token: effectiveToken }),
      ]);

      if (ignore) return;

      if (!profileRes.ok) {
        setStatus({
          loading: false,
          error: profileRes.data?.message || "Could not load profile.",
        });
      } else {
        setProfile(profileRes.data.learner || null);
        setProofs(profileRes.data.proofs || []);
      }

      if (!certificateRes.ok) {
        setStatus((prev) => ({
          ...prev,
          loading: false,
          error: certificateRes.data?.message || prev.error,
        }));
      } else {
        setCertificates(certificateRes.data.certificates || []);
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [effectiveToken]);

  const courses = useMemo(() => profile?.courses || [], [profile]);
  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => (course.id || course._id) === uploadForm.courseId
      ),
    [courses, uploadForm.courseId]
  );
  const moduleListId = selectedCourse
    ? `modules-${selectedCourse.id || selectedCourse._id}`
    : "module-options";
  const moduleSuggestions = Array.isArray(selectedCourse?.modules)
    ? selectedCourse.modules
    : [];

  const resetUploadStatus = () =>
    setUploadStatus({ submitting: false, message: "", tone: "" });

  const updateUploadField = (field) => (event) => {
    const value = field === "file" ? event.target.files[0] : event.target.value;
    setUploadForm((prev) => ({ ...prev, [field]: value }));
    resetUploadStatus();
  };

  const submitProof = async (event) => {
    event.preventDefault();
    const formElement = event.target;

    if (!uploadForm.courseId || !uploadForm.moduleTitle || !uploadForm.file) {
      setUploadStatus({
        submitting: false,
        message: t('proofRequired'),
        tone: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("courseId", uploadForm.courseId);
    formData.append("moduleTitle", uploadForm.moduleTitle.trim());
    if (uploadForm.notes) formData.append("notes", uploadForm.notes.trim());
    formData.append("proof", uploadForm.file);

    setUploadStatus({ submitting: true, message: "", tone: "" });

    const response = await apiFetch("/api/learner/proofs", {
      method: "POST",
      body: formData,
      token,
    });

    if (!response.ok) {
      setUploadStatus({
        submitting: false,
        message: response.data?.message || t('proofFailed'),
        tone: "error",
      });
      return;
    }

    setProofs((prev) => [response.data.proof, ...prev]);
    setUploadStatus({
      submitting: false,
      message: t('proofSubmitted'),
      tone: "success",
    });
    setUploadForm({ courseId: "", moduleTitle: "", notes: "", file: null });
    formElement.reset();
  };

  if (!effectiveToken) {
    return (
      <div className="card form-card">
        <h3>{t('learnerDashboard')}</h3>
        <p className="empty-state">
          {t('signInToViewProfile')}
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h3 className="section-title">{t('issuedCertificates')}</h3>
      {status.error && <p className="form-feedback error">{status.error}</p>}

      {status.loading && certificates.length === 0 && (
        <p className="empty-state">{t('loadingCertificates')}</p>
      )}
      {!status.loading && certificates.length === 0 && (
        <p className="empty-state">{t('noCertificatesIssued')}</p>
      )}

      {certificates.length > 0 && (
        <div className="cert-list simple">
          {certificates.map((certificate) => {
            const certId = certificate.certificateId || certificate._id;
            const courseTitle =
              certificate.course?.title ||
              certificate.courseName ||
              t('certificate');
            const studentCode =
              certificate.studentUniqueCode || certificate.uniqueId || certId;
            const issueDate =
              certificate.issueDate || certificate.createdAt || null;
            const pdfFilename =
              certificate.storage?.artifacts?.pdf?.filename || `${certId}.pdf`;

            const downloadCertificate = async () => {
              try {
                const headers = effectiveToken
                  ? { Authorization: `Bearer ${effectiveToken}` }
                  : {};
                const url = `/api/certificates/${certId}/download`;
                const res = await fetch(url, { headers });
                if (!res.ok) {
                  throw new Error(`Download failed: ${res.status}`);
                }
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = pdfFilename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
              } catch (err) {
                console.error("Certificate download error:", err);
                setStatus((prev) => ({
                  ...prev,
                  error: t('downloadFailed'),
                }));
              }
            };

            return (
              <article key={certId} className="cert simple">
                <div>
                  <div className="cert-title">{courseTitle}</div>
                  <div className="cert-meta">
                    {t('certificateId')}: <span className="font-mono">{certId}</span>
                  </div>
                  <div className="cert-meta">
                    {t('studentId')}: <span className="font-mono">{studentCode}</span>
                  </div>
                  <div className="cert-meta">
                    {t('issued')}{" "}
                    {issueDate ? new Date(issueDate).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div className="cert-actions">
                  <button onClick={downloadCertificate} className="btn">
                    {t('downloadPDF')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
