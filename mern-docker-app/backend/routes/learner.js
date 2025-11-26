const express = require('express');
const auth = require('../middleware/auth');
const Learner = require('../models/Learner');
const Certificate = require('../models/Certificate');

const router = express.Router();

// Learner profile
router.get('/profile', auth('Learner'), async (req, res) => {
  try {
    const learner = await Learner.findById(req.user.id).select('-password');
    if (!learner) return res.status(404).json({ message: 'Learner not found' });
    res.json({ learner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Learner certificates
router.get('/certificates', auth('Learner'), async (req, res) => {
  try {
    const certs = await Certificate.find({ learner: req.user.id }).populate('institution');
    res.json({ certificates: certs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
