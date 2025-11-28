const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');
const ModuleProof = require('../models/ModuleProof');
const Batch = require('../models/Batch');
const auth = require('../middleware/auth');
const certificateService = require('../services/certificateService');
const { parse } = require('csv-parse/sync');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|csv|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, CSV, and JSON files are allowed'));
  }
});

// ============================================
// ISSUER DASHBOARD - Overview & Statistics
// ============================================

/**
 * GET /api/institute/dashboard
 * Get dashboard statistics for issuer
 */
router.get('/dashboard', auth(['institute', 'institution']), async (req, res) => {
  try {
    const instituteId = req.user.id;
    
    // Get statistics
    const [
      totalCertificates,
      issuedCertificates,
      pendingCertificates,
      revokedCertificates,
      pendingProofs,
      totalCourses,
      recentCertificates
    ] = await Promise.all([
      Certificate.countDocuments({ institute: instituteId }),
      Certificate.countDocuments({ institute: instituteId, status: { $in: ['Issued', 'ISSUED'] } }),
      Certificate.countDocuments({ institute: instituteId, status: { $in: ['Pending', 'PENDING'] } }),
      Certificate.countDocuments({ institute: instituteId, status: { $in: ['Revoked', 'REVOKED'] } }),
      ModuleProof.countDocuments({ institute: instituteId, status: 'Pending' }),
      Course.countDocuments({ institute: instituteId }),
      Certificate.find({ institute: instituteId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('learner', 'name email')
        .populate('course', 'title')
        .lean()
    ]);

    res.json({
      success: true,
      statistics: {
        totalCertificates,
        issuedCertificates,
        pendingCertificates,
        revokedCertificates,
        pendingProofs,
        totalCourses
      },
      recentCertificates
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
});

// ============================================
// CERTIFICATE MANAGEMENT
// ============================================

/**
 * GET /api/institute/certificates
 * Get all certificates issued by the institute
 */
router.get('/certificates', auth(['institute', 'institution']), async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query = { institute: instituteId };
    
    if (status) {
      query.status = new RegExp(`^${status}$`, 'i');
    }
    
    if (search) {
      query.$or = [
        { certificateId: new RegExp(search, 'i') },
        { studentUniqueCode: new RegExp(search, 'i') }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('learner', 'name email learnerProfile.learnerId')
        .populate('course', 'title description')
        .lean(),
      Certificate.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      certificates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ message: 'Failed to retrieve certificates', error: error.message });
  }
});

/**
 * GET /api/institute/certificates/:id
 * Get specific certificate details
 */
router.get('/certificates/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      institute: req.user.id
    })
      .populate('learner', 'name email learnerProfile.learnerId')
      .populate('course', 'title description modules')
      .populate('batch', 'batchNumber createdAt')
      .lean();
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    res.json({ success: true, certificate });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Failed to retrieve certificate', error: error.message });
  }
});

/**
 * POST /api/institute/certificates
 * Issue a single certificate
 */
router.post('/certificates', auth(['institute', 'institution']), upload.single('certificateFile'), async (req, res) => {
  try {
    const {
      learnerEmail,
      learnerId,
      courseName,
      courseId,
      skillsAcquired,
      validUntil,
      ncvqLevel,
      ncvqQualificationCode
    } = req.body;
    
    if (!learnerEmail || (!courseName && !courseId)) {
      return res.status(400).json({ message: 'Learner email and course information are required' });
    }
    
    // Find or create learner
    let learner = await User.findOne({ email: learnerEmail.toLowerCase().trim() });
    if (!learner) {
      return res.status(404).json({ message: 'Learner not found. Please register the learner first.' });
    }
    
    // Find or create course
    let course;
    if (courseId) {
      course = await Course.findById(courseId);
    } else {
      course = await Course.findOne({
        title: new RegExp(`^${courseName}$`, 'i'),
        institute: req.user.id
      });
      
      if (!course) {
        course = new Course({
          title: courseName,
          description: `Certificate course for ${courseName}`,
          institute: req.user.id,
          modules: skillsAcquired ? skillsAcquired.split(',').map(s => s.trim()) : []
        });
        await course.save();
      }
    }
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check for existing certificate
    const existingCert = await Certificate.findOne({
      learner: learner._id,
      course: course._id,
      institute: req.user.id,
      status: { $nin: ['Revoked', 'REVOKED'] }
    });
    
    if (existingCert) {
      return res.status(400).json({ message: 'Certificate already exists for this learner and course' });
    }
    
    // Generate certificate using service
    const certificateData = {
      learnerEmail: learner.email,
      learnerId: learnerId || learner.learnerProfile?.learnerId,
      courseName: course.title,
      courseId: course._id,
      skillsAcquired: skillsAcquired ? skillsAcquired.split(',').map(s => s.trim()) : [],
      validUntil: validUntil || null,
      ncvqLevel: ncvqLevel || null,
      ncvqQualificationCode: ncvqQualificationCode || null,
      instituteId: req.user.id,
      certificateFile: req.file ? req.file.path : null
    };
    
    const certificate = await certificateService.issueSingleCertificate(certificateData);
    
    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate
    });
  } catch (error) {
    console.error('Issue certificate error:', error);
    res.status(500).json({ message: 'Failed to issue certificate', error: error.message });
  }
});

