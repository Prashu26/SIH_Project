const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const csv = require('csv-parser');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const ModuleProof = require('../models/ModuleProof');
const { certificateUploadsDir } = require('../utils/storage');
const certificateService = require('../services/certificateService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { uploadBuffer } = require('../utils/ipfsService');
const { issueCredential } = require('../utils/blockchainService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, CSV, and JSON files are allowed.'), false);
    }
  }
});

// Helper function to map certificate for response
const mapCertificate = (cert) => ({
  id: cert._id,
  certificateId: cert.certificateId,
  studentUniqueCode: cert.studentUniqueCode,
  course: cert.course ? {
    id: cert.course._id,
    name: cert.course.name,
    code: cert.course.code,
    ncvqLevel: cert.ncvqLevel,
    ncvqQualificationCode: cert.ncvqQualificationCode,
    ncvqQualificationTitle: cert.ncvqQualificationTitle,
    ncvqQualificationType: cert.ncvqQualificationType
  } : null,
  modulesAwarded: cert.modulesAwarded,
  issueDate: cert.issueDate,
  validUntil: cert.validUntil,
  status: cert.status,
  metadataHash: cert.metadataHash,
  artifactHash: cert.artifactHash,
  ipfsCid: cert.ipfsCid,
  blockchainTxHash: cert.blockchainTxHash,
  merkleRoot: cert.merkleRoot,
  batchId: cert.batchId,
  merkleProof: cert.merkleProof,
  qrCodeData: cert.qrCodeData,
  learner: cert.learner ? {
    id: cert.learner._id,
    name: cert.learner.name,
    email: cert.learner.email,
    studentId: cert.learner.learnerProfile?.studentId
  } : null,
  institute: cert.institute ? {
    id: cert.institute._id,
    name: cert.institute.name,
    registrationId: cert.institute.instituteProfile?.registrationId
  } : null
});

// Helper function to map proof for review
const mapProofForReview = (proof) => ({
  id: proof._id,
  moduleTitle: proof.moduleTitle,
  status: proof.status,
  submittedAt: proof.submittedAt,
  reviewedAt: proof.reviewedAt,
  reviewComments: proof.reviewComments,
  learner: proof.learner ? {
    id: proof.learner._id,
    name: proof.learner.name,
    email: proof.learner.email,
    learnerId: proof.learner.learnerProfile?.learnerId
  } : null,
  course: proof.course ? {
    id: proof.course._id,
    title: proof.course.title,
    modules: proof.course.modules
  } : null,
  reviewedBy: proof.reviewedBy ? {
    id: proof.reviewedBy._id,
    name: proof.reviewedBy.name
  } : null
});

// @desc    Get all certificates issued by the institution
// @route   GET /api/institution/certificates
// @access  Private (Institution)
router.get('/certificates', auth('institute'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { institute: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      const learners = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'learnerProfile.studentId': { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      query.learner = { $in: learners.map(l => l._id) };
    }
    
    const certificates = await Certificate.find(query)
      .populate('learner', 'name email')
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Certificate.countDocuments(query);
    
    res.json({
      success: true,
      count: certificates.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      data: certificates.map(mapCertificate)
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching certificates' 
    });
  }
});

