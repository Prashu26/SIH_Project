const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const ModuleProof = require('../models/ModuleProof');
const { generatePlaceholderPdf, buildMetadataHash } = require('../utils/certificateService');

const router = express.Router();

const mapCertificate = (cert) => ({
  id: cert._id,
  certificateId: cert.certificateId,
  uniqueId: cert.certificateId,
  courseName: cert.course?.title || cert.courseName || 'Untitled course',
  modulesAwarded: cert.modulesAwarded,
  issueDate: cert.issueDate,
  status: cert.status,
  learner: cert.learner
    ? {
        id: cert.learner._id,
        name: cert.learner.name,
        email: cert.learner.email,
        learnerId: cert.learner.learnerProfile?.learnerId,
      }
    : null,
});

const mapProofForReview = (proof) => ({
  id: proof._id,
  status: proof.status,
  moduleTitle: proof.moduleTitle,
  notes: proof.notes,
  proofPath: proof.proofPath ? proof.proofPath.replace(/\\/g, '/') : null,
  learner: proof.learner
    ? {
        id: proof.learner._id,
        name: proof.learner.name,
        email: proof.learner.email,
        learnerId: proof.learner.learnerProfile?.learnerId,
      }
    : null,
  course: proof.course
    ? {
        id: proof.course._id,
        title: proof.course.title,
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

// Issue certificate (Institution only)
router.post('/upload', auth('institute'), async (req, res) => {
  try {
    const institute = await User.findById(req.user.id);
    if (!institute) return res.status(404).json({ message: 'Institution not found.' });

    const { learnerEmail, learnerId, name, courseName, skillsAcquired = [], validUntil, courseId } = req.body;
    const normalizedSkills = Array.isArray(skillsAcquired)
      ? skillsAcquired.map((skill) => skill.trim()).filter(Boolean)
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

    if (course) {
      const learnerCourses = learner.learnerProfile?.courses || [];
      const hasCourse = learnerCourses.some((id) => id.toString() === course._id.toString());
      if (!hasCourse) {
        learner.learnerProfile = learner.learnerProfile || {};
        learner.learnerProfile.courses = [...learnerCourses, course._id];
        learnerNeedsSave = true;
      }
    }

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
        { title, modules, platform: req.body.platform || 'Custom', $setOnInsert: { createdBy: institute._id } },
        { new: true, upsert: true }
      );
    }

    if (course && (!Array.isArray(course.assignedInstitutes) || !course.assignedInstitutes.some((id) => id.toString() === institute._id.toString()))) {
      course.assignedInstitutes = Array.isArray(course.assignedInstitutes) ? course.assignedInstitutes : [];
      course.assignedInstitutes.push(institute._id);
      await course.save();
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

    const pdfPath = await generatePlaceholderPdf({ certificate, learner, institute, course });
    certificate.pdfPath = path.relative(path.join(__dirname, '..'), pdfPath).replace(/\\/g, '/');

    const metadata = buildMetadataHash({ certificate, learner, institute, course });
    certificate.metadataHash = metadata.hash;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    certificate.qrCodeData = `${frontendUrl}/verify/${certificate.certificateId}`;

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

module.exports = router;
