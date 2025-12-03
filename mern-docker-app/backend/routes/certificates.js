const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const storageService = require('../services/storageService');

const router = express.Router();

async function loadCertificate(identifier) {
  let certificate = await Certificate.findOne({ certificateId: identifier });
  if (!certificate && mongoose.Types.ObjectId.isValid(identifier)) {
    certificate = await Certificate.findById(identifier);
  }
  return certificate;
}

async function streamArtifact(res, artifact, fallbackName) {
  if (!artifact || !artifact.fileId) {
    return false;
  }

  const file = await storageService.getFileStream(artifact.fileId);
  if (!file) {
    return false;
  }

  const filename = artifact.filename || file.info?.filename || fallbackName || 'artifact.bin';
  const contentType = artifact.contentType || file.info?.contentType || 'application/octet-stream';

  res.set('Content-Type', contentType);
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  if (typeof file.info?.length === 'number') {
    res.set('Content-Length', file.info.length);
  }

  return new Promise((resolve, reject) => {
    file.stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream artifact' });
      }
      res.destroy(err);
      reject(err);
    });

    file.stream.on('end', () => resolve(true));
    file.stream.pipe(res);
  });
}

router.get('/:certificateId/download', async (req, res) => {
  try {
    const certificate = await loadCertificate(req.params.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const streamed = await streamArtifact(res, certificate.storage?.artifacts?.pdf, `${certificate.certificateId}.pdf`);
    if (streamed) {
      return;
    }

    if (certificate.pdfPath) {
      const absolutePath = path.resolve(path.join(__dirname, '..', certificate.pdfPath));
      if (fs.existsSync(absolutePath)) {
        res.set('Content-Disposition', `attachment; filename="${certificate.certificateId}.pdf"`);
        return res.sendFile(absolutePath);
      }
    }

    return res.status(404).json({ message: 'Certificate PDF not available' });
  } catch (error) {
    console.error('Certificate download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to download certificate', error: error.message });
    }
  }
});

router.get('/:certificateId/artifacts/metadata', async (req, res) => {
  try {
    const certificate = await loadCertificate(req.params.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const streamed = await streamArtifact(res, certificate.storage?.artifacts?.metadata, `${certificate.certificateId}.json`);
    if (streamed) {
      return;
    }

    if (certificate.storage?.metadataDocument) {
      res.set('Content-Type', 'application/json');
      res.set('Cache-Control', 'no-store');
      return res.send(JSON.stringify(certificate.storage.metadataDocument, null, 2));
    }

    return res.status(404).json({ message: 'Certificate metadata not available' });
  } catch (error) {
    console.error('Certificate metadata error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to load metadata', error: error.message });
    }
  }
});

router.get('/:certificateId/artifacts/proof', async (req, res) => {
  try {
    const certificate = await loadCertificate(req.params.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const streamed = await streamArtifact(res, certificate.storage?.artifacts?.proof, `${certificate.certificateId}-proof.json`);
    if (streamed) {
      return;
    }

    if (certificate.proofPath) {
      const absolutePath = path.resolve(path.join(__dirname, '..', certificate.proofPath));
      if (fs.existsSync(absolutePath)) {
        res.set('Content-Type', 'application/json');
        res.set('Content-Disposition', `attachment; filename="${certificate.certificateId}-proof.json"`);
        return res.sendFile(absolutePath);
      }
    }

    if (certificate.merkleProof?.length) {
      return res.json({
        certificateId: certificate.certificateId,
        metadataHash: certificate.metadataHash,
        merkleRoot: certificate.merkleRoot,
        merkleProof: certificate.merkleProof,
        batchId: certificate.batchId,
        blockchainTxHash: certificate.blockchainTxHash
      });
    }

    return res.status(404).json({ message: 'Certificate proof not available' });
  } catch (error) {
    console.error('Certificate proof error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to load proof', error: error.message });
    }
  }
});

router.get('/:certificateId/canonical', async (req, res) => {
  try {
    const certificate = await loadCertificate(req.params.certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!certificate.storage?.canonical?.payload) {
      return res.status(404).json({ message: 'Canonical payload not available' });
    }

    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'no-store');
    res.json({
      hash: certificate.storage.canonical.hash,
      rawHash: certificate.storage.canonical.rawHash,
      payload: certificate.storage.canonical.payload
    });
  } catch (error) {
    console.error('Certificate canonical error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to load canonical payload', error: error.message });
    }
  }
});

module.exports = router;