// @desc    Issue a new certificate
// @route   POST /api/institution/certificates
// @access  Private (Institution)
router.post('/certificates', 
  auth('institute'), 
  async (req, res) => {
    try {
      const institute = await User.findById(req.user.id);
      if (!institute) {
        return res.status(404).json({ 
          success: false, 
          message: 'Institution not found' 
        });
      }
      
      const { 
        learnerId, 
        courseId, 
        studentUniqueCode, 
        modulesAwarded, 
        validUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType
      } = req.body;
      
      // Check if learner exists
      const learner = await User.findOne({ 
        _id: learnerId, 
        role: 'learner' 
      });
      
      if (!learner) {
        return res.status(404).json({ 
          success: false, 
          message: 'Learner not found' 
        });
      }
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ 
          success: false, 
          message: 'Course not found' 
        });
      }
      
      // Check if certificate already exists for this learner and course
      const existingCert = await Certificate.findOne({
        learner: learnerId,
        course: courseId,
        status: { $ne: 'Revoked' }
      });
      
      if (existingCert) {
        return res.status(400).json({
          success: false,
          message: 'A certificate already exists for this learner and course'
        });
      }
      
      // Create certificate data
      const certificateData = {
        certificateId: `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentUniqueCode,
        learner: learnerId,
        institute: req.user.id,
        course: courseId,
        modulesAwarded,
        validUntil: new Date(validUntil),
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType: ncvqQualificationType || 'National Certificate',
        status: 'Issued'
      };
      
      // Create certificate using the service
      const result = await certificateService.issueCertificate(certificateData);
      
      res.status(201).json({
        success: true,
        data: mapCertificate(result.certificate),
        message: 'Certificate issued successfully'
      });
      
    } catch (error) {
      console.error('Error issuing certificate:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while issuing certificate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Upload and process batch certificates
// @route   POST /api/institution/certificates/batch
// @access  Private (Institution)
router.post('/certificates/batch', 
  auth('institute'), 
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please upload a file' 
        });
      }
      
      const fileContent = req.file.buffer.toString();
      const certificates = [];
      
      // Parse CSV or JSON based on file type
      if (req.file.mimetype === 'text/csv') {
        // Parse CSV
        const results = [];
        const parser = csv();
        
        await new Promise((resolve, reject) => {
          parser.on('data', (data) => results.push(data));
          parser.on('end', resolve);
          parser.on('error', reject);
          parser.write(fileContent);
          parser.end();
        });
        
        // Map CSV results to certificate data
        for (const row of results) {
          certificates.push({
            studentUniqueCode: row.studentUniqueCode || row.student_uniquecode || row.studentId || row.student_ur,
            learnerEmail: row.learnerEmail || row.email || row.student_name,
            learnerName: row.student_name || row.learnerName,
            learnerId: row.learnerId,
            courseId: row.courseId,
            courseName: row.courseName || row.course_name || row.course_na,
            instituteName: row.instituteName || row.institute_name || row.institute_n,
            courseLevel: row.courseLevel || row.course_level || row.course_lev,
            assessmentScore: row.assessmentScore || row.assessment || row.assessme,
            issueDate: row.issueDate || row.issue_date,
            ncvetBatchCode: row.ncvetBatchCode || row.ncvet_batch_code,
            modulesAwarded: row.modules ? row.modules.split('|').map(m => m.trim()) : [],
            validUntil: row.validUntil,
            ncvqLevel: row.ncvqLevel || row.course_level || row.course_lev,
            ncvqQualificationCode: row.qualificationCode || row.ncvqQualificationCode || row.ncvet_batch_code,
            ncvqQualificationTitle: row.qualificationTitle || row.ncvqQualificationTitle || row.courseName || row.course_name || row.course_na,
            ncvqQualificationType: row.qualificationType || row.ncvqQualificationType || 'National Certificate'
          });
        }
      } else if (req.file.mimetype === 'application/json') {
        // Parse JSON
        certificates.push(...JSON.parse(fileContent));
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid file format. Please upload a CSV or JSON file' 
        });
      }
      
      // Process and validate certificates, looking up learners and courses
      const processedCertificates = [];
      const errors = [];
      
      for (const cert of certificates) {
        try {
          // Find learner by email, partial email, name, or ID
          let learner;
          if (cert.learnerEmail) {
            // Try exact match first
            learner = await User.findOne({ email: cert.learnerEmail, role: 'learner' });
            
            // Try partial match if exact fails
            if (!learner) {
              learner = await User.findOne({ 
                email: { $regex: cert.learnerEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
                role: 'learner' 
              });
            }
            
            // Try name match if email fails
            if (!learner && cert.learnerName) {
              learner = await User.findOne({ 
                name: { $regex: cert.learnerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
                role: 'learner' 
              });
            }
          } else if (cert.learnerId) {
            learner = await User.findOne({ _id: cert.learnerId, role: 'learner' });
          }
          
          if (!learner) {
            errors.push({
              studentUniqueCode: cert.studentUniqueCode,
              error: `Learner not found: ${cert.learnerEmail || cert.learnerName || cert.learnerId || 'No identifier'}`
            });
            continue;
          }
          
          // Find course by ID, exact name, or partial name
          let course;
          if (cert.courseId) {
            course = await Course.findById(cert.courseId);
          } else if (cert.courseName) {
            // Try exact match first
            course = await Course.findOne({ title: cert.courseName, institute: req.user.id });
            
            // Try partial match if exact fails
            if (!course) {
              course = await Course.findOne({ 
                title: { $regex: cert.courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
                institute: req.user.id 
              });
            }
            
            // Try without institute filter if still not found
            if (!course) {
              course = await Course.findOne({ 
                title: { $regex: cert.courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
              });
            }
          }
          
          if (!course) {
            errors.push({
              studentUniqueCode: cert.studentUniqueCode,
              error: `Course not found: ${cert.courseId || cert.courseName || 'No course specified'}`
            });
            continue;
          }
          
          processedCertificates.push({
            studentUniqueCode: cert.studentUniqueCode,
            learner: learner._id,
            course: course._id,
            modulesAwarded: cert.modulesAwarded || [],
            validUntil: cert.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            ncvqLevel: cert.ncvqLevel || cert.courseLevel,
            ncvqQualificationCode: cert.ncvqQualificationCode,
            ncvqQualificationTitle: cert.ncvqQualificationTitle,
            ncvqQualificationType: cert.ncvqQualificationType
          });
        } catch (err) {
          errors.push({
            studentUniqueCode: cert.studentUniqueCode,
            error: err.message
          });
        }
      }
      
      if (processedCertificates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid certificates to process',
          errors
        });
      }
      
      // Process batch certificates
      const result = await certificateService.issueBatchCertificates({
        instituteId: req.user.id,
        certificates: processedCertificates
      });
      
      res.status(201).json({
        success: true,
        data: {
          total: certificates.length,
          successCount: result.successCount,
          failedCount: result.failedCount + errors.length,
          batchId: result.certificates[0]?.batchId,
          results: result.certificates.map(mapCertificate),
          errors: [...errors, ...result.errors]
        },
        message: `Successfully processed ${result.successCount} out of ${certificates.length} certificates`
      });
      
    } catch (error) {
      console.error('Error processing batch certificates:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing batch certificates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Revoke a certificate
// @route   PUT /api/institution/certificates/:id/revoke
// @access  Private (Institution)
router.put('/certificates/:id/revoke', 
  auth('institute'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a reason for revocation' 
        });
      }
      
      const certificate = await Certificate.findOne({
        _id: id,
        institute: req.user.id
      });
      
      if (!certificate) {
        return res.status(404).json({ 
          success: false, 
          message: 'Certificate not found or you are not authorized' 
        });
      }
      
      if (certificate.status === 'Revoked') {
        return res.status(400).json({ 
          success: false, 
          message: 'Certificate is already revoked' 
        });
      }
      
      // Revoke certificate using the service
      const result = await certificateService.revokeCertificate(id, reason);
      
      res.json({
        success: true,
        data: mapCertificate(result.certificate),
        message: 'Certificate revoked successfully'
      });
      
    } catch (error) {
      console.error('Error revoking certificate:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while revoking certificate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Verify a certificate
// @route   GET /api/institution/certificates/verify/:id
// @access  Public
router.get('/certificates/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify certificate using the service
    const result = await certificateService.verifyCertificate(id);
    
    res.json({
      success: true,
      data: {
        isValid: result.isValid,
        status: result.status,
        message: result.message,
        certificate: result.certificate ? mapCertificate(result.certificate) : null,
        blockchain: result.blockchain
      }
    });
    
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get certificate by ID
// @route   GET /api/institution/certificates/:id
// @access  Private (Institution)
router.get('/certificates/:id', 
  auth('institute'),
  async (req, res) => {
    try {
      const certificate = await Certificate.findOne({
        _id: req.params.id,
        institute: req.user.id
      })
      .populate('learner', 'name email')
      .populate('course', 'name code');
      
      if (!certificate) {
        return res.status(404).json({ 
          success: false, 
          message: 'Certificate not found or you are not authorized' 
        });
      }
      
      res.json({
        success: true,
        data: mapCertificate(certificate)
      });
      
    } catch (error) {
      console.error('Error fetching certificate:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while fetching certificate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Download certificate PDF
// @route   GET /api/institution/certificates/:id/download
// @access  Private (Institution)
router.get('/certificates/:id/download', 
  auth('institute'),
  async (req, res) => {
    try {
      const certificate = await Certificate.findOne({
        _id: req.params.id,
        institute: req.user.id
      });
      
      if (!certificate || !certificate.pdfPath) {
        return res.status(404).json({ 
          success: false, 
          message: 'Certificate not found or PDF not available' 
        });
      }
      
      const filePath = path.join(__dirname, '..', certificate.pdfPath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          success: false, 
          message: 'Certificate file not found' 
        });
      }
      
      const fileName = `certificate-${certificate.certificateId}.pdf`;
      
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({ 
            success: false, 
            message: 'Error downloading certificate' 
          });
        }
      });
      
    } catch (error) {
      console.error('Error downloading certificate:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while downloading certificate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Download certificate proof JSON
// @route   GET /api/institution/certificates/:id/proof
// @access  Private (Institution)
router.get('/certificates/:id/proof',
  auth('institute'),
  async (req, res) => {
    try {
      const certificate = await Certificate.findOne({ _id: req.params.id, institute: req.user.id });
      if (!certificate || !certificate.proofPath) {
        return res.status(404).json({ success: false, message: 'Proof not found' });
      }

      const filePath = path.join(__dirname, '..', certificate.proofPath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Proof file not found on server' });
      }

      res.download(filePath, `proof-${certificate.certificateId}.json`, (err) => {
        if (err) {
          console.error('Error downloading proof file:', err);
          res.status(500).json({ success: false, message: 'Error downloading proof' });
        }
      });
    } catch (err) {
      console.error('Error fetching proof:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;

// Issue certificate (Institution only)
router.post('/upload', auth('institute'), upload.single('certificateFile'), async (req, res) => {
  try {
    const institute = await User.findById(req.user.id);
    if (!institute) return res.status(404).json({ message: 'Institution not found.' });

    const {
      learnerEmail,
      learnerId,
      name,
      courseName,
      validUntil,
      courseId,
      platform,
    } = req.body;

    const skillsInput = req.body.skillsAcquired;
    const normalizedSkills = Array.isArray(skillsInput)
      ? skillsInput.map((skill) => skill.trim()).filter(Boolean)
      : typeof skillsInput === 'string'
        ? skillsInput
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];

    if (!learnerEmail && !learnerId) {
      return res.status(400).json({ message: 'Learner email or learner ID is required.' });
    }
    if (!courseName && !courseId) {
      return res.status(400).json({ message: 'Course name or course ID is required.' });
    }

    let learner = null;

    if (learnerId) {
      learner = await User.findOne({ 'learnerProfile.learnerId': learnerId.toString().trim() });
    }
    if (!learner && learnerEmail) {
      learner = await User.findOne({ email: learnerEmail.toLowerCase().trim() });
    }

    let learnerNeedsSave = false;

    if (!learner) {
      const generatedLearnerId = learnerId || `L-${uuidv4()}`;
      const generatedPassword = uuidv4();
      const hashed = await bcrypt.hash(generatedPassword, 10);

      learner = new User({
        name: name || learnerEmail || generatedLearnerId,
        email: learnerEmail?.toLowerCase().trim() || `${generatedLearnerId}@example.com`,
        password: hashed,
        role: 'learner',
        learnerProfile: {
          learnerId: generatedLearnerId,
        },
      });
      await learner.save();
    } else {
      if (name && !learner.name) {
        learner.name = name;
        learnerNeedsSave = true;
      }
    }

    // Note: course assignment to learner will be handled after course is resolved below

    if (learnerNeedsSave) {
      await learner.save();
    }

    let course = null;
    if (courseId) {
      course = await Course.findById(courseId);
    }

    if (!course) {
      const title = (courseName || '').trim();
      if (!title) {
        return res.status(400).json({ message: 'Course title is required.' });
      }
      const modules = normalizedSkills.length > 0 ? normalizedSkills : [title];
      course = await Course.findOneAndUpdate(
        { title },
        { title, modules, platform: platform || 'Custom', $setOnInsert: { createdBy: institute._id } },
        { new: true, upsert: true }
      );
    }

    if (course && (!Array.isArray(course.assignedInstitutes) || !course.assignedInstitutes.some((id) => id.toString() === institute._id.toString()))) {
      course.assignedInstitutes = Array.isArray(course.assignedInstitutes) ? course.assignedInstitutes : [];
      course.assignedInstitutes.push(institute._id);
      await course.save();
    }

    // Ensure learner is assigned to the resolved course
    if (course) {
      const learnerCourses = learner.learnerProfile?.courses || [];
      const hasCourse = learnerCourses.some((id) => id.toString() === course._id.toString());
      if (!hasCourse) {
        learner.learnerProfile = learner.learnerProfile || {};
        learner.learnerProfile.courses = [...learnerCourses, course._id];
        await learner.save();
      }
    }

    const certificateId = uuidv4();
    const certificate = new Certificate({
      certificateId,
      learner: learner._id,
      institute: institute._id,
      course: course._id,
      modulesAwarded: normalizedSkills,
      issueDate: new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    const artifactFile = req.file;
    let artifactBuffer;
    let artifactAbsolutePath;
    let artifactFilename = `${certificate.certificateId}.pdf`;

    if (artifactFile) {
      artifactBuffer = artifactFile.buffer;
      const ext = path.extname(artifactFile.originalname || '').toLowerCase();
      if (ext) {
        artifactFilename = `${certificate.certificateId}${ext}`;
      }
      artifactAbsolutePath = path.join(certificateUploadsDir, artifactFilename);
      fs.writeFileSync(artifactAbsolutePath, artifactBuffer);
    } else {
      artifactAbsolutePath = await generatePlaceholderPdf({ certificate, learner, institute, course });
      artifactBuffer = fs.readFileSync(artifactAbsolutePath);
      const placeholderExt = path.extname(artifactAbsolutePath) || '.txt';
      artifactFilename = `${certificate.certificateId}${placeholderExt}`;
    }

    certificate.pdfPath = path.relative(path.join(__dirname, '..'), artifactAbsolutePath).replace(/\\/g, '/');

    const artifactHash = crypto.createHash('sha256').update(artifactBuffer).digest('hex');
    certificate.artifactHash = artifactHash;

    const metadata = buildMetadataHash({ certificate, learner, institute, course });
    certificate.metadataHash = metadata.hash;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    certificate.qrCodeData = `${frontendUrl}/verify/${certificate.certificateId}`;

    // Create anchored proof (LegitDoc style): compute sha256, sign it and write only the hash on-chain.
    try {
      // Optionally upload to IPFS (keep for storage), but anchor the sha256 hash on-chain
      let cid;
      try {
        cid = await uploadBuffer(artifactBuffer, artifactFilename);
        certificate.ipfsCid = cid;
      } catch (e) {
        console.warn('IPFS upload failed, continuing with on-chain anchoring only', e.message || e);
      }

      const anchorKey = `sha256:${artifactHash}`;

      // Use learner's learnerId as DID if available, else fallback to learner._id
      const learnerDid = learner.learnerProfile?.learnerId ? `did:moducert:${learner.learnerProfile.learnerId}` : `did:moducert:${learner._id}`;
      const issuerId = institute.instituteProfile?.registrationId || institute._id.toString();

      // Create a cryptographic signature over the anchor key using configured issuer private key
      const { signHash } = require('../utils/blockchainService');
      let signatureInfo = null;
      try {
        signatureInfo = await signHash(anchorKey);
      } catch (e) {
        console.warn('Signing hash failed:', e.message || e);
      }

      // Anchor the anchorKey on-chain (store only the anchorKey string)
      try {
        const receipt = await issueCredential(anchorKey, learnerDid, issuerId);
        if (receipt && receipt.transactionHash) {
          certificate.blockchainTxHash = receipt.transactionHash;
        }

        // Build proof JSON and save alongside certificate
        const proof = {
          anchor: anchorKey,
          artifactHash,
          ipfsCid: cid || null,
          issuerId,
          issuerAddress: signatureInfo ? signatureInfo.address : null,
          signature: signatureInfo ? signatureInfo.signature : null,
          txHash: certificate.blockchainTxHash || null,
          contractAddress: (process.env.CONTRACT_ADDRESS || null),
          issuedAt: new Date().toISOString()
        };

        const proofPath = path.join(certificateUploadsDir, `${certificate.certificateId}-proof.json`);
        fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
        certificate.proofPath = path.relative(path.join(__dirname, '..'), proofPath).replace(/\\/g, '/');
      } catch (e) {
        console.error('On-chain anchoring failed', e);
      }
    } catch (e) {
      console.error('IPFS / blockchain anchoring failed', e);
      // Continue — certificate is still created locally; surface warning to client
    }

    await certificate.save();

    const populated = await Certificate.findById(certificate._id)
      .populate('learner', 'name email learnerProfile')
      .populate('course', 'title platform modules');

    res.status(201).json({ message: 'Certificate created', certificate: mapCertificate(populated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Certificates issued by the institution
router.get('/certificates', auth('institute'), async (req, res) => {
  try {
    const certificates = await Certificate.find({ institute: req.user.id })
      .populate('learner', 'name email learnerProfile')
      .populate('course', 'title platform modules')
      .sort({ issueDate: -1 });

    res.json({ certificates: certificates.map(mapCertificate) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Proof review queue
router.get('/proofs', auth('institute'), async (req, res) => {
  try {
    const status = (req.query.status || 'Pending').trim();
    const filters = { institute: req.user.id };
    if (status !== 'All') {
      filters.status = status;
    }

    const proofs = await ModuleProof.find(filters)
      .populate('learner', 'name email learnerProfile')
      .populate('course', 'title modules')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ proofs: proofs.map(mapProofForReview) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update proof status
router.patch('/proofs/:proofId', auth('institute'), async (req, res) => {
  try {
    const { proofId } = req.params;
    const { status, notes } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status supplied.' });
    }

    const proof = await ModuleProof.findOne({ _id: proofId, institute: req.user.id });
    if (!proof) {
      return res.status(404).json({ message: 'Proof not found for this institution.' });
    }

    proof.status = status;
    proof.notes = notes || proof.notes;
    proof.reviewedBy = req.user.id;
    proof.reviewedAt = new Date();
    await proof.save();

    const populated = await ModuleProof.findById(proof._id)
      .populate('learner', 'name email learnerProfile')
      .populate('course', 'title modules')
      .populate('reviewedBy', 'name');

    res.json({ message: 'Proof updated', proof: mapProofForReview(populated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Handle Multer errors for this router
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, next) => {
  if (err && (err instanceof multer.MulterError || err.message === 'Certificate artifact must be a PDF file.')) {
    return res.status(400).json({ message: err.message });
  }
  return next(err);
});

module.exports = router;
