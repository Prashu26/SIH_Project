const express = require('express');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Learner = require('../models/Learner');
const Institution = require('../models/Institution');

const router = express.Router();

// Public verification endpoint
router.get('/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const cert = await Certificate.findOne({ uniqueId }).populate('learner institution');
    if (!cert) return res.status(404).json({ status: 'NotFound', message: 'Certificate not found' });

    const core = { uniqueId: cert.uniqueId, learnerId: cert.learner.learnerId, institutionId: cert.institution.regId || cert.institution._id.toString(), courseName: cert.courseName, issueDate: cert.issueDate.toISOString() };
    const hash = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
    if (hash !== cert.metadataHash) {
      return res.status(400).json({ status: 'Tampered', message: 'Certificate metadata hash mismatch' });
    }
    return res.json({ status: 'Authentic', certificate: cert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
