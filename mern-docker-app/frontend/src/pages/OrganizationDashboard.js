import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../services/api';
import Messages from '../components/Messages';
import CertificateVerification from '../components/CertificateVerification';
import { useLanguage } from '../contexts/LanguageContext';

// Icons
const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Message: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Briefcase: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  CheckBadge: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Location: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

const OrganizationDashboard = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState(null);
  const [studentPool, setStudentPool] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filters, setFilters] = useState({
    skills: '',
    location: '',
    experience: '',
    qualification: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const orgData = localStorage.getItem('organization');
    const token = localStorage.getItem('orgToken');
    
    if (!orgData || !token) {
      navigate('/organization/login');
      return;
    }

    try {
      setOrganization(JSON.parse(orgData));
    } catch (e) {
      console.error('Error parsing organization data', e);
      navigate('/organization/login');
      return;
    }
    
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('orgToken');
    if (!token) return;

    setError(null);
    try {
      console.log('Fetching dashboard data from:', API_BASE);
      
      // Create a timeout promise
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );

      // Fetch student pool with timeout
      const poolFetch = fetch(`${API_BASE}/api/organization/student-pool?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const poolResponse = await Promise.race([poolFetch, timeout]);
      
      console.log('Pool response status:', poolResponse.status);

      if (!poolResponse.ok) {
        throw new Error(`Failed to fetch student pool: ${poolResponse.status}`);
      }
      
      const poolData = await poolResponse.json();
      console.log('Pool data received:', poolData);
      setStudentPool(poolData.students || []);

      // Fetch conversations
      const convFetch = fetch(`${API_BASE}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const convResponse = await Promise.race([convFetch, timeout]);
      
      if (convResponse.ok) {
        const convData = await convResponse.json();
        setConversations(convData.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('orgToken');
    localStorage.removeItem('organization');
    navigate('/');
  };

  const initiateConversation = async (studentId) => {
    const token = localStorage.getItem('orgToken');
    try {
      const response = await fetch(`${API_BASE}/api/messages/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId: studentId,
          message: t('initialMessage').replace('{orgName}', organization?.organizationName)
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(t('conversationInitiated'));
        fetchDashboardData(); // Refresh conversations
        setActiveTab('messages'); // Switch to messages tab
      }
    } catch (error) {
      alert(t('conversationError'));
    }
  };

  const verifyStudentCertificate = async (certificateHash) => {
    try {
      const response = await fetch(`${API_BASE}/api/verify/single/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateHash })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return { valid: false, error: t('verificationFailed') };
    }
  };

  const getLocation = (student) => {
    const { district, state } = student.personalInfo || {};
    const parts = [district, state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : t('locationNotAvailable');
  };

  const filteredStudents = studentPool.filter(student => {
    const matchesSkills = !filters.skills || 
      student.certificates?.some(cert => 
        cert.skills?.some(skill => 
          skill.toLowerCase().includes(filters.skills.toLowerCase())
        )
      );
    
    const locationStr = getLocation(student).toLowerCase();
    const matchesLocation = !filters.location || locationStr.includes(filters.location.toLowerCase());

    return matchesSkills && matchesLocation;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-red-600 mb-4">{t('errorLoadingDashboard')}</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
        activeTab === id
          ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col z-10">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900 truncate" title={organization?.organizationName}>
            {organization?.organizationName}
          </h1>
          <p className="text-xs text-gray-500 mt-1">{organization?.industry}</p>
        </div>
        
        <nav className="flex-1 py-6 space-y-1">
          <SidebarItem id="overview" label={t('overview')} icon={Icons.Dashboard} />
          <SidebarItem id="talent-pool" label={t('talentPool')} icon={Icons.Users} />
          <SidebarItem id="messages" label={t('messages')} icon={Icons.Message} />
          <SidebarItem id="hiring-requirements" label={t('hiring')} icon={Icons.Briefcase} />
          <SidebarItem id="verification" label={t('verification')} icon={Icons.CheckBadge} />
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Icons.Logout />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">
              {t(activeTab.replace('-', '')) || activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition-colors"
                title={t('logout')}
              >
                <Icons.Logout />
              </button>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {organization?.organizationName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">{t('totalStudents')}</h3>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Icons.Users />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{studentPool.length}</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">{t('activeConversations')}</h3>
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                      <Icons.Message />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{conversations.length}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">{t('openPositions')}</h3>
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                      <Icons.Briefcase />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {organization?.hiringRequirements?.length || 0}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('organizationDetails')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">{t('email')}:</span>
                      <span>{organization?.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">{t('contact')}:</span>
                      <span>{organization?.contactNumber}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">{t('website')}:</span>
                      <a href={organization?.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {organization?.website}
                      </a>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">{t('location')}:</span>
                      <span>{organization?.headOfficeLocation?.city}, {organization?.headOfficeLocation?.state}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="w-24 font-medium">{t('regId')}:</span>
                      <span>{organization?.registrationId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Talent Pool Tab */}
          {activeTab === 'talent-pool' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Search />
                    </div>
                    <input
                      type="text"
                      placeholder={t('searchBySkills')}
                      value={filters.skills}
                      onChange={(e) => setFilters({...filters, skills: e.target.value})}
                      className="pl-10 w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Location />
                    </div>
                    <input
                      type="text"
                      placeholder={t('filterByLocation')}
                      value={filters.location}
                      onChange={(e) => setFilters({...filters, location: e.target.value})}
                      className="pl-10 w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setFilters({skills: '', location: '', experience: '', qualification: ''})}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {t('clear')}
                  </button>
                </div>
              </div>

              {/* Student Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student, index) => (
                  <div key={student._id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {student.name?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{student.name}</h4>
                            <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <Icons.Location />
                              <span className="ml-1">{getLocation(student)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('skills')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {student.skills && student.skills.length > 0 ? (
                              student.skills.slice(0, 5).map((skill, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">{t('noSkillsListed')}</span>
                            )}
                            {student.skills && student.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                                +{student.skills.length - 5}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('certificates')}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">{student.certificates?.length || 0}</span>
                            <span className="text-sm text-gray-500">{t('verified')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex space-x-3">
                      <button
                        onClick={() => initiateConversation(student._id)}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        {t('contact')}
                      </button>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        {t('viewProfile')}
                      </button>
                      {student.certificates && student.certificates.length > 0 && (
                        <a
                          href={`${API_BASE}${student.certificates[0].pdfPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title={t('downloadLatestCertificate')}
                        >
                          <Icons.Download />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <Icons.Users />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noStudentsFound')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('tryAdjustingFilters')}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && <Messages />}

          {/* Verification Tab */}
          {activeTab === 'verification' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t('verifyCertificates')}</h3>
              <CertificateVerification />
            </div>
          )}

          {/* Hiring Requirements Tab */}
          {activeTab === 'hiring-requirements' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">{t('activeRequirements')}</h3>
                <button
                  onClick={() => alert('Feature coming soon!')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  {t('addRequirement')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {organization?.hiringRequirements?.map((req, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{req.jobTitle}</h4>
                        <p className="text-sm text-gray-500">{req.jobType} • {req.experienceLevel}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        {t('active')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><span className="font-medium">{t('positions')}:</span> {req.numberOfPositions}</p>
                      <p><span className="font-medium">{t('qualification')}:</span> {req.minimumQualification}</p>
                      {req.salaryRange && (
                        <p><span className="font-medium">{t('salary')}:</span> {req.salaryRange.currency} {req.salaryRange.min} - {req.salaryRange.max}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {req.skillSets?.map((skill, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-gray-100">
                      <button className="text-blue-600 text-sm font-medium hover:text-blue-800">{t('edit')}</button>
                      <button className="text-red-600 text-sm font-medium hover:text-red-800">{t('delete')}</button>
                    </div>
                  </div>
                )) || (
                  <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">{t('noHiringRequirements')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white rounded-t-2xl">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white"
                >
                  <Icons.X />
                </button>
                <div className="flex items-center space-x-6">
                  <div className="h-20 w-20 bg-white text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg">
                    {selectedStudent.name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{selectedStudent.name}</h2>
                    <div className="flex items-center space-x-4 mt-2 text-blue-100">
                      <div className="flex items-center">
                        <Icons.Mail />
                        <span className="ml-2">{selectedStudent.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Icons.Location />
                        <span className="ml-2">{getLocation(selectedStudent)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <h3 className="font-bold text-gray-900 mb-4">{t('personalInfo')}</h3>
                      <div className="space-y-3 text-sm">
                        {selectedStudent.personalInfo?.fatherName && (
                          <div>
                            <p className="text-gray-500 text-xs">{t('fathersName')}</p>
                            <p className="font-medium">{selectedStudent.personalInfo.fatherName}</p>
                          </div>
                        )}
                        {selectedStudent.personalInfo?.dob && (
                          <div>
                            <p className="text-gray-500 text-xs">{t('dateOfBirth')}</p>
                            <p className="font-medium">{selectedStudent.personalInfo.dob}</p>
                          </div>
                        )}
                        {selectedStudent.learnerId && (
                          <div>
                            <p className="text-gray-500 text-xs">{t('learnerId')}</p>
                            <p className="font-medium">{selectedStudent.learnerId}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl">
                      <h3 className="font-bold text-gray-900 mb-4">{t('skills')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.skills?.map((skill, idx) => (
                          <span key={idx} className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                            {skill}
                          </span>
                        )) || <p className="text-gray-500 text-sm">{t('noSkillsListed')}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">{t('verifiedCertificates')}</h3>
                    <div className="space-y-4">
                      {console.log('Selected Student Certificates:', selectedStudent.certificates)}
                      {selectedStudent.certificates?.map((cert, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-white">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">{cert.course?.title || cert.courseName}</h4>
                              <p className="text-blue-600 font-medium">{cert.institute?.name || cert.issuedBy}</p>
                              <p className="text-sm text-gray-500 mt-1">{t('issued')}: {new Date(cert.issueDate).toLocaleDateString()}</p>
                            </div>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              {t('verified')}
                            </span>
                          </div>
                          
                          {cert.modulesAwarded && cert.modulesAwarded.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('modulesCompleted')}</p>
                              <div className="flex flex-wrap gap-2">
                                {cert.modulesAwarded.map((mod, mIdx) => (
                                  <span key={mIdx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {mod}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {cert.pdfPath && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <a 
                                href={`${API_BASE}${cert.pdfPath}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                <Icons.Download />
                                <span className="ml-2">{t('downloadCertificatePDF')}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                          <p className="text-gray-500">{t('noCertificatesFound')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors"
                >
                  {t('close')}
                </button>
                <button
                  onClick={() => {
                    initiateConversation(selectedStudent._id);
                    setSelectedStudent(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {t('contactStudent')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDashboard;