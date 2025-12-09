import React, { useState } from 'react';
import { LayoutDashboard, Award, FileText, Upload, List, Clock, BookOpen, Link2, Layers, Settings, Menu, X, Bell, User, Download, Eye, Share2, Trash2, Check, XCircle, Plus, Edit, Search, Filter } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orgSettings, setOrgSettings] = useState({
    name: 'Excellence Academy',
    logo: null,
    primaryColor: '#2563eb',
    accentColor: '#7c3aed'
  });

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'issue', name: 'Issue Certificate', icon: Award },
    { id: 'templates', name: 'Templates', icon: FileText },
    { id: 'batch', name: 'Batch Upload', icon: Upload },
    { id: 'certificates', name: 'Certificates', icon: List },
    { id: 'pending', name: 'Pending Proofs', icon: Clock, badge: 3 },
    { id: 'courses', name: 'Courses', icon: BookOpen },
    { id: 'blockchain', name: 'Blockchain Anchor', icon: Link2 },
    { id: 'batches', name: 'Batches', icon: Layers },
  ];

  const stats = [
    { label: 'Total Certificates', value: '1,247', icon: Award, color: 'from-blue-500 to-blue-600', change: '+12%' },
    { label: 'Pending Proofs', value: '23', icon: Clock, color: 'from-amber-500 to-amber-600', change: '+5%' },
    { label: 'Active Courses', value: '45', icon: BookOpen, color: 'from-purple-500 to-purple-600', change: '+8%' },
    { label: 'Blockchain Anchored', value: '1,189', icon: Link2, color: 'from-emerald-500 to-emerald-600', change: '+15%' },
  ];

  const recentCertificates = [
    { id: 'CERT-001', learner: 'John Doe', course: 'Web Development Fundamentals', date: '2024-12-08', status: 'Active', blockchain: true },
    { id: 'CERT-002', learner: 'Jane Smith', course: 'Data Science Bootcamp', date: '2024-12-07', status: 'Active', blockchain: true },
    { id: 'CERT-003', learner: 'Mike Johnson', course: 'Digital Marketing Pro', date: '2024-12-06', status: 'Pending', blockchain: false },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your certificates today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                  <stat.icon className="w-6 h-6 text-white" style={{filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'}} />
                </div>
                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-900">Recent Certificates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Certificate ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Learner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cert.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cert.learner}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cert.course}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cert.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      cert.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cert.blockchain && <Link2 className="w-3 h-3 mr-1" />}
                      {cert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIssueCertificate = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Issue New Certificate</h1>
        <p className="text-gray-600 mt-1">Create and issue a certificate to a learner</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Certificate Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Learner Name</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Learner Email</label>
                <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="john@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Learner ID</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="LRN-12345" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Course Selection</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Select a course</option>
                <option>Web Development Fundamentals</option>
                <option>Data Science Bootcamp</option>
                <option>Digital Marketing Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Skills Acquired</label>
              <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3" placeholder="React, JavaScript, CSS, HTML..."></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until</label>
              <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Template Selection</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Modern Professional</option>
                <option>Classic Elegant</option>
                <option>Tech Minimal</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md">
                Generate & Submit
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Preview
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Certificate Preview</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg aspect-[1.414/1] flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center text-gray-500">
              <Award className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              <p className="font-semibold">Certificate Preview</p>
              <p className="text-sm mt-1">Fill in details to see preview</p>
            </div>
          </div>
          <button className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            Download Certificate
          </button>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Certificate Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage certificate templates</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Modern Professional', 'Classic Elegant', 'Tech Minimal'].map((template, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-[1.414/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <FileText className="w-20 h-20 text-gray-400" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-2">{template}</h3>
              <p className="text-sm text-gray-600 mb-4">Professional certificate design with custom branding</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBatchUpload = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Batch Certificate Upload</h1>
        <p className="text-gray-600 mt-1">Upload multiple certificates at once using CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Template Selection</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Modern Professional</option>
                <option>Classic Elegant</option>
                <option>Tech Minimal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload CSV File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Drop CSV file here or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md">
              Process Batch
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Processing Results</h2>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900">Successfully Processed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">0 certificates</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Failed Entries</span>
              </div>
              <p className="text-2xl font-bold text-red-700">0 errors</p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Upload a CSV file to see processing results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCertificates = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Certificates</h1>
          <p className="text-gray-600 mt-1">View and manage all issued certificates</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search certificates..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Learner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Validity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Blockchain</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cert.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cert.learner}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{cert.course}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cert.date}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {cert.blockchain ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        <Link2 className="w-3 h-3 mr-1" />
                        Anchored
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return renderDashboard();
      case 'issue': return renderIssueCertificate();
      case 'templates': return renderTemplates();
      case 'batch': return renderBatchUpload();
      case 'certificates': return renderCertificates();
      default: return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <FileText className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{tabs.find(t => t.id === activeTab)?.name}</h3>
          <p className="text-gray-600">This section is under development</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{orgSettings.name}</h1>
                  <p className="text-xs text-gray-500">Certificate Management System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">admin@excellence.edu</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-30 w-72 h-screen bg-white border-r border-gray-200 transition-transform duration-300 overflow-y-auto`}>
          <nav className="p-4 space-y-1 mt-20 lg:mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{tab.name}</span>
                {tab.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
