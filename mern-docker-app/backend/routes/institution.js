const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const auth = require('../middleware/auth');
const Institution = require('../models/Institution');
const Learner = require('../models/Learner');
const Certificate = require('../models/Certificate');

const router = express.Router();

// Upload a single certificate (Institution only)
router.post('/upload', auth('Institution'), async (req, res) => {
  try {
    const instId = req.user.id;
    const inst = await Institution.findById(instId);
    if (!inst) return res.status(404).json({ message: 'Institution not found' });

    const { learnerEmail, learnerId, firstName, lastName, courseName, skillsAcquired, validUntil } = req.body;

    // Find or create learner
    let learner = null;
    if (learnerId) learner = await Learner.findOne({ learnerId });
    if (!learner && learnerEmail) learner = await Learner.findOne({ email: learnerEmail });
    if (!learner) {
      const generatedLearnerId = learnerId || `L-${uuidv4()}`;
      const tempPassword = 'changeme123';
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(tempPassword, 10);
      learner = new Learner({ firstName, lastName, email: learnerEmail || `${generatedLearnerId}@example.com`, password: hashed, learnerId: generatedLearnerId });
      await learner.save();
    }

    const uniqueId = uuidv4();
    const issueDate = new Date();
    const core = { uniqueId, learnerId: learner.learnerId, institutionId: inst.regId || inst._id.toString(), courseName, issueDate: issueDate.toISOString() };
    const hash = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrCodeData = `${frontendUrl}/verify/${uniqueId}`;

    const cert = new Certificate({ uniqueId, learner: learner._id, institution: inst._id, courseName, skillsAcquired, issueDate, validUntil, qrCodeData, metadataHash: hash });
    await cert.save();
    res.json({ message: 'Certificate created', certificate: cert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get certificates issued by the institution
router.get('/certificates', auth('Institution'), async (req, res) => {
  try {
    const instId = req.user.id;
    const certs = await Certificate.find({ institution: instId }).populate('learner institution');
    res.json({ certificates: certs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
