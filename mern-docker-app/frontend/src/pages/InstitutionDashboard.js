import React, { useEffect, useState, useContext } from 'react';
import { apiFetch } from '../services/api';
import 'boxicons/css/boxicons.min.css';

// Simple auth hook for this component
function useAuth() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  try {
    return {
      token,
      user: token && userData ? JSON.parse(userData) : null
    };
  } catch (error) {
    console.error('Error parsing user data:', error);
    return {
      token: null,
      user: null
    };
  }
}

const defaultForm = {
  learnerEmail: '',
  learnerId: '',
  learnerName: '',
  courseName: '',
  courseId: '',
  skills: '',
  validUntil: '',
};

export default function InstitutionDashboard() {
  const { token, user } = useAuth();
  
  // Debug auth state
  console.log('InstitutionDashboard - Auth State:', { token: !!token, user });
  
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [artifactFile, setArtifactFile] = useState(null);
  const [fileKey, setFileKey] = useState(() => Date.now());
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [activeTab, setActiveTab] = useState('issue');

  useEffect(() => {
    if (!token) {
      // Still set defaults but don't prevent UI from loading
      setCertificates([]);
      setForm(() => ({ ...defaultForm }));
      setArtifactFile(null);
      setFileKey(Date.now());
      setFeedback({ tone: 'warning', text: 'Please login to access institution features.' });
      setCourses([]);
      setProofs([]);
      setIsLoading(false);
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

  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 text-center">
          <i className="bx bx-buildings text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-bold text-white mb-2">Institution Dashboard</h3>
          <p className="text-gray-400">Sign in as an institution to access this area.</p>
        </div>
      </div>
    );
  }

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateProofStatus = async (proofId, nextStatus) => {
    try {
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
    } catch (error) {
      setFeedback({ tone: 'error', text: 'Network error. Please try again.' });
    }
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

    try {
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
    } catch (error) {
      setIsSubmitting(false);
      setFeedback({ tone: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!artifactFile) {
      setFeedback({ tone: 'error', text: 'Please select a CSV or JSON file.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
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
    } catch (error) {
      setIsSubmitting(false);
      setFeedback({ tone: 'error', text: 'Network error. Please try again.' });
    }
  };

  const tabs = [
    { id: 'issue', label: 'Issue Certificate', icon: 'bx-certificate' },
    { id: 'batch', label: 'Batch Issue', icon: 'bx-data' },
    { id: 'certificates', label: 'Certificates', icon: 'bx-list-ul' },
    { id: 'proofs', label: 'Pending Proofs', icon: 'bx-time-five' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
      {/* Debug info */}
      <div className="bg-yellow-600 text-black p-2 text-sm">
        DEBUG: Token={!!token}, User={user?.name || 'None'}, Role={user?.role || 'None'}
      </div>
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
              <i className="bx bx-buildings text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Institution Dashboard</h1>
              <p className="text-gray-300">Welcome back, {user?.name || 'Institution'}</p>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback.text && (
            <div className={`rounded-lg p-4 mb-6 ${
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

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <i className="bx bx-certificate text-white text-xl"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{certificates.length}</div>
                  <p className="text-gray-400 text-sm">Certificates Issued</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-3 rounded-lg">
                  <i className="bx bx-time-five text-white text-xl"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{proofs.length}</div>
                  <p className="text-gray-400 text-sm">Pending Reviews</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-600 p-3 rounded-lg">
                  <i className="bx bx-book text-white text-xl"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{courses.length}</div>
                  <p className="text-gray-400 text-sm">Available Courses</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="bg-cyan-600 p-3 rounded-lg">
                  <i className="bx bx-shield-check text-white text-xl"></i>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">100%</div>
                  <p className="text-gray-400 text-sm">Blockchain Secured</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <i className={`bx ${tab.icon}`}></i>
                {tab.label}
                {tab.id === 'proofs' && proofs.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{proofs.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-b-xl rounded-tr-xl p-8">
          {/* Issue Certificate Tab */}
          {activeTab === 'issue' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <i className="bx bx-certificate text-blue-400 text-2xl"></i>
                <h2 className="text-2xl font-bold text-white">Issue Single Certificate</h2>
              </div>
              <form onSubmit={submit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Learner Email *</label>
                    <div className="relative">
                      <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="email"
                        value={form.learnerEmail}
                        onChange={updateField('learnerEmail')}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="learner@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Learner Name</label>
                    <div className="relative">
                      <i className="bx bx-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        value={form.learnerName}
                        onChange={updateField('learnerName')}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Jordan Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Learner ID</label>
                    <div className="relative">
                      <i className="bx bx-id-card absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        value={form.learnerId}
                        onChange={updateField('learnerId')}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="LRN-2025-001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Course</label>
                    <select 
                      value={form.courseId} 
                      onChange={updateField('courseId')}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Course Name (fallback)</label>
                    <div className="relative">
                      <i className="bx bx-book absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        value={form.courseName}
                        onChange={updateField('courseName')}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Full Stack Development"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Valid Until</label>
                    <input
                      type="date"
                      value={form.validUntil}
                      onChange={updateField('validUntil')}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Skills Acquired</label>
                  <div className="relative">
                    <i className="bx bx-brain absolute left-3 top-3 text-gray-400"></i>
                    <textarea
                      value={form.skills}
                      onChange={updateField('skills')}
                      rows={3}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                      placeholder="React.js, Node.js, MongoDB, Express.js"
                    ></textarea>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Separate skills with commas</p>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Certificate PDF (optional)</label>
                  <input
                    key={fileKey}
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const file = event.target.files && event.target.files[0];
                      setArtifactFile(file || null);
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
                  />
                  <p className="text-gray-500 text-sm mt-1">Upload signed certificate to anchor on IPFS and blockchain</p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Issuing Certificate...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-certificate"></i>
                      Issue Certificate
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Batch Issue Tab */}
          {activeTab === 'batch' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <i className="bx bx-data text-purple-400 text-2xl"></i>
                <h2 className="text-2xl font-bold text-white">Batch Issue Certificates</h2>
              </div>
              <div className="mb-6 bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                  <i className="bx bx-info-circle"></i>
                  Merkle Tree Batch Processing
                </h3>
                <p className="text-blue-100 text-sm">
                  Upload a CSV or JSON file to issue multiple certificates at once. 
                  All certificates will be anchored to the blockchain using Merkle tree technology for efficient verification.
                </p>
              </div>
              <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">CSV or JSON File *</label>
                  <input
                    key={fileKey + 1}
                    type="file"
                    accept=".csv,.json"
                    onChange={(event) => {
                      const file = event.target.files && event.target.files[0];
                      setArtifactFile(file || null);
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 transition-colors"
                    required
                  />
                  <div className="mt-3 text-gray-400 text-sm">
                    <p className="font-medium">Required CSV columns:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><code>learnerEmail</code> - Email of the learner</li>
                      <li><code>studentUniqueCode</code> - Unique student identifier</li>
                      <li><code>courseName</code> - Name of the course</li>
                      <li><code>skills</code> - Comma-separated skills acquired</li>
                      <li><code>validUntil</code> - Expiry date (optional, YYYY-MM-DD format)</li>
                    </ul>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !artifactFile}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Processing Batch...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-data"></i>
                      Process Batch Issue
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Certificates List Tab */}
          {activeTab === 'certificates' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <i className="bx bx-list-ul text-green-400 text-2xl"></i>
                <h2 className="text-2xl font-bold text-white">Issued Certificates</h2>
              </div>
              {isLoading && certificates.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <i className="bx bx-loader-alt animate-spin text-3xl text-gray-400"></i>
                  <span className="ml-3 text-gray-400">Loading certificates...</span>
                </div>
              )}
              {!isLoading && certificates.length === 0 && (
                <div className="text-center py-12">
                  <i className="bx bx-certificate text-6xl text-gray-600 mb-4"></i>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Certificates Yet</h3>
                  <p className="text-gray-500 mb-6">Start by issuing your first certificate using the form above.</p>
                  <button
                    onClick={() => setActiveTab('issue')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Issue Certificate
                  </button>
                </div>
              )}
              {certificates.length > 0 && (
                <div className="grid gap-6">
                  {certificates.map((certificate) => (
                    <div key={certificate.id || certificate._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">{certificate.courseName}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                              {certificate.uniqueId}
                            </span>
                            {certificate.batchId && (
                              <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                                Batch #{certificate.batchId}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            Issued {new Date(certificate.issueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {certificate.ipfsCid && (
                            <p className="text-gray-500 text-xs font-mono">IPFS: {certificate.ipfsCid.slice(0, 12)}...</p>
                          )}
                          {certificate.artifactHash && (
                            <p className="text-gray-500 text-xs font-mono">Hash: {certificate.artifactHash.slice(0, 12)}...</p>
                          )}
                          {certificate.merkleRoot && (
                            <p className="text-gray-500 text-xs font-mono">Root: {certificate.merkleRoot.slice(0, 12)}...</p>
                          )}
                          {certificate.blockchainTxHash && (
                            <p className="text-gray-500 text-xs font-mono">TX: {certificate.blockchainTxHash.slice(0, 12)}...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            try {
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
                              a.download = `proof-${certificate.certificateId || (certificate.id || certificate._id)}.json`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              setFeedback({ tone: 'error', text: err.message || 'Download failed' });
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-download"></i>
                          Download Proof
                        </button>
                        <a 
                          href={`/verify?query=${certificate.certificateId}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2 no-underline"
                        >
                          <i className="bx bx-shield-check"></i>
                          Verify
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Proofs Tab */}
          {activeTab === 'proofs' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <i className="bx bx-time-five text-orange-400 text-2xl"></i>
                <h2 className="text-2xl font-bold text-white">Pending Proof Reviews</h2>
              </div>
              {isLoading && proofs.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <i className="bx bx-loader-alt animate-spin text-3xl text-gray-400"></i>
                  <span className="ml-3 text-gray-400">Loading proofs...</span>
                </div>
              )}
              {!isLoading && proofs.length === 0 && (
                <div className="text-center py-12">
                  <i className="bx bx-check-circle text-6xl text-gray-600 mb-4"></i>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">All Caught Up!</h3>
                  <p className="text-gray-500">No pending proofs require your review at this time.</p>
                </div>
              )}
              {proofs.length > 0 && (
                <div className="grid gap-6">
                  {proofs.map((proof) => (
                    <div key={proof.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            {proof.learner?.name || proof.learner?.learnerId || 'Anonymous Learner'}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                              {proof.moduleTitle}
                            </span>
                            <span className="bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">
                              {proof.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Course: {proof.course?.title || 'Not mapped'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateProofStatus(proof.id, 'Approved')}
                          disabled={proof.status === 'Approved'}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-check"></i>
                          Approve
                        </button>
                        <button
                          onClick={() => updateProofStatus(proof.id, 'Rejected')}
                          disabled={proof.status === 'Rejected'}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-x"></i>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
