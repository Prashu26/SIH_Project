const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const Institution = require('../models/Institution');
const Learner = require('../models/Learner');

const router = express.Router();

// Register Learner or Institution
router.post('/register', async (req, res) => {
  try {
    const { role } = req.body;
    if (role === 'Institution') {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
      const existing = await Institution.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      const hashed = await bcrypt.hash(password, 10);
      const regId = uuidv4();
      const verificationKey = uuidv4();
      const inst = new Institution({ name, email, password: hashed, regId, verificationKey });
      await inst.save();
      return res.json({ message: 'Institution registered', id: inst._id });
    } else {
      // Learner
      const { firstName, lastName, email, password, learnerId } = req.body;
      if (!email || !password || !learnerId) return res.status(400).json({ message: 'Missing fields' });
      const existing = await Learner.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      const hashed = await bcrypt.hash(password, 10);
      const learner = new Learner({ firstName, lastName, email, password: hashed, learnerId });
      await learner.save();
      return res.json({ message: 'Learner registered', id: learner._id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login (Learner or Institution)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    // Try learner
    let user = await Learner.findOne({ email });
    let type = 'Learner';
    if (!user) {
      user = await Institution.findOne({ email });
      type = 'Institution';
    }
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    const payload = { id: user._id, role: user.role || type, email: user.email };
    const secret = process.env.JWT_SECRET || 'supersecret';
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    res.json({ token, role: payload.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
