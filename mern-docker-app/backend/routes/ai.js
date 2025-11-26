const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/recommendations', auth('learner'), (req, res) => {
  // Hardcoded stub
  res.json({ recommendations: [
    { title: 'Full-Stack Developer', skills: ['JavaScript','React','Node.js'] },
    { title: 'Data Analyst', skills: ['Python','SQL','Excel'] }
  ]});
});

router.get('/trends', auth(['institute']), (req, res) => {
  res.json({ trends: [
    { skill: 'React', demand: 'High' },
    { skill: 'Node.js', demand: 'High' },
    { skill: 'AI/ML', demand: 'Growing' }
  ]});
});

module.exports = router;
