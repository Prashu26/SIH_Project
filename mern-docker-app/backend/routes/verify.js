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
