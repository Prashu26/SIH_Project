const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const ModuleProof = require('../models/ModuleProof');
const Certificate = require('../models/Certificate');
const { proofUploadsDir } = require('../utils/storage');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, proofUploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname || '.png')}`);
  },
});

const upload = multer({ storage });

const mapLearnerProfile = (learnerDoc) => ({
  id: learnerDoc._id,
  name: learnerDoc.name,
  email: learnerDoc.email,
  role: learnerDoc.role,
  learnerId: learnerDoc.learnerProfile?.learnerId || null,
  courses: Array.isArray(learnerDoc.learnerProfile?.courses)
    ? learnerDoc.learnerProfile.courses.map((course) => ({
        id: course?._id || course,
        title: course?.title,
        platform: course?.platform,
        modules: Array.isArray(course?.modules) ? course.modules : [],
      }))
    : [],
  createdAt: learnerDoc.createdAt,
  updatedAt: learnerDoc.updatedAt,
});

const mapProof = (proof) => ({
  id: proof._id,
  moduleTitle: proof.moduleTitle,
  status: proof.status,
  notes: proof.notes,
  proofPath: proof.proofPath ? proof.proofPath.replace(/\\/g, '/') : null,
  course: proof.course
    ? {
        id: proof.course._id,
        title: proof.course.title,
      }
    : null,
  institute: proof.institute
    ? {
        id: proof.institute._id,
        name: proof.institute.name,
      }
    : null,
  reviewedBy: proof.reviewedBy
    ? {
        id: proof.reviewedBy._id,
        name: proof.reviewedBy.name,
      }
    : null,
  reviewedAt: proof.reviewedAt,
  createdAt: proof.createdAt,
  updatedAt: proof.updatedAt,
});

// Learner profile with proofs overview
router.get('/profile', auth('learner'), async (req, res) => {
  try {
    const learner = await User.findById(req.user.id)
      .populate('learnerProfile.courses', 'title platform modules')
      .lean();

    if (!learner) return res.status(404).json({ message: 'Learner not found' });

    const proofs = await ModuleProof.find({ learner: req.user.id })
      .populate('course', 'title')
      .populate('institute', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ learner: mapLearnerProfile(learner), proofs: proofs.map(mapProof) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Learner certificates
router.get('/certificates', auth('learner'), async (req, res) => {
  try {
    const certs = await Certificate.find({ learner: req.user.id })
      .populate('course', 'title platform')
      .populate('institute', 'name email instituteProfile.registrationId')
      .sort({ issueDate: -1 });

    const formatted = certs.map((cert) => ({
      id: cert._id,
      certificateId: cert.certificateId,
      courseName: cert.course?.title || 'Untitled course',
      modulesAwarded: cert.modulesAwarded,
      uniqueId: cert.certificateId,
      issueDate: cert.issueDate,
      status: cert.status,
      institute: cert.institute
        ? {
            name: cert.institute.name,
            email: cert.institute.email,
            registrationId: cert.institute.instituteProfile?.registrationId,
          }
        : null,
      pdfPath: cert.pdfPath,
      pdfArtifact: cert.storage?.artifacts?.pdf || null,
      metadataArtifact: cert.storage?.artifacts?.metadata || null,
      proofArtifact: cert.storage?.artifacts?.proof || null,
    }));

    res.json({ certificates: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Learner proof submissions
router.post('/proofs', auth('learner'), upload.single('proof'), async (req, res) => {
  try {
    const { courseId, moduleTitle, notes, instituteId } = req.body;

    if (!courseId || !moduleTitle) {
      return res.status(400).json({ message: 'Course ID and module title are required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const normalizedModule = moduleTitle.trim();
    const matchedModule = course.modules.find(
      (module) => module.trim().toLowerCase() === normalizedModule.toLowerCase()
    );

    if (!matchedModule) {
      return res.status(400).json({ message: 'Module title does not belong to the selected course.' });
    }

    let institute = null;
    if (instituteId) {
      institute = await User.findOne({ _id: instituteId, role: 'institute' });
      if (!institute) {
        return res.status(404).json({ message: 'Associated institute not found.' });
      }
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Proof file upload is required.' });
    }

    const proofPath = path.relative(path.join(__dirname, '..'), req.file.path);

    const proof = new ModuleProof({
      learner: req.user.id,
      institute: institute ? institute._id : undefined,
      course: course._id,
      moduleTitle: matchedModule,
      notes,
      proofPath,
    });

    await proof.save();

    const populated = await ModuleProof.findById(proof._id)
      .populate('course', 'title')
      .populate('institute', 'name')
      .populate('reviewedBy', 'name')
      .lean();

    res.status(201).json({ message: 'Proof submitted successfully.', proof: mapProof(populated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List learner proofs
router.get('/proofs', auth('learner'), async (req, res) => {
  try {
    const proofs = await ModuleProof.find({ learner: req.user.id })
      .populate('course', 'title')
      .populate('institute', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ proofs: proofs.map(mapProof) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
