const express = require('express');
const Certificate = require('../models/Certificate');
const { buildMetadataHash } = require('../utils/certificateService');

const router = express.Router();

const mapCertificate = (cert) => ({
  certificateId: cert.certificateId,
  status: cert.status,
  issueDate: cert.issueDate,
  validUntil: cert.validUntil,
  modulesAwarded: cert.modulesAwarded,
  pdfPath: cert.pdfPath,
  artifactHash: cert.artifactHash,
  ipfsCid: cert.ipfsCid,
  blockchainTxHash: cert.blockchainTxHash,
  merkleRoot: cert.merkleRoot,
  batchId: cert.batchId,
  merkleProof: cert.merkleProof,
  learner: cert.learner
    ? {
        name: cert.learner.name,
        email: cert.learner.email,
        learnerId: cert.learner.learnerProfile?.learnerId,
      }
    : null,
  institute: cert.institute
    ? {
        name: cert.institute.name,
        email: cert.institute.email,
        registrationId: cert.institute.instituteProfile?.registrationId,
      }
    : null,
  course: cert.course
    ? {
        title: cert.course.title,
        platform: cert.course.platform,
        modules: cert.course.modules,
      }
    : null,
  qrCodeData: cert.qrCodeData,
});

// Public verification endpoint
router.get('/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await Certificate.findOne({ certificateId })
      .populate('learner', 'name email learnerProfile')
      .populate('institute', 'name email instituteProfile')
      .populate('course', 'title platform modules');

    if (!cert) return res.status(404).json({ status: 'NotFound', message: 'Certificate not found' });

    const { hash } = buildMetadataHash({
      certificate: cert,
      learner: cert.learner,
      institute: cert.institute,
      course: cert.course,
    });

    if (hash !== cert.metadataHash) {
      return res.status(400).json({ status: 'Tampered', message: 'Certificate metadata hash mismatch' });
    }

    return res.json({ status: 'Authentic', certificate: mapCertificate(cert) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// Accept uploaded PDF and verify against on-chain anchor
const multer = require('multer');
const crypto = require('crypto');
const { verifyCredential } = require('../utils/blockchainService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/verify/upload - upload PDF to verify
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file' });
    const buffer = req.file.buffer;
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const anchorKey = `sha256:${hash}`;

    // Query blockchain for this anchor
    try {
      const chainData = await verifyCredential(anchorKey);
      if (!chainData.exists) {
        return res.json({ success: true, verified: false, message: 'No anchor found on-chain for this document', anchor: anchorKey });
      }

      return res.json({ success: true, verified: true, anchor: anchorKey, blockchain: chainData });
    } catch (e) {
      console.error('Blockchain verification error:', e);
      return res.status(500).json({ success: false, message: 'Blockchain verification failed', error: e.message });
    }
  } catch (err) {
    console.error('Verification upload error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
