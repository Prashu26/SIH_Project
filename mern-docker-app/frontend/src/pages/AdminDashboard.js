import React, { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Menu, X, Home, Users, BookOpen, FileCheck, Award, Settings, Bell, Search, Plus, TrendingUp, Activity, Clock, ChevronRight, Filter, Download } from 'lucide-react';
import { apiFetch } from "../services/api";

export default function AdminDashboard({ token }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [instituteDirectory, setInstituteDirectory] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // allow token to be supplied by prop or fall back to localStorage
    const effectiveToken = token || localStorage.getItem("token");
    if (!effectiveToken) {
      setOverview(null);
      setCourses([]);
      setUsers([]);
      setInstitutes([]);
      return;
    }

    let ignore = false;
    setStatus({ loading: true, error: "" });

    Promise.all([
      apiFetch("/api/admin/overview", { token: effectiveToken }),
      apiFetch("/api/admin/courses", { token: effectiveToken }),
      apiFetch("/api/admin/users?role=learner", { token: effectiveToken }),
      apiFetch("/api/admin/pending-institutes", { token: effectiveToken }),
      apiFetch("/api/admin/users?role=institute", { token: effectiveToken }),
    ])
      .then(([overviewRes, coursesRes, usersRes, pendingRes, instituteRes]) => {
        if (ignore) return;

        if (!overviewRes.ok) {
          setStatus({
            loading: false,
            error:
              overviewRes.data?.message || "Unable to load admin overview.",
          });
        } else {
          setOverview(overviewRes.data);
          setStatus((prev) => ({ ...prev, loading: false }));
        }

        if (coursesRes.ok) setCourses(coursesRes.data.courses || []);
        if (usersRes.ok) setUsers(usersRes.data.users || []);
        if (pendingRes.ok) setInstitutes(pendingRes.data.pending || []);
        if (instituteRes.ok)
          setInstituteDirectory(instituteRes.data.users || []);

        // Generate recent activity
        const activities = [];
        if (usersRes.ok && usersRes.data.users) {
          usersRes.data.users.slice(0, 2).forEach(user => {
            activities.push({
              user: user.name || user.email,
              action: 'Enrolled in',
              course: 'Course',
              time: '2h ago'
            });
          });
        }
        if (instituteRes.ok && instituteRes.data.users) {
          instituteRes.data.users.slice(0, 1).forEach(inst => {
            activities.push({
              user: inst.name,
              action: 'Added new course',
              course: 'Platform',
              time: '5h ago'
            });
          });
        }
        setRecentActivity(activities);
      })
      .catch((error) => {
        if (ignore) return;
        setStatus({
          loading: false,
          error: error.message || "Unexpected admin fetch error.",
        });
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const effectiveToken = token || localStorage.getItem("token");
  
  // Generate stats from API data
  const stats = [
    { label: 'USERS', value: overview?.stats?.users || '0', change: '+12%', trend: 'up', icon: Users, color: 'from-violet-500 to-purple-600' },
    { label: 'COURSES', value: overview?.stats?.courses || '0', change: '+23%', trend: 'up', icon: BookOpen, color: 'from-blue-500 to-cyan-600' },
    { label: 'PROOFS', value: overview?.stats?.proofs || '0', change: '0%', trend: 'neutral', icon: FileCheck, color: 'from-amber-500 to-orange-600' },
    { label: 'CERTIFICATES', value: overview?.stats?.certificates || '0', change: '+8%', trend: 'up', icon: Award, color: 'from-emerald-500 to-teal-600' }
  ];

  // Generate activity data for charts (mock data with real stats)
  const activityData = [
    { month: 'Jan', users: 5, courses: 2 },
    { month: 'Feb', users: 8, courses: 3 },
    { month: 'Mar', users: 10, courses: 4 },
    { month: 'Apr', users: Math.max(10, Math.floor(overview?.stats?.users / 2) || 0), courses: Math.max(4, Math.floor(overview?.stats?.courses / 1.5) || 0) },
    { month: 'May', users: Math.max(12, overview?.stats?.users - 3 || 0), courses: Math.max(5, overview?.stats?.courses - 1 || 0) },
    { month: 'Jun', users: overview?.stats?.users || 0, courses: overview?.stats?.courses || 0 }
  ];

  const certificateData = [
    { month: 'Jan', issued: 0 },
    { month: 'Feb', issued: 1 },
    { month: 'Mar', issued: 1 },
    { month: 'Apr', issued: 2 },
    { month: 'May', issued: 2 },
    { month: 'Jun', issued: Math.floor(overview?.stats?.certificates / 2) || 0 }
  ];

  if (!effectiveToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 max-w-md text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Admin Console</h3>
          <p className="text-slate-400">Sign in as an administrator to view system metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 transition-all duration-300 z-50 ${sidebarOpen ? 'w-72' : 'w-0 -ml-72'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800/50">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white block">EduAdmin</span>
              <span className="text-xs text-slate-400">Pro Dashboard</span>
            </div>
          </div>
          
          <nav className="space-y-1">
            {[
              { icon: Home, label: 'Dashboard', id: 'dashboard' },
              { icon: Users, label: 'Users', id: 'users', badge: overview?.stats?.users?.toString() || '0' },
              { icon: BookOpen, label: 'Courses', id: 'courses', badge: overview?.stats?.courses?.toString() || '0' },
              { icon: FileCheck, label: 'Proofs', id: 'proofs' },
              { icon: Award, label: 'Certificates', id: 'certificates', badge: overview?.stats?.certificates?.toString() || '0' },
              { icon: Activity, label: 'Analytics', id: 'analytics' },
              { icon: Settings, label: 'Settings', id: 'settings' }
            ].map((item, i) => (
              <button 
                key={i} 
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${activeTab === item.id ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === item.id ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white p-2.5 hover:bg-slate-800/50 rounded-xl transition-all">
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Search className="w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Search anything..." className="bg-transparent outline-none text-white placeholder-slate-500 w-96" />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button className="p-2.5 hover:bg-slate-800/50 rounded-xl text-white relative transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
              </button>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/30"></div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 relative">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
            <p className="text-slate-400">Welcome back! Here's what's happening with your platform today.</p>
          </div>

          {/* Error Message */}
          {status.error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
              {status.error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl" style={{background: `linear-gradient(135deg, ${stat.color.split(' ')[1]}, ${stat.color.split(' ')[3]})`}}></div>
                <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 p-6 rounded-2xl hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-slate-400 text-sm font-medium tracking-wider">{stat.label}</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-bold text-white">{status.loading && !overview ? '—' : stat.value}</span>
                        {stat.trend !== 'neutral' && (
                          <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {stat.change}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${stat.color} rounded-full`} style={{width: '70%'}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Growth Chart */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Growth Analytics</h3>
                  <p className="text-slate-400 text-sm mt-1">Users and courses over time</p>
                </div>
                <button className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-all">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="courses" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCourses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Certificate Chart */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Certificates Issued</h3>
                  <p className="text-slate-400 text-sm mt-1">Monthly certificate distribution</p>
                </div>
                <button className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-all">
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={certificateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
                  <Bar dataKey="issued" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Directory Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Institutes */}
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Institutes Directory</h3>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Institute
                </button>
              </div>
              <div className="space-y-4">
                {instituteDirectory.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No institutes found.</p>
                ) : (
                  instituteDirectory.slice(0, 3).map((inst, i) => (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/50 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">{inst.name}</h4>
                          <p className="text-slate-400 text-sm mb-3">{inst.email}</p>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <span className="text-blue-400 text-xs font-mono font-semibold">{inst.instituteProfile?.registrationId || 'ID-' + inst._id?.slice(0, 6)}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold">
                          ACTIVE
                        </span>
                      </div>
                      <div className="flex items-center gap-6 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 text-sm">Pending</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 text-sm">Verified</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No recent activity.</p>
                ) : (
                  recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-800/50 last:border-0 last:pb-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{activity.user}</p>
                        <p className="text-slate-400 text-xs mt-1">{activity.action} <span className="text-blue-400">{activity.course}</span></p>
                        <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Learners Section */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Learners Directory</h3>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Learner
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.length === 0 ? (
                <p className="text-slate-400 col-span-full text-center py-8">No learners found.</p>
              ) : (
                users.slice(0, 6).map((learner, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex-shrink-0"></div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <span className="text-purple-400 text-xs font-mono font-semibold">{learner.learnerProfile?.learnerId || 'LRN-' + (i + 1)}</span>
                      </div>
                    </div>
                    <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-400 transition-colors">{learner.name}</h4>
                    <p className="text-slate-400 text-sm mb-4">{learner.email}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Courses</span>
                        <span className="text-white font-semibold">0</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Certificates</span>
                        <span className="text-white font-semibold">0</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-3">
                        <Clock className="w-3 h-3" />
                        Active now
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Approvals Section */}
          {institutes.length > 0 && (
            <div className="mt-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Pending Institute Registrations</h3>
              <div className="space-y-4">
                {institutes.map((inst, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex items-center justify-between hover:border-amber-500/50 transition-all">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-lg mb-1">{inst.name}</h4>
                      <p className="text-slate-400 text-sm mb-2">{inst.email}</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <span className="text-amber-400 text-xs font-mono font-semibold">Reg ID: {inst.instituteProfile?.registrationId}</span>
                      </div>
                    </div>
                    <button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all"
                      onClick={async () => {
                        setStatus((s) => ({ ...s, loading: true }));
                        try {
                          const res = await apiFetch(
                            `/api/admin/users/${inst._id}/approve`,
                            { token: effectiveToken, method: "POST" }
                          );
                          if (!res.ok)
                            throw new Error(
                              res.data?.message || "Approve failed"
                            );
                          setInstitutes((list) =>
                            list.filter((i) => i._id !== inst._id)
                          );
                          setInstituteDirectory((dir) => [...dir, inst]);
                        } catch (e) {
                          setStatus((s) => ({ ...s, error: e.message }));
                        } finally {
                          setStatus((s) => ({ ...s, loading: false }));
                        }
                      }}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

