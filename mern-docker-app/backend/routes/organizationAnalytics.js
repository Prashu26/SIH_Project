const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const authMiddleware = require('../middleware/auth');

// Get organization analytics dashboard data
// Static analytics payload for development / fallback
const STATIC_ANALYTICS = {
  certificatesTrend: [
    { month: 'Jul', certificates: 40, verified: 35 },
    { month: 'Aug', certificates: 55, verified: 50 },
    { month: 'Sep', certificates: 63, verified: 60 },
    { month: 'Oct', certificates: 58, verified: 54 },
    { month: 'Nov', certificates: 72, verified: 69 },
    { month: 'Dec', certificates: 80, verified: 78 }
  ],
  certificateStatus: [
    { name: 'Issued', value: 318, color: '#10b981' },
    { name: 'Pending', value: 26, color: '#f59e0b' },
    { name: 'Verified (Blockchain)', value: 292, color: '#3b82f6' },
    { name: 'Revoked', value: 4, color: '#ef4444' }
  ],
  courseStats: [
    { name: 'Advanced Full Stack Development', students: 124, active: true },
    { name: 'Data Science & ML', students: 98, active: true },
    { name: 'Cloud Engineering (AWS)', students: 78, active: true },
    { name: 'Cybersecurity', students: 52, active: true },
    { name: 'UI/UX Design', students: 66, active: true }
  ],
  stats: {
    totalCertificates: 348,
    verifiedCertificates: 292,
    pendingVerification: 26,
    activeCourses: 5,
    totalStudents: 418,
    verificationRate: 84
  }
};

// Development fallback route: GET /api/organization/analytics/static
router.get('/analytics/static', (req, res) => {
  const enabled = process.env.ENABLE_DEV_ENDPOINTS === 'true';
  if (!enabled) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json(STATIC_ANALYTICS);
});

// Get organization analytics dashboard data
router.get('/analytics/:organizationId', authMiddleware(), async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Fetch organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Fetch all certificates for this organization
    const allCertificates = await Certificate.find({ organizationId }).populate('course');
    
    // Fetch courses
    const courses = await Course.find();

    // Generate certificate trend data (last 6 months)
    const certificatesTrend = generateCertificatesTrend(allCertificates);

    // Calculate certificate status distribution
    const certificateStatus = calculateCertificateStatus(allCertificates);

    // Get course statistics
    const courseStats = generateCourseStats(allCertificates, courses);

    // Calculate summary stats
    const stats = {
      totalCertificates: allCertificates.length,
      verifiedCertificates: allCertificates.filter(c => c.status === 'Issued' || c.status === 'ISSUED').length,
      pendingVerification: allCertificates.filter(c => c.status === 'Pending' || c.status === 'PENDING').length,
      activeCourses: courses.length,
      totalStudents: new Set(allCertificates.map(c => c.studentUniqueCode)).size,
      verificationRate: Math.round((allCertificates.filter(c => c.status === 'Issued' || c.status === 'ISSUED').length / Math.max(allCertificates.length, 1)) * 100)
    };

    res.json({
      certificatesTrend,
      certificateStatus,
      courseStats,
      stats,
      organization: {
        name: organization.organizationName,
        industry: organization.industry,
        email: organization.email,
        contactPerson: organization.contactPerson
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data', details: error.message });
  }
});

// Helper function: Generate certificates trend for last 6 months
function generateCertificatesTrend(certificates) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const trendData = months.map((month, idx) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - idx) + 1, 0);

    const issued = certificates.filter(c => {
      const issueDate = new Date(c.issueDate);
      return issueDate >= monthStart && issueDate <= monthEnd && (c.status === 'Issued' || c.status === 'ISSUED');
    }).length;

    const verified = certificates.filter(c => {
      const issueDate = new Date(c.issueDate);
      return issueDate >= monthStart && issueDate <= monthEnd && 
             (c.blockchainTxHash || c.merkleRoot || c.status === 'Issued' || c.status === 'ISSUED');
    }).length;

    return {
      month,
      certificates: issued,
      verified: verified
    };
  });

  return trendData;
}

// Helper function: Calculate certificate status distribution
function calculateCertificateStatus(certificates) {
  const issued = certificates.filter(c => c.status === 'Issued' || c.status === 'ISSUED').length;
  const pending = certificates.filter(c => c.status === 'Pending' || c.status === 'PENDING').length;
  const verified = certificates.filter(c => c.blockchainTxHash || c.merkleRoot).length;
  const revoked = certificates.filter(c => c.status === 'Revoked' || c.status === 'REVOKED').length;

  return [
    { name: 'Issued', value: issued, color: '#10b981' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
    { name: 'Verified (Blockchain)', value: verified, color: '#3b82f6' },
    { name: 'Revoked', value: revoked, color: '#ef4444' }
  ];
}

// Helper function: Generate course statistics
function generateCourseStats(certificates, courses) {
  const courseCertCounts = {};

  certificates.forEach(cert => {
    if (cert.course && cert.course._id) {
      const courseId = cert.course._id.toString();
      courseCertCounts[courseId] = (courseCertCounts[courseId] || 0) + 1;
    }
  });

  return courses.map(course => ({
    name: course.title || course.name,
    students: courseCertCounts[course._id.toString()] || 0,
    active: true
  })).sort((a, b) => b.students - a.students);
}

module.exports = router;