/**
 * POST /api/institute/certificates/batch
 * Issue certificates in batch from CSV/JSON
 */
router.post('/certificates/batch', auth(['institute', 'institution']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    
    const fileContent = await fs.readFile(req.file.path, 'utf-8');
    let records = [];
    
    // Parse CSV or JSON
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
      records = JSON.parse(fileContent);
      if (!Array.isArray(records)) {
        records = [records];
      }
    } else {
      return res.status(400).json({ message: 'Invalid file format. Use CSV or JSON.' });
    }
    
    if (records.length === 0) {
      return res.status(400).json({ message: 'No records found in file' });
    }
    
    // Process batch - resolve learner IDs and course IDs
    const certificates = [];
    for (const record of records) {
      try {
        const learnerEmail = (record.learnerEmail || record.email || '').toLowerCase().trim();
        const studentUniqueCode = (record.studentUniqueCode || record.learnerId || '').trim();
        const courseName = (record.courseName || record.course || '').trim();
        const courseId = record.courseId;
        
        if (!learnerEmail || !studentUniqueCode || (!courseName && !courseId)) {
          console.error('Skipping record - missing required fields:', { learnerEmail, studentUniqueCode, courseName, courseId });
          continue;
        }
        
        // Find learner by email
        const learner = await User.findOne({ email: learnerEmail, role: 'learner' });
        if (!learner) {
          console.error(`Learner not found: ${learnerEmail}`);
          continue;
        }
        
        // Find course by ID or name
        let course;
        if (courseId) {
          course = await Course.findById(courseId);
        } else {
          course = await Course.findOne({ title: courseName, institute: req.user.id });
        }
        
        if (!course) {
          console.error(`Course not found: ${courseName || courseId}`);
          continue;
        }
        
        certificates.push({
          learner: learner._id,
          course: course._id,
          studentUniqueCode,
          validUntil: record.validUntil || null,
          modulesAwarded: (record.skills || record.skillsAcquired || '').split(',').map(s => s.trim()).filter(Boolean)
        });
      } catch (error) {
        console.error('Error processing record:', error);
      }
    }
    
    if (certificates.length === 0) {
      return res.status(400).json({ message: 'No valid records to process' });
    }
    
    const result = await certificateService.issueBatchCertificates({
      instituteId: req.user.id,
      certificates
    });
    
    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(console.error);
    
    res.status(201).json({
      success: true,
      message: `Batch processed: ${result.successful.length} successful, ${result.failed.length} failed`,
      batchId: result.batchId,
      results: result.successful,
      errors: result.failed,
      merkleRoot: result.merkleRoot
    });
  } catch (error) {
    console.error('Batch issue error:', error);
    res.status(500).json({ message: 'Failed to process batch', error: error.message });
  }
});

/**
 * PUT /api/institute/certificates/:id/revoke
 * Revoke a certificate
 */
router.put('/certificates/:id/revoke', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      institute: req.user.id
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    if (certificate.status === 'Revoked' || certificate.status === 'REVOKED') {
      return res.status(400).json({ message: 'Certificate is already revoked' });
    }
    
    certificate.status = 'Revoked';
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason || 'Revoked by issuer';
    
    await certificate.save();
    
    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      certificate
    });
  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({ message: 'Failed to revoke certificate', error: error.message });
  }
});

/**
 * GET /api/institute/certificates/:id/proof
 * Download certificate proof (JSON with Merkle proof)
 */
