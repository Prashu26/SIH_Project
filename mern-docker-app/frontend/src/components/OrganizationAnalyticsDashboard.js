import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Award, Briefcase, AlertCircle, CheckCircle } from 'lucide-react';
import API_BASE from '../services/api';

const OrganizationAnalyticsDashboard = ({ organizationId, token, staticData }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingSampleSource, setUsingSampleSource] = useState(null); // 'institute' | 'public' | 'embedded'
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [instituteTokenInput, setInstituteTokenInput] = useState('');
  const [saveInstituteToken, setSaveInstituteToken] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingMappedData, setPendingMappedData] = useState(null);

  useEffect(() => {
    // If a staticData prop is provided (demo mode), use it immediately
    if (staticData) {
      setAnalyticsData(staticData);
      setLoading(false);
      setUsingSampleSource('public');
      return;
    }

    if (!organizationId) {
      console.warn('No organizationId provided to OrganizationAnalyticsDashboard');
      setError('Organization not selected');
      setLoading(false);
      return;
    }

    fetchAnalyticsData();
  }, [organizationId, token]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/organization/analytics/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        setError(null);
        setUsingSampleSource(null);
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
      // Try to load institute static dashboard and map it to analytics
      const tried = await tryLoadInstituteStaticAndMap();
      if (tried) {
        setUsingSampleSource('institute');
      }
      if (!tried) {
        // Try public static JSON fallback
        try {
          const res = await fetch('/analytics-static.json');
          if (res.ok) {
            const data = await res.json();
            setAnalyticsData(data);
            setError(null);
            setUsingSampleSource('public');
            return;
          }
        } catch (e) {
          console.warn('Failed to load public analytics-static.json', e);
        }

        // Final fallback to embedded mock
        setAnalyticsMockData();
        setUsingSampleSource('embedded');
      }
    } finally {
      setLoading(false);
    }
  };

  // Try fetching institute static dashboard and map to analytics shape
  const tryLoadInstituteStaticAndMap = async () => {
    try {
      const res = await fetch('/api/institute/dashboard/static');
      if (!res.ok) return false;
      const inst = await res.json();

      const mapped = {
        certificatesTrend: analyticsData?.certificatesTrend || inst.certificatesTrend || [],
        certificateStatus: analyticsData?.certificateStatus || [
          { name: 'Issued', value: inst.statistics.issuedCertificates || 0, color: '#10b981' },
          { name: 'Pending', value: inst.statistics.pendingCertificates || 0, color: '#f59e0b' },
          { name: 'Revoked', value: inst.statistics.revokedCertificates || 0, color: '#ef4444' }
        ],
        courseStats: analyticsData?.courseStats || [],
        stats: {
          totalCertificates: inst.statistics.totalCertificates || 0,
          verifiedCertificates: inst.statistics.issuedCertificates || 0,
          pendingVerification: inst.statistics.pendingCertificates || 0,
          activeCourses: inst.statistics.totalCourses || 0,
          totalStudents: analyticsData?.stats?.totalStudents || 0,
          verificationRate: Math.round(((inst.statistics.issuedCertificates || 0) / Math.max(inst.statistics.totalCertificates || 1, 1)) * 100)
        }
      };

      setAnalyticsData(mapped);
      setError(null);
      setUsingSampleSource('institute');
      return true;
    } catch (e) {
      console.warn('Unable to load institute static dashboard', e);
      return false;
    }
  };

  const handleRetryLive = async () => {
    setError(null);
    setUsingSampleSource(null);
    await fetchAnalyticsData();
  };

  const handleRevertEmbedded = () => {
    setAnalyticsMockData();
    setUsingSampleSource('embedded');
  };

  // Open token modal; prefill from saved token if available
  const openTokenModal = () => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('instituteToken');
    if (saved) setInstituteTokenInput(saved);
    setShowTokenModal(true);
  };

  // Fetch institute certificates & courses using provided token and map to analytics shape
  const fetchAndMapInstituteData = async (token) => {
    try {
      setLoading(true);
      // Fetch many certificates for aggregation
      const certRes = await fetch(`${API_BASE}/api/institute/certificates?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!certRes.ok) {
        throw new Error(`Certificates fetch failed: ${certRes.status}`);
      }

      const certJson = await certRes.json();
      const certificates = certJson.certificates || [];

      // Fetch courses count/list
      const coursesRes = await fetch(`${API_BASE}/api/institute/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursesJson = await (coursesRes.ok ? coursesRes.json() : Promise.resolve({ courses: [] }));
      const courses = coursesJson.courses || [];

      // Compute last 6 months labels dynamically
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString(undefined, { month: 'short' }));
      }

      const trendBuckets = months.map(m => ({ month: m, certificates: 0, verified: 0 }));

      const statusCounts = { Issued: 0, Pending: 0, Verified: 0, Revoked: 0 };
      const courseCounts = {};
      const studentSet = new Set();

      certificates.forEach(c => {
        const dateStr = c.issueDate || c.createdAt || c.updatedAt;
        const d = dateStr ? new Date(dateStr) : null;
        if (d) {
          const label = d.toLocaleString(undefined, { month: 'short' });
          const idx = trendBuckets.findIndex(b => b.month === label);
          if (idx >= 0) trendBuckets[idx].certificates += 1;
        }

        const isVerified = Boolean(c.blockchainTxHash || c.merkleRoot);
        if (isVerified) statusCounts.Verified += 1;

        const st = (c.status || '').toLowerCase();
        if (st === 'issued' || st === 'issued') statusCounts.Issued += 1;
        else if (st === 'pending') statusCounts.Pending += 1;
        else if (st === 'revoked') statusCounts.Revoked += 1;

        const courseName = (c.course && (c.course.title || c.course.name)) || 'Unknown Course';
        courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;

        const learnerId = c.studentUniqueCode || (c.learner && (c.learner._id || c.learner.learnerProfile?.learnerId));
        if (learnerId) studentSet.add(String(learnerId));
      });

      // If trendBuckets all zeros (because months labels mismatch), try to bucket by month index relative to now
      const allZero = trendBuckets.every(b => b.certificates === 0 && b.verified === 0);
      if (allZero && certificates.length > 0) {
        // Recompute by month offset
        const nowMonth = now.getMonth();
        certificates.forEach(c => {
          const dateStr = c.issueDate || c.createdAt || c.updatedAt;
          const d = dateStr ? new Date(dateStr) : null;
          if (!d) return;
          const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
          if (monthsAgo >=0 && monthsAgo < 6) {
            const idx = 5 - monthsAgo; // align with months array
            trendBuckets[idx].certificates += 1;
            if (c.blockchainTxHash || c.merkleRoot) trendBuckets[idx].verified += 1;
          }
        });
      }

      const courseStats = Object.keys(courseCounts).map(name => ({ name, students: courseCounts[name], active: true })).sort((a,b) => b.students - a.students);

      const mapped = {
        certificatesTrend: trendBuckets,
        certificateStatus: [
          { name: 'Issued', value: statusCounts.Issued, color: '#10b981' },
          { name: 'Pending', value: statusCounts.Pending, color: '#f59e0b' },
          { name: 'Verified', value: statusCounts.Verified, color: '#3b82f6' },
          { name: 'Revoked', value: statusCounts.Revoked, color: '#ef4444' }
        ],
        courseStats,
        stats: {
          totalCertificates: certificates.length,
          verifiedCertificates: statusCounts.Verified,
          pendingVerification: statusCounts.Pending,
          activeCourses: courses.length || courseStats.length,
          totalStudents: studentSet.size,
          verificationRate: Math.round((statusCounts.Verified / Math.max(certificates.length, 1)) * 100)
        },
        recentActivity: (certificates.sort((a,b) => new Date(b.createdAt || b.issueDate) - new Date(a.createdAt || a.issueDate))).slice(0,10).map(c => ({ action: c.course?.title || c.issuedBy || 'Certificate', user: c.learner?.name || (c.student || {}).name || 'Learner', time: c.createdAt || c.issueDate }))
      };

      setPendingMappedData(mapped);
      // show confirmation modal
      setConfirmOverwrite(true);
      setShowTokenModal(false);
      return true;
    } catch (e) {
      console.error('fetchAndMapInstituteData failed', e);
      setError(e.message || 'Failed to fetch institute data');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const confirmApplyPending = () => {
    if (pendingMappedData) {
      setAnalyticsData(pendingMappedData);
      setUsingSampleSource('institute-auth');
      if (saveInstituteToken && typeof window !== 'undefined' && instituteTokenInput) {
        localStorage.setItem('instituteToken', instituteTokenInput);
      }
      setPendingMappedData(null);
      setConfirmOverwrite(false);
    }
  };

  const cancelApplyPending = () => {
    setPendingMappedData(null);
    setConfirmOverwrite(false);
  };

  const setAnalyticsMockData = () => {
    // Try to load static JSON from public folder; fallback to embedded mock if fetch fails
    (async () => {
      try {
        const res = await fetch('/analytics-static.json');
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
          setError(null);
          return;
        }
      } catch (e) {
        // ignore and fallback to embedded
      }

      setAnalyticsData({
        certificatesTrend: [
          { month: 'Jan', certificates: 45, verified: 42 },
          { month: 'Feb', certificates: 52, verified: 50 },
          { month: 'Mar', certificates: 48, verified: 46 },
          { month: 'Apr', certificates: 61, verified: 59 },
          { month: 'May', certificates: 55, verified: 53 },
          { month: 'Jun', certificates: 67, verified: 65 }
        ],
        certificateStatus: [
          { name: 'Issued', value: 245, color: '#10b981' },
          { name: 'Pending', value: 32, color: '#f59e0b' },
          { name: 'Verified', value: 218, color: '#3b82f6' },
          { name: 'Revoked', value: 5, color: '#ef4444' }
        ],
        courseStats: [
          { name: 'Full Stack', students: 156, active: true },
          { name: 'ML', students: 89, active: true },
          { name: 'AWS', students: 124, active: true },
          { name: 'Security', students: 67, active: true },
          { name: 'UI/UX', students: 98, active: true }
        ],
        stats: {
          totalCertificates: 245,
          verifiedCertificates: 218,
          pendingVerification: 32,
          activeCourses: 5,
          totalStudents: 534,
          verificationRate: 89
        }
      });
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="text-red-600 p-4">Unable to load analytics data</div>;
  }

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

    return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 rounded-xl">
      {/* Sample data banner */}
      {usingSampleSource && (
        <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-2">
          <div className="text-sm text-yellow-800">
            Showing sample analytics data ({usingSampleSource}). This is a development fallback.
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRetryLive} className="px-3 py-1 bg-white border rounded text-sm">Retry Live</button>
            <button onClick={handleRevertEmbedded} className="px-3 py-1 bg-white border rounded text-sm">Use Embedded Mock</button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={openTokenModal}
          className="text-sm px-3 py-1 bg-white border rounded-md hover:shadow-sm"
        >
          Copy Institute Data (Authenticated)
        </button>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Certificates */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Certificates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.stats.totalCertificates}</p>
              <p className="text-green-600 text-xs mt-2">↑ 12% from last month</p>
            </div>
            <Award className="w-12 h-12 text-blue-500 opacity-80" />
          </div>
        </div>

        {/* Verified Certificates */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Verified</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.stats.verifiedCertificates}</p>
              <p className="text-green-600 text-xs mt-2">{analyticsData.stats.verificationRate}% Success</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-80" />
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.stats.pendingVerification}</p>
              <p className="text-amber-600 text-xs mt-2">In Progress</p>
            </div>
            <AlertCircle className="w-12 h-12 text-amber-500 opacity-80" />
          </div>
        </div>

        {/* Active Courses */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.stats.activeCourses}</p>
              <p className="text-blue-600 text-xs mt-2">Ongoing Programs</p>
            </div>
            <Briefcase className="w-12 h-12 text-purple-500 opacity-80" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.stats.totalStudents}</p>
              <p className="text-indigo-600 text-xs mt-2">Enrolled</p>
            </div>
            <Users className="w-12 h-12 text-indigo-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Certificate Trend */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Certificate Issuance Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.certificatesTrend}>
              <defs>
                <linearGradient id="colorCertificates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [`${value}`, '']}
              />
              <Legend />
              <Area type="monotone" dataKey="certificates" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCertificates)" />
              <Area type="monotone" dataKey="verified" stroke="#10b981" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Confirmation modal for applying mapped institute data */}
          {confirmOverwrite && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Apply Institute Data?</h3>
                <p className="text-sm text-gray-600 mb-4">You're about to overwrite the current analytics with data imported from the institute. Continue?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelApplyPending} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={confirmApplyPending} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie Chart - Certificate Status */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.certificateStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData.certificateStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} certificates`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - Course Enrollment */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Enrollment by Course</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.courseStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [`${value} students`, 'Enrollment']}
              />
              <Legend />
              <Bar dataKey="students" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {/* Token modal */}
        {showTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-3">Import Institute Data (Authenticated)</h3>
              <p className="text-sm text-gray-600 mb-3">Paste an institute token (JWT) below to fetch institute data. You may also use a saved token.</p>
              <div className="space-y-3">
                <input
                  value={instituteTokenInput}
                  onChange={(e) => setInstituteTokenInput(e.target.value)}
                  placeholder="Bearer token..."
                  className="w-full border px-3 py-2 rounded"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={saveInstituteToken} onChange={(e) => setSaveInstituteToken(e.target.checked)} />
                    <span>Save token for reuse</span>
                  </label>
                  <button
                    onClick={() => {
                      const saved = typeof window !== 'undefined' && localStorage.getItem('instituteToken');
                      if (saved) {
                        setInstituteTokenInput(saved);
                      }
                    }}
                    className="text-sm px-2 py-1 border rounded"
                  >Use saved token</button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowTokenModal(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button
                  onClick={async () => {
                    if (!instituteTokenInput) {
                      setError('Please provide a token');
                      return;
                    }
                    await fetchAndMapInstituteData(instituteTokenInput);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >Fetch & Map</button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {[
            { action: 'Certificate issued', user: 'John Doe', time: '2 hours ago', type: 'success' },
            { action: 'Certificate verified', user: 'Jane Smith', time: '4 hours ago', type: 'success' },
            { action: 'Verification pending', user: 'Mike Johnson', time: '6 hours ago', type: 'warning' },
            { action: 'Course completed', user: 'Emma Wilson', time: '8 hours ago', type: 'success' },
            { action: 'Certificate revoked', user: 'Alex Brown', time: '1 day ago', type: 'error' }
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-600">{activity.user}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrganizationAnalyticsDashboard;
