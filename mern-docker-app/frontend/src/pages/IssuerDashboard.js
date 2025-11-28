import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useNavigate } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';

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
    return { token: null, user: null };
  }
}

export default function IssuerDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statistics, setStatistics] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  // Form states
  const [singleCertForm, setSingleCertForm] = useState({
    learnerEmail: '',
    learnerId: '',
    courseId: '',
    courseName: '',
    skillsAcquired: '',
    validUntil: '',
    ncvqLevel: '',
    ncvqQualificationCode: ''
  });
  
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    modules: '',
    duration: '',
    ncvqLevel: ''
  });
  
  const [batchFile, setBatchFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await apiFetch('/api/institute/dashboard', { token });
      
      if (response.ok) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  // Load certificates
  const loadCertificates = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await apiFetch('/api/institute/certificates', { token });
      
      if (response.ok) {
        setCertificates(response.data.certificates || []);
      }
    } catch (error) {
      console.error('Certificates load error:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  // Load courses
  const loadCourses = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiFetch('/api/institute/courses', { token });
      
      if (response.ok) {
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error('Courses load error:', error);
    }
  }, [token]);
  
  // Load proofs
  const loadProofs = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiFetch('/api/institute/proofs?status=Pending', { token });
      
      if (response.ok) {
        setProofs(response.data.proofs || []);
      }
    } catch (error) {
      console.error('Proofs load error:', error);
    }
  }, [token]);
  
  // Load batches
  const loadBatches = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiFetch('/api/institute/batches', { token });
      
      if (response.ok) {
        setBatches(response.data.batches || []);
      }
    } catch (error) {
      console.error('Batches load error:', error);
    }
  }, [token]);
  
  // Initial load
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    loadDashboard();
    loadCourses();
  }, [token, navigate, loadDashboard, loadCourses]);
  
  // Load data based on active tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'certificates') {
      loadCertificates();
    } else if (activeTab === 'proofs') {
      loadProofs();
    } else if (activeTab === 'batches') {
      loadBatches();
    }
  }, [activeTab, token, loadCertificates, loadProofs, loadBatches]);
  
  // Handle single certificate submission
  const handleSingleCertSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      Object.keys(singleCertForm).forEach(key => {
        if (singleCertForm[key]) {
          formData.append(key, singleCertForm[key]);
        }
      });
      
      if (certFile) {
        formData.append('certificateFile', certFile);
      }
      
      const response = await apiFetch('/api/institute/certificates', {
        method: 'POST',
        body: formData,
        token
      });
      
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Certificate issued successfully!' });
        setSingleCertForm({
          learnerEmail: '',
          learnerId: '',
          courseId: '',
          courseName: '',
          skillsAcquired: '',
          validUntil: '',
          ncvqLevel: '',
          ncvqQualificationCode: ''
        });
        setCertFile(null);
        loadDashboard();
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to issue certificate' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle batch upload
  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    
    if (!batchFile) {
      setFeedback({ type: 'error', message: 'Please select a file' });
      return;
    }
    
    setFeedback({ type: '', message: '' });
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', batchFile);
      
      const response = await apiFetch('/api/institute/certificates/batch', {
        method: 'POST',
        body: formData,
        token
      });
      
      if (response.ok) {
        setFeedback({
          type: 'success',
          message: `Batch processed: ${response.data.results?.length || 0} certificates issued`
        });
        setBatchFile(null);
        loadDashboard();
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Batch upload failed' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle course creation
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setIsSubmitting(true);
    
    try {
      const courseData = {
        ...courseForm,
        modules: courseForm.modules.split(',').map(m => m.trim()).filter(Boolean)
      };
      
      const response = await apiFetch('/api/institute/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
        token
      });
      
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Course created successfully!' });
        setCourseForm({
          title: '',
          description: '',
          modules: '',
          duration: '',
          ncvqLevel: ''
        });
        loadCourses();
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to create course' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle proof status update
  const updateProofStatus = async (proofId, status) => {
    try {
      const response = await apiFetch(`/api/institute/proofs/${proofId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token
      });
      
      if (response.ok) {
        setFeedback({ type: 'success', message: `Proof ${status.toLowerCase()} successfully` });
        loadProofs();
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to update proof' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    }
  };
  
  // Handle certificate revocation
  const revokeCertificate = async (certId) => {
    if (!window.confirm('Are you sure you want to revoke this certificate?')) {
      return;
    }
    
    try {
      const reason = prompt('Enter revocation reason:');
      if (!reason) return;
      
      const response = await apiFetch(`/api/institute/certificates/${certId}/revoke`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
        token
      });
      
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Certificate revoked successfully' });
        loadCertificates();
        loadDashboard();
      } else {
        setFeedback({ type: 'error', message: response.data?.message || 'Failed to revoke certificate' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    }
  };
  
  // Download proof
  const downloadProof = async (certId) => {
    try {
      const response = await fetch(`/api/institute/certificates/${certId}/proof`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-${certId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to download proof' });
    }
  };
  
  if (!token || !user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-xl">
                <i className="bx bx-buildings text-white text-3xl"></i>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Issuer Dashboard</h1>
                <p className="text-gray-300 mt-1">Welcome back, {user?.name || 'Institute'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <i className="bx bx-log-out"></i>
              Logout
            </button>
          </div>
          
          {/* Feedback Message */}
          {feedback.message && (
            <div className={`rounded-lg p-4 mb-6 ${
              feedback.type === 'error'
                ? 'bg-red-600/20 border border-red-500/30 text-red-300'
                : 'bg-green-600/20 border border-green-500/30 text-green-300'
            }`}>
              <div className="flex items-center gap-3">
                <i className={`bx ${feedback.type === 'error' ? 'bx-error-circle' : 'bx-check-circle'} text-xl`}></i>
                <span>{feedback.message}</span>
                <button
                  onClick={() => setFeedback({ type: '', message: '' })}
                  className="ml-auto"
                >
                  <i className="bx bx-x text-xl"></i>
                </button>
              </div>
            </div>
          )}
          
          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <i className="bx bx-certificate text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{statistics.totalCertificates}</div>
                    <p className="text-gray-400">Total Certificates</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-600 p-3 rounded-lg">
                    <i className="bx bx-check-circle text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{statistics.issuedCertificates}</div>
                    <p className="text-gray-400">Issued</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-600 p-3 rounded-lg">
                    <i className="bx bx-time-five text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{statistics.pendingProofs}</div>
                    <p className="text-gray-400">Pending Reviews</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 p-3 rounded-lg">
                    <i className="bx bx-book text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{statistics.totalCourses}</div>
                    <p className="text-gray-400">Courses</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'bx-home' },
              { id: 'issue', label: 'Issue Certificate', icon: 'bx-certificate' },
              { id: 'batch', label: 'Batch Upload', icon: 'bx-upload' },
              { id: 'certificates', label: 'Certificates', icon: 'bx-list-ul' },
              { id: 'proofs', label: 'Pending Proofs', icon: 'bx-time-five', badge: proofs.length },
              { id: 'courses', label: 'Courses', icon: 'bx-book' },
              { id: 'batches', label: 'Batches', icon: 'bx-layer' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <i className={`bx ${tab.icon}`}></i>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-b-xl rounded-tr-xl p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
              <div className="grid gap-6">
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('issue')}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-plus-circle text-2xl"></i>
                      <span>Issue Certificate</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('batch')}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-upload text-2xl"></i>
                      <span>Batch Upload</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('courses')}
                      className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-book text-2xl"></i>
                      <span>Manage Courses</span>
                    </button>
                  </div>
                </div>
                
                {statistics?.recentCertificates && statistics.recentCertificates.length > 0 && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Certificates</h3>
                    <div className="space-y-3">
                      {statistics.recentCertificates.slice(0, 5).map(cert => (
                        <div key={cert._id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{cert.learner?.name || 'N/A'}</p>
                            <p className="text-gray-400 text-sm">{cert.course?.title || 'N/A'}</p>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {new Date(cert.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Issue Certificate Tab */}
          {activeTab === 'issue' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Issue Single Certificate</h2>
              <form onSubmit={handleSingleCertSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2">Learner Email *</label>
                    <input
                      type="email"
                      value={singleCertForm.learnerEmail}
                      onChange={(e) => setSingleCertForm({...singleCertForm, learnerEmail: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Learner ID</label>
                    <input
                      type="text"
                      value={singleCertForm.learnerId}
                      onChange={(e) => setSingleCertForm({...singleCertForm, learnerId: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Select Course</label>
                    <select
                      value={singleCertForm.courseId}
                      onChange={(e) => setSingleCertForm({...singleCertForm, courseId: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="">Select a course...</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Or Enter Course Name</label>
                    <input
                      type="text"
                      value={singleCertForm.courseName}
                      onChange={(e) => setSingleCertForm({...singleCertForm, courseName: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Valid Until</label>
                    <input
                      type="date"
                      value={singleCertForm.validUntil}
                      onChange={(e) => setSingleCertForm({...singleCertForm, validUntil: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">NCVQ Level</label>
                    <input
                      type="text"
                      value={singleCertForm.ncvqLevel}
                      onChange={(e) => setSingleCertForm({...singleCertForm, ncvqLevel: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      placeholder="e.g., Level 4"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Skills Acquired (comma-separated)</label>
                  <textarea
                    value={singleCertForm.skillsAcquired}
                    onChange={(e) => setSingleCertForm({...singleCertForm, skillsAcquired: e.target.value})}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="React, Node.js, MongoDB, Express"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Certificate PDF (optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCertFile(e.target.files[0])}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Issuing...
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
          
          {/* Batch Upload Tab */}
          {activeTab === 'batch' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Batch Certificate Upload</h2>
              
              <div className="mb-6 bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-300 font-semibold mb-2">CSV/JSON Format</h3>
                <p className="text-blue-100 text-sm mb-2">Required columns:</p>
                <ul className="list-disc list-inside text-blue-100 text-sm space-y-1">
                  <li><code>learnerEmail</code> - Email address of learner</li>
                  <li><code>studentUniqueCode</code> - Unique student identifier</li>
                  <li><code>courseName</code> - Name of the course</li>
                  <li><code>skills</code> - Comma-separated skills (optional)</li>
                  <li><code>validUntil</code> - Expiry date in YYYY-MM-DD format (optional)</li>
                </ul>
              </div>
              
              <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">Upload CSV or JSON File *</label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setBatchFile(e.target.files[0])}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !batchFile}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-upload"></i>
                      Process Batch
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
          
          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Issued Certificates</h2>
              
              {loading ? (
                <div className="text-center py-12">
                  <i className="bx bx-loader-alt animate-spin text-4xl text-gray-400"></i>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-certificate text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No certificates issued yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map(cert => (
                    <div key={cert._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">{cert.course?.title || 'N/A'}</h3>
                          <p className="text-gray-400">
                            Learner: {cert.learner?.name || 'N/A'} ({cert.learner?.email || 'N/A'})
                          </p>
                          <p className="text-gray-400 text-sm">
                            Certificate ID: {cert.certificateId}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Issued: {new Date(cert.issueDate || cert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          cert.status.toLowerCase() === 'issued' ? 'bg-green-600/20 text-green-300' :
                          cert.status.toLowerCase() === 'revoked' ? 'bg-red-600/20 text-red-300' :
                          'bg-yellow-600/20 text-yellow-300'
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => downloadProof(cert._id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-download"></i>
                          Download Proof
                        </button>
                        
                        {cert.status.toLowerCase() !== 'revoked' && (
                          <button
                            onClick={() => revokeCertificate(cert._id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-x-circle"></i>
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Proofs Tab */}
          {activeTab === 'proofs' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Pending Proof Reviews</h2>
              
              {proofs.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-check-circle text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No pending proofs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proofs.map(proof => (
                    <div key={proof._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {proof.learner?.name || 'Anonymous'}
                        </h3>
                        <p className="text-gray-400">Module: {proof.moduleTitle || 'N/A'}</p>
                        <p className="text-gray-400">Course: {proof.course?.title || 'N/A'}</p>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateProofStatus(proof._id, 'Approved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-check"></i>
                          Approve
                        </button>
                        <button
                          onClick={() => updateProofStatus(proof._id, 'Rejected')}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
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
          
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Manage Courses</h2>
              
              <form onSubmit={handleCourseSubmit} className="mb-8 space-y-6 bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white">Create New Course</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2">Course Title *</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Duration (hours)</label>
                    <input
                      type="number"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Modules (comma-separated)</label>
                  <input
                    type="text"
                    value={courseForm.modules}
                    onChange={(e) => setCourseForm({...courseForm, modules: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="Module 1, Module 2, Module 3"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-plus"></i>
                      Create Course
                    </>
                  )}
                </button>
              </form>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Existing Courses</h3>
                {courses.length === 0 ? (
                  <p className="text-gray-400">No courses yet</p>
                ) : (
                  courses.map(course => (
                    <div key={course._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-white mb-2">{course.title}</h4>
                      <p className="text-gray-400 mb-2">{course.description}</p>
                      {course.modules && course.modules.length > 0 && (
                        <p className="text-gray-400 text-sm">Modules: {course.modules.join(', ')}</p>
                      )}
                      <p className="text-gray-400 text-sm mt-2">
                        Certificates issued: {course.certificateCount || 0}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Batches Tab */}
          {activeTab === 'batches' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Certificate Batches</h2>
              
              {batches.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-layer text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No batches yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.map(batch => (
                    <div key={batch._id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            Batch #{batch.batchId}
                          </h3>
                          <p className="text-gray-400">
                            Created: {new Date(batch.createdAt).toLocaleString()}
                          </p>
                          <p className="text-gray-400">
                            Certificates: {batch.certificateCount || 0}
                          </p>
                          {batch.merkleRoot && (
                            <p className="text-gray-400 text-sm font-mono">
                              Merkle Root: {batch.merkleRoot.slice(0, 20)}...
                            </p>
                          )}
                        </div>
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
