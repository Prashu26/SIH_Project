const express = require('express');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const courses = await Course.find()
      .populate('institute', 'name email')
      .sort({ createdAt: -1 });
    res.json({ courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Allow learners to enroll in a course
router.post('/enroll', auth(['learner']), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const learner = await User.findById(req.user.id);
    if (!learner) {
      return res.status(404).json({ message: 'Learner not found' });
    }

    const existingCourseIds = learner.learnerProfile?.courses || [];
    const hasCourse = existingCourseIds.some((id) => id.toString() === course._id.toString());
    
    if (hasCourse) {
      return res.status(400).json({ message: 'Already enrolled in this course.' });
    }

    learner.learnerProfile = learner.learnerProfile || {};
    learner.learnerProfile.courses = [...existingCourseIds, course._id];
    await learner.save();

    res.json({ message: 'Successfully enrolled in course.', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/assign', auth(['institute', 'institution']), async (req, res) => {
  try {
    const { learnerId, courseId } = req.body;
    if (!learnerId || !courseId) {
      return res.status(400).json({ message: 'Learner ID and course ID are required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const learner = await User.findOne({ 'learnerProfile.learnerId': learnerId });
    if (!learner) {
      return res.status(404).json({ message: 'Learner not found' });
    }

    const existingCourseIds = learner.learnerProfile?.courses || [];
    const hasCourse = existingCourseIds.some((id) => id.toString() === course._id.toString());
    if (!hasCourse) {
      learner.learnerProfile = learner.learnerProfile || {};
      learner.learnerProfile.courses = [...existingCourseIds, course._id];
      await learner.save();
    }

    res.json({ message: 'Course assigned to learner.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
