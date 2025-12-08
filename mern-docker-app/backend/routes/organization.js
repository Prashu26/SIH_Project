const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../utils/fileUpload');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/organization/register
 * Register a new organization
 */
router.post('/register', async (req, res) => {
  try {
    const {
      organizationName,
      industry,
      registrationId,
      email,
      contactNumber,
      headOfficeLocation,
      website,
      linkedinProfile,
      profileDescription,
      password,
      contactPerson,
      hiringRequirements = []
    } = req.body;

    // Check if organization already exists
    const existingOrg = await Organization.findOne({
      $or: [{ email }, { registrationId }]
    });

    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization with this email or registration ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create new organization
    const organization = new Organization({
      organizationName,
      industry,
      registrationId,
      email,
      contactNumber,
      headOfficeLocation,
      website,
      linkedinProfile,
      profileDescription,
      password: hashedPassword,
      contactPerson,
      hiringRequirements: hiringRequirements.map(req => ({
        ...req,
        createdAt: new Date()
      }))
    });

    await organization.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        organizationId: organization._id,
        type: 'organization',
        email: organization.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      token,
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        email: organization.email,
        industry: organization.industry,
        isVerified: organization.isVerified
      }
    });

  } catch (error) {
    logger.error('Organization registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * POST /api/organization/login
 * Login organization
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find organization
    const organization = await Organization.findOne({ email, isActive: true });
    if (!organization) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcryptjs.compare(password, organization.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        organizationId: organization._id,
        type: 'organization',
        email: organization.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        email: organization.email,
        industry: organization.industry,
        isVerified: organization.isVerified
      }
    });

  } catch (error) {
    logger.error('Organization login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * GET /api/organization/profile
 * Get organization profile
 */
router.get('/profile', auth(), async (req, res) => {
  try {
    if (req.user.type !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      organization
    });

  } catch (error) {
    logger.error('Get organization profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

/**
 * PUT /api/organization/profile
 * Update organization profile
 */
router.put('/profile', auth(), async (req, res) => {
  try {
    if (req.user.type !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      organization
    });

  } catch (error) {
    logger.error('Update organization profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

/**
 * POST /api/organization/hiring-requirements
 * Add new hiring requirement
 */
router.post('/hiring-requirements', auth(), async (req, res) => {
  try {
    if (req.user.type !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const newRequirement = {
      ...req.body,
      createdAt: new Date()
    };

    organization.hiringRequirements.push(newRequirement);
    await organization.save();

    res.json({
      success: true,
      message: 'Hiring requirement added successfully',
      requirement: organization.hiringRequirements[organization.hiringRequirements.length - 1]
    });

  } catch (error) {
    logger.error('Add hiring requirement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add hiring requirement',
      error: error.message
    });
  }
});

/**
 * GET /api/organization/student-pool
 * Get filtered student pool based on hiring requirements
 */
router.get('/student-pool', auth(), async (req, res) => {
  try {
    console.log('=== /student-pool endpoint called ===');
    
    if (req.user.type !== 'organization') {
      console.log('Access denied: user type is', req.user.type);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    
    console.log('Fetching student pool with params:', { page, limit });

    // Simple query: Get all learners with basic info
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Finding learners...');
    const students = await User.find({ role: 'learner' })
      .select('_id name email learnerProfile')
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();
    
    console.log(`✅ Found ${students.length} students`);

    // Fetch certificates for these students
    const studentIds = students.map(s => s._id);
    const certificates = await Certificate.find({ 
      learner: { $in: studentIds },
      status: 'Issued'
    })
    .select('learner course issueDate pdfPath modulesAwarded institute')
    .populate('course', 'title')
    .populate('institute', 'name')
    .lean();

    // Map certificates to students
    const studentsWithCerts = students.map(student => {
      const studentCerts = certificates.filter(c => c.learner && c.learner.toString() === student._id.toString());
      
      // Extract course names as skills
      const courseSkills = studentCerts.map(c => c.course?.title).filter(Boolean);
      const profileSkills = student.learnerProfile?.skills || [];
      // Merge and deduplicate
      const allSkills = [...new Set([...profileSkills, ...courseSkills])];

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        certificates: studentCerts.map(c => ({
          courseName: c.course?.title || 'Unknown Course',
          issueDate: c.issueDate,
          pdfPath: c.pdfPath,
          modulesAwarded: c.modulesAwarded || [],
          institute: c.institute,
          issuedBy: c.institute?.name
        })),
        totalCertificates: studentCerts.length,
        skills: allSkills,
        personalInfo: student.learnerProfile?.personalInfo || {}
      };
    });

    // Quick response with just student names and emails
    res.json({
      success: true,
      students: studentsWithCerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });

  } catch (error) {
    console.error('❌ Get student pool error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student pool',
      error: error.message
    });
  }
});

module.exports = router;