router.get('/certificates/:id/proof', auth(['institute', 'institution']), async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      institute: req.user.id
    })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .lean();
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    const proof = {
      certificateId: certificate.certificateId,
      learner: {
        name: certificate.learner?.name,
        email: certificate.learner?.email,
        studentCode: certificate.studentUniqueCode
      },
      course: certificate.course?.title,
      issueDate: certificate.issueDate,
      validUntil: certificate.validUntil,
      status: certificate.status,
      blockchain: {
        txHash: certificate.blockchainTxHash,
        merkleRoot: certificate.merkleRoot,
        merkleProof: certificate.merkleProof || [],
        batchId: certificate.batchId
      },
      hashes: {
        metadata: certificate.metadataHash,
        artifact: certificate.artifactHash
      },
      ipfs: {
        cid: certificate.ipfsCid
      },
      modules: certificate.modulesAwarded
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=proof-${certificate.certificateId}.json`);
    res.json(proof);
  } catch (error) {
    console.error('Download proof error:', error);
    res.status(500).json({ message: 'Failed to generate proof', error: error.message });
  }
});

// ============================================
// MODULE PROOF MANAGEMENT
// ============================================

/**
 * GET /api/institute/proofs
 * Get module proofs for review
 */
router.get('/proofs', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;
    
    const proofs = await ModuleProof.find({
      institute: req.user.id,
      status: new RegExp(`^${status}$`, 'i')
    })
      .sort({ createdAt: -1 })
      .populate('learner', 'name email learnerProfile.learnerId')
      .populate('course', 'title modules')
      .lean();
    
    res.json({ success: true, proofs });
  } catch (error) {
    console.error('Get proofs error:', error);
    res.status(500).json({ message: 'Failed to retrieve proofs', error: error.message });
  }
});

/**
 * PATCH /api/institute/proofs/:proofId
 * Update proof status (approve/reject)
 */
router.patch('/proofs/:proofId', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { status, feedback } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }
    
    const proof = await ModuleProof.findOne({
      _id: req.params.proofId,
      institute: req.user.id
    });
    
    if (!proof) {
      return res.status(404).json({ message: 'Proof not found' });
    }
    
    proof.status = status;
    proof.reviewedAt = new Date();
    proof.reviewedBy = req.user.id;
    
    if (feedback) {
      proof.feedback = feedback;
    }
    
    await proof.save();
    
    res.json({
      success: true,
      message: `Proof ${status.toLowerCase()} successfully`,
      proof
    });
  } catch (error) {
    console.error('Update proof error:', error);
    res.status(500).json({ message: 'Failed to update proof', error: error.message });
  }
});

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * GET /api/institute/courses
 * Get courses offered by the institute
 */
router.get('/courses', auth(['institute', 'institution']), async (req, res) => {
  try {
    const courses = await Course.find({ institute: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    
    // Get certificate counts for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const certificateCount = await Certificate.countDocuments({
          course: course._id,
          institute: req.user.id
        });
        
        return {
          ...course,
          certificateCount
        };
      })
    );
    
    res.json({ success: true, courses: coursesWithStats });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Failed to retrieve courses', error: error.message });
  }
});

/**
 * POST /api/institute/courses
 * Create a new course
 */
router.post('/courses', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { title, description, modules, duration, ncvqLevel } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Course title is required' });
    }
    
    // Check for existing course
    const existing = await Course.findOne({
      title: new RegExp(`^${title}$`, 'i'),
      institute: req.user.id
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Course with this title already exists' });
    }
    
    const course = new Course({
      title,
      description: description || '',
      modules: modules || [],
      duration: duration || null,
      ncvqLevel: ncvqLevel || null,
      institute: req.user.id
    });
    
    await course.save();
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Failed to create course', error: error.message });
  }
});

/**
 * PUT /api/institute/courses/:id
 * Update a course
 */
router.put('/courses/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { title, description, modules, duration, ncvqLevel } = req.body;
    
    const course = await Course.findOne({
      _id: req.params.id,
      institute: req.user.id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (modules) course.modules = modules;
    if (duration !== undefined) course.duration = duration;
    if (ncvqLevel !== undefined) course.ncvqLevel = ncvqLevel;
    
    await course.save();
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Failed to update course', error: error.message });
  }
});

/**
 * DELETE /api/institute/courses/:id
 * Delete a course (soft delete - only if no certificates issued)
 */
router.delete('/courses/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      institute: req.user.id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if any certificates have been issued
    const certCount = await Certificate.countDocuments({
      course: course._id,
      institute: req.user.id
    });
    
    if (certCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete course with issued certificates. Archive it instead.'
      });
    }
    
    await course.deleteOne();
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Failed to delete course', error: error.message });
  }
});

// ============================================
// BATCH MANAGEMENT
// ============================================

/**
 * GET /api/institute/batches
 * Get certificate batches
 */
router.get('/batches', auth(['institute', 'institution']), async (req, res) => {
  try {
    const batches = await Batch.find({ institute: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    
    // Get certificate counts for each batch
    const batchesWithStats = await Promise.all(
      batches.map(async (batch) => {
        const certificateCount = await Certificate.countDocuments({
          batchId: batch.batchId,
          institute: req.user.id
        });
        
        return {
          ...batch,
          certificateCount
        };
      })
    );
    
    res.json({ success: true, batches: batchesWithStats });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ message: 'Failed to retrieve batches', error: error.message });
  }
});

/**
 * GET /api/institute/batches/:batchId/certificates
 * Get certificates in a specific batch
 */
router.get('/batches/:batchId/certificates', auth(['institute', 'institution']), async (req, res) => {
  try {
    const certificates = await Certificate.find({
      batchId: req.params.batchId,
      institute: req.user.id
    })
      .populate('learner', 'name email learnerProfile.learnerId')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, certificates });
  } catch (error) {
    console.error('Get batch certificates error:', error);
    res.status(500).json({ message: 'Failed to retrieve batch certificates', error: error.message });
  }
});

// ============================================
// LEGACY ROUTE SUPPORT
// ============================================

/**
 * POST /api/institute/upload
 * Legacy single certificate upload endpoint
 */
router.post('/upload', auth(['institute', 'institution']), upload.single('certificateFile'), async (req, res) => {
  try {
    // Redirect to new endpoint
    return router.handle({
      ...req,
      url: '/certificates',
      originalUrl: '/api/institute/certificates'
    }, res);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

module.exports = router;
