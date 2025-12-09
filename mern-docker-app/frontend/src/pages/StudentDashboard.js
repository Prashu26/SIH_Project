import React, { useState, useEffect, useContext } from 'react';
import { BookOpen, Award, Trophy, Briefcase, Bell, Search, Menu, X, User, Settings, LogOut, Home, FileText, Activity, Zap, TrendingUp, Clock, CheckCircle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch, API_BASE } from '../services/api';
import AuthContext from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const mockData = {
  stats: {
    coursesEnrolled: 12,
    certificatesEarned: 8,
    badgesCollected: 24,
    jobMatches: 15
  },
  courses: [
    { id: 1, title: "Advanced Blockchain Development", institution: "MIT", progress: 75, status: "In Progress" },
    { id: 2, title: "Smart Contract Security", institution: "Stanford", progress: 100, status: "Completed" },
    { id: 3, title: "DeFi Fundamentals", institution: "Harvard", progress: 45, status: "In Progress" },
    { id: 4, title: "Web3 Architecture", institution: "Berkeley", progress: 60, status: "In Progress" },
    { id: 5, title: "NFT Development", institution: "Oxford", progress: 100, status: "Completed" },
    { id: 6, title: "Cryptocurrency Trading", institution: "MIT", progress: 30, status: "In Progress" }
  ],
  certificates: [
    { id: 1, name: "Blockchain Certified Developer", issuer: "IBM", date: "2024-11", verified: true, pdfPath: "mock-cert.pdf" },
    { id: 2, name: "Smart Contract Specialist", issuer: "Ethereum Foundation", date: "2024-10", verified: true, pdfPath: "mock-cert.pdf" },
    { id: 3, name: "DeFi Professional", issuer: "Compound", date: "2024-09", verified: true, pdfPath: "mock-cert.pdf" }
  ],
  activities: [
    { id: 1, action: "Completed", item: "Smart Contract Security", time: "2 hours ago" },
    { id: 2, action: "Earned", item: "Security Expert Badge", time: "5 hours ago" },
    { id: 3, action: "Started", item: "DeFi Fundamentals", time: "1 day ago" }
  ]
};

const StatCard = ({ icon: Icon, title, value, trend, darkMode }) => (
  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      {trend && (
        <div className="flex items-center text-green-500 text-sm font-semibold">
          <TrendingUp className="w-4 h-4 mr-1" />
          {trend}
        </div>
      )}
    </div>
    <h3 className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
  </div>
);

