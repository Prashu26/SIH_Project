const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const ModuleProof = require('../models/ModuleProof');

const router = express.Router();

const sanitizeUser = (doc) => {
  if (!doc) return null;
  const json = doc.toJSON();
  delete json.password;
  return json;
};

router.get('/overview', auth('admin'), async (_req, res) => {
  try {
    const [userCount, courseCount, proofCount, certificateCount, recentProofs] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      ModuleProof.countDocuments(),
      Certificate.countDocuments(),
      ModuleProof.find()
        .populate('learner', 'name')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('moduleTitle status createdAt')
        .lean(),
    ]);

    res.json({
      stats: {
        users: userCount,
        courses: courseCount,
        proofs: proofCount,
        certificates: certificateCount,
      },
      recentProofs: recentProofs.map((proof) => ({
        id: proof._id,
        moduleTitle: proof.moduleTitle,
        status: proof.status,
        learner: proof.learner ? { id: proof.learner._id, name: proof.learner.name } : null,
        course: proof.course ? { id: proof.course._id, title: proof.course.title } : null,
        createdAt: proof.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', auth('admin'), async (req, res) => {
  try {
    const role = (req.query.role || '').toLowerCase();
    const filter = role && ['learner', 'institute', 'admin'].includes(role) ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users', auth('admin'), async (req, res) => {
  try {
    const { name, email, password, role, learnerId, registrationId } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required.' });
    }
    if (!['learner', 'institute', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role supplied.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    const hashed = await bcrypt.hash(password || uuidv4(), 10);
    const user = new User({ name, email: email.toLowerCase(), password: hashed, role });

    if (role === 'learner') {
      user.learnerProfile = {
        learnerId: learnerId || `L-${uuidv4()}`,
        courses: Array.isArray(req.body.courses) ? req.body.courses : [],
      };
    }

    if (role === 'institute') {
      user.instituteProfile = {
        registrationId: registrationId || `INST-${uuidv4()}`,
        verificationKey: uuidv4(),
      };
    }

    await user.save();

    res.status(201).json({ message: 'User created', user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:userId', auth('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };
    delete updates.password;

    if (updates.email) updates.email = updates.email.toLowerCase();

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:userId', auth('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/courses', auth('admin'), async (_req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/courses', auth('admin'), async (req, res) => {
  try {
    const { title, platform, modules, description } = req.body;
    if (!title || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ message: 'Title and at least one module are required.' });
    }

    const course = new Course({
      title: title.trim(),
      platform: platform?.trim(),
      modules: modules.map((module) => module.trim()).filter(Boolean),
      description: description?.trim(),
      createdBy: req.user.id,
    });

    await course.save();

    res.status(201).json({ message: 'Course created', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/courses/:courseId', auth('admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = { ...req.body };
    if (updates.modules) {
      updates.modules = Array.isArray(updates.modules)
        ? updates.modules.map((module) => module.trim()).filter(Boolean)
        : undefined;
    }
    const course = await Course.findByIdAndUpdate(courseId, updates, { new: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ message: 'Course updated', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/courses/:courseId', auth('admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    await Course.findByIdAndDelete(courseId);
    res.json({ message: 'Course removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
