const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
const auth = require('../middleware/auth');
const { upload, handleUploadErrors, cleanupTempFiles } = require('../utils/fileUpload');
const Document = require('../models/Document');
const BlockchainService = require('../services/blockchainService');

const router = express.Router();

// Issue / upload a document
router.post('/issue', auth(), upload.single('file'), handleUploadErrors, cleanupTempFiles, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const title = req.body.title || req.file.originalname || 'Document';
    const ownerEmail = req.body.ownerEmail || req.user?.email || null;

    // compute sha256 (hex)
    const fileBuffer = fs.readFileSync(req.file.path);
    const hashHex = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const hash = '0x' + hashHex;

    // create signature using server private key if available
    let signature = null;
    try {
      const bc = new BlockchainService();
      if (bc.wallet) {
        // sign the raw hex (without 0x) as bytes
        signature = await bc.wallet.signMessage(Buffer.from(hashHex, 'hex'));
      }
    } catch (e) {
      console.warn('Signature creation failed:', e.message || e);
    }

    const doc = await Document.create({
      title,
      issuer: req.user ? req.user.id : null,
      ownerEmail,
      storagePath: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileMime: req.file.mimetype,
      fileSize: req.file.size,
      sha256: hash,
      signature,
      meta: req.body.meta ? JSON.parse(req.body.meta) : {}
    });

    // Anchoring is handled by background AnchoringService (batching).
    // The document will be picked up and anchored by the service shortly.

    return res.json({ success: true, id: doc._id, hash, signature, storagePath: doc.storagePath, anchoredTx: doc.anchoredTx });
  } catch (err) {
    console.error('Document upload error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get document metadata
router.get('/:id', auth(), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, document: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download/stream file
router.get('/:id/file', auth(), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    const filePath = path.join(__dirname, '..', doc.storagePath || '');
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found' });
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List documents for logged in user
router.get('/', auth(), async (req, res) => {
  try {
    const email = req.user?.email;
    const docs = await Document.find({ $or: [{ ownerEmail: email }, { issuer: req.user?.id }] }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, documents: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify document: recompute hash, compare, and verify signature
router.post('/:id/verify', auth(), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    const filePath = path.join(__dirname, '..', doc.storagePath || '');
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found' });
    const fileBuffer = fs.readFileSync(filePath);
    const hashHex = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const hash = '0x' + hashHex;

    const result = { hashMatches: hash === (doc.sha256 || '').toLowerCase(), storedHash: doc.sha256, computedHash: hash };

    // verify signature if present
    if (doc.signature) {
      try {
        // recover address from signature over raw bytes
        const recovered = ethers.verifyMessage(Buffer.from(hashHex, 'hex'), doc.signature);
        const bc = new BlockchainService();
        const signerAddress = bc.wallet ? bc.wallet.address : null;
        result.signature = { present: true, recovered, signerAddress, valid: signerAddress ? recovered.toLowerCase() === signerAddress.toLowerCase() : null };
      } catch (e) {
        result.signature = { present: true, error: e.message };
      }
    } else {
      result.signature = { present: false };
    }

    return res.json({ success: true, verification: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke document (only issuer or admin)
router.post('/:id/revoke', auth(), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    const isIssuer = req.user && doc.issuer && (req.user.id === String(doc.issuer) || (req.user.role || '').toLowerCase() === 'admin');
    if (!isIssuer) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Optionally call on-chain revoke if contract available
    try {
      const bc = new BlockchainService();
      if (bc.contract && doc.sha256) {
        await bc.contract.revokeCertificate(doc.sha256);
      }
    } catch (err) {
      console.warn('On-chain revoke failed (non-fatal):', err.message || err);
    }

    doc.revoked = true;
    doc.revokedAt = new Date();
    await doc.save();

    res.json({ success: true, revoked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

// Anchoring admin endpoints
// NOTE: these endpoints are mounted under /api/documents/anchoring/*
router.get('/anchoring/status', auth(), async (req, res) => {
  try {
    if ((req.user.role || '').toLowerCase() !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const unanchored = await Document.countDocuments({ $or: [{ batchId: { $in: [null, undefined, ''] } }, { anchoredTx: { $in: [null, undefined, ''] } }], revoked: { $ne: true } });
    const lastAnchored = await Document.findOne({ anchoredTx: { $exists: true, $ne: null } }).sort({ updatedAt: -1 }).lean();
    const anchoringService = req.app && req.app.locals ? req.app.locals.anchoringService : null;
    const running = anchoringService ? !!anchoringService.running : false;
    res.json({ success: true, stats: { unanchored, lastAnchored: lastAnchored ? { id: lastAnchored._id, batchId: lastAnchored.batchId, anchoredTx: lastAnchored.anchoredTx, merkleRoot: lastAnchored.merkleRoot, updatedAt: lastAnchored.updatedAt } : null, serviceRunning: running } });
  } catch (err) {
    console.error('Anchoring status error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/anchoring/trigger', auth(), async (req, res) => {
  try {
    if ((req.user.role || '').toLowerCase() !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const anchoringService = req.app && req.app.locals ? req.app.locals.anchoringService : null;
    if (!anchoringService) return res.status(500).json({ success: false, error: 'Anchoring service not available' });
    await anchoringService.runOnce();
    res.json({ success: true, triggered: true });
  } catch (err) {
    console.error('Anchoring trigger error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