const CourseCard = ({ course, darkMode, t }) => (
  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</h3>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
          <BookOpen className="w-4 h-4 mr-2" />
          {course.institution}
        </p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
        course.status === 'Completed' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        {course.status}
      </span>
    </div>
    
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{t('progress')}</span>
        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{course.progress}%</span>
      </div>
      <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${course.progress}%` }}
        />
      </div>
    </div>
    
    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
      {course.status === 'Completed' ? t('viewCertificate') : t('continueLearning')}
    </button>
  </div>
);

const CertificateCard = ({ cert, darkMode, t }) => (
  <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-300`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cert.name}</h3>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{cert.issuer}</p>
      </div>
      {cert.verified && (
        <CheckCircle className="w-6 h-6 text-green-500" />
      )}
    </div>
    <div className="flex items-center justify-between mt-4">
      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('issued')}: {cert.date}</span>
      <div className="flex space-x-3">
        {cert.pdfPath ? (
          <a 
            href={cert.pdfPath.startsWith('http') ? cert.pdfPath : `${API_BASE}/${cert.pdfPath}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('downloadPDF')}
          </a>
        ) : (
           <span className="text-gray-500 text-sm italic px-3 py-2">{t('generating')}</span>
        )}
        <button className="text-blue-500 hover:text-blue-400 font-medium text-sm px-3 py-2">{t('viewChain')}</button>
      </div>
    </div>
  </div>
);

const ActivityItem = ({ activity, darkMode }) => (
  <div className="flex items-start space-x-4 py-4 border-b border-gray-700 last:border-0">
    <div className="p-2 bg-blue-900 rounded-lg">
      <Activity className="w-4 h-4 text-blue-400" />
    </div>
    <div className="flex-1">
      <p className={darkMode ? 'text-white' : 'text-gray-900'}>
        <span className="font-semibold">{activity.action}</span> {activity.item}
      </p>
      <p className="text-sm text-gray-400 flex items-center mt-1">
        <Clock className="w-3 h-3 mr-1" />
        {activity.time}
      </p>
    </div>
  </div>
);

const AnalyticsSection = ({ courses, certificates, darkMode, t }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Static data for demonstration
  const progressData = [
    { name: 'Blockchain Basics', progress: 100, fullTitle: 'Blockchain Basics' },
    { name: 'Smart Contracts', progress: 75, fullTitle: 'Smart Contracts' },
    { name: 'DeFi Protocols', progress: 45, fullTitle: 'DeFi Protocols' },
    { name: 'Cryptography', progress: 90, fullTitle: 'Cryptography' },
    { name: 'Web3 Security', progress: 30, fullTitle: 'Web3 Security' },
  ];

  const pieData = [
    { name: 'MIT', value: 4 },
    { name: 'Stanford', value: 3 },
    { name: 'Harvard', value: 2 },
    { name: 'IBM', value: 5 },
    { name: 'Google', value: 1 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Progress Chart */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('learningProgress') || 'Learning Progress'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="name" 
                stroke={darkMode ? '#9CA3AF' : '#4B5563'} 
                tick={{ fill: darkMode ? '#9CA3AF' : '#4B5563', fontSize: 12 }}
              />
              <YAxis 
                stroke={darkMode ? '#9CA3AF' : '#4B5563'}
                tick={{ fill: darkMode ? '#9CA3AF' : '#4B5563' }}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#374151' : '#E5E7EB',
                  color: darkMode ? '#FFFFFF' : '#000000'
                }}
                cursor={{ fill: darkMode ? '#374151' : '#F3F4F6' }}
              />
              <Bar dataKey="progress" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Certificates Distribution */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('certificateDistribution') || 'Certificate Distribution'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                 contentStyle={{ 
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#374151' : '#E5E7EB',
                  color: darkMode ? '#FFFFFF' : '#000000'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(mockData);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const { t, changeLanguage, language } = useLanguage();

  const handleEnroll = async (courseId) => {
    try {
      const res = await apiFetch('/api/courses/enroll', {
        method: 'POST',
        body: { courseId }
      });
      
      if (res.ok) {
        alert(t('enrolledSuccess'));
        // Refresh data
        window.location.reload(); 
      } else {
        alert(res.data.message || t('enrollFailed'));
      }
    } catch (err) {
      console.error(err);
      alert(t('enrollError'));
    }
  };

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Home },
    { id: 'browse', label: t('browseCourses'), icon: Search },
    { id: 'courses', label: t('myCourses'), icon: BookOpen },
    { id: 'certificates', label: t('certificates'), icon: Award },
    { id: 'passport', label: t('skillPassport'), icon: FileText },
    { id: 'settings', label: t('profileSettings'), icon: Settings }
  ];

  useEffect(() => {
    // Prefer user from AuthContext, fallback to localStorage
    if (auth && auth.user) {
      setUser(auth.user);
    } else {
      try {
        const raw = localStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {
        setUser(null);
      }
    }
  }, [auth]);

  // Load real learner data when available
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, certRes, coursesRes] = await Promise.all([
          apiFetch('/api/learner/profile'),
          apiFetch('/api/learner/certificates'),
          apiFetch('/api/courses')
        ]);

        if (!mounted) return;

        const next = { ...mockData };
        if (profileRes.ok && profileRes.data) {
          const learner = profileRes.data.learner || {};
          // map some profile fields into mockData slots
          next.stats.coursesEnrolled = (learner.courses || []).length || next.stats.coursesEnrolled;
          
          // Update courses list from profile
          if (learner.courses && learner.courses.length > 0) {
            next.courses = learner.courses.map(c => ({
              id: c.id,
              title: c.title,
              institution: c.platform || 'Unknown Institute', // Platform often holds institute name in this schema
              progress: 0, // Default for now
              status: 'In Progress'
            }));
          }
        }

        if (coursesRes.ok && coursesRes.data.courses) {
          setAvailableCourses(coursesRes.data.courses);
        }

        if (certRes.ok && Array.isArray(certRes.data.certificates)) {
          next.certificates = certRes.data.certificates.map((c, idx) => ({
            id: c._id || c.certificateId || idx,
            name: c.courseName || c.title || 'Certificate',
            issuer: c.institute?.name || c.issuer || '—',
            date: c.issueDate ? new Date(c.issueDate).toLocaleDateString() : (c.createdAt || '—'),
            verified: true,
            pdfPath: c.pdfPath
          }));
        }

        setData(next);
      } catch (err) {
        // keep mockData on errors
        console.error('Failed loading learner data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl transition-all duration-300 z-50 ${
        sidebarOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>CredChain</span>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : darkMode 
                      ? 'text-gray-300 hover:bg-gray-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <button
            onClick={() => {
              // Prefer context logout if available
              if (auth && typeof auth.logout === 'function') {
                auth.logout();
                return;
              }
              try {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              } catch (e) {}
              window.location.href = '/login';
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mt-8 ${
              darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
            } transition-all duration-200`}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Navbar */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md sticky top-0 z-40`}>
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <div className={`flex-1 max-w-xl mx-8 relative`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400' 
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className={`p-2 rounded-lg border-none outline-none cursor-pointer ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="raj">राजस्थानी (Rajasthani)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
              </select>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <button className="relative p-2 rounded-lg hover:bg-gray-700">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8">
                <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('welcome')} 👋
                </h1>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {t('welcomeSubtitle')}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={BookOpen} title={t('coursesEnrolled')} value={data.stats.coursesEnrolled} trend="+2" darkMode={darkMode} />
                <StatCard icon={Award} title={t('certificatesEarned')} value={data.stats.certificatesEarned} trend="+3" darkMode={darkMode} />
                <StatCard icon={Trophy} title={t('badgesCollected')} value={data.stats.badgesCollected} trend="+5" darkMode={darkMode} />
                <StatCard icon={Briefcase} title={t('jobMatches')} value={data.stats.jobMatches} trend="+4" darkMode={darkMode} />
              </div>

              {/* Analytics Section */}
              <AnalyticsSection courses={data.courses} certificates={data.certificates} darkMode={darkMode} t={t} />

              {/* Courses Section */}
              <div className="mb-8">
                <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('myCourses')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.courses.map(course => (
                    <CourseCard key={course.id} course={course} darkMode={darkMode} t={t} />
                  ))}
                </div>
              </div>

              {/* Certificates */}
              <div className="mb-8">
                <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('recentCertificates')}
                </h2>
                <div className="space-y-4">
                  {data.certificates.map(cert => (
                    <CertificateCard key={cert.id} cert={cert} darkMode={darkMode} t={t} />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'browse' && (
            <div>
              <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('browseAvailableCourses')}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map(course => {
                  const isEnrolled = data.courses.some(c => c.id === course._id);
                  return (
                    <div key={course._id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                            <BookOpen className="w-4 h-4 mr-2" />
                            {course.institute?.name || 'Unknown Institute'}
                          </p>
                        </div>
                      </div>
                      
                      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {course.description || t('noDescription')}
                      </p>
                      
                      <button 
                        onClick={() => !isEnrolled && handleEnroll(course._id)}
                        disabled={isEnrolled}
                        className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors duration-200 ${
                          isEnrolled 
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isEnrolled ? t('enrolled') : t('enrollNow')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div>
              <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('myCourses')}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.courses.map(course => (
                  <CourseCard key={course.id} course={course} darkMode={darkMode} t={t} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div>
              <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('certificates')}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.certificates.map(cert => (
                  <CertificateCard key={cert.id} cert={cert} darkMode={darkMode} t={t} />
                ))}
              </div>
            </div>
          )}

          {['passport', 'settings'].includes(activeTab) && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
              <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {navItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {t('underDevelopment')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
