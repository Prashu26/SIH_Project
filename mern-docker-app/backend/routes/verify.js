const express = require('express');
const crypto = require('crypto');
const multer = require('multer');

const Certificate = require('../models/Certificate');
const BlockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

/**
 * GET /api/verify/:certificateId
 * Verify a certificate by its ID using 3-step Merkle verification
 */
router.get('/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    console.log(`🔍 VERIFICATION REQUEST: ${certificateId}`);
    console.log('📊 Starting certificate lookup...');
    
    // Debug: Check what's in the database first
    const allCerts = await Certificate.find({}).select('certificateId').limit(5);
    console.log('📋 First 5 certificates in DB:', allCerts.map(c => c.certificateId));
    
    // Find certificate directly with Mongoose
    const certificate = await Certificate.findOne({ certificateId })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .populate('institute', 'name');
    
    console.log('🔍 Certificate found:', !!certificate);
    
    if (!certificate) {
      console.log('❌ Certificate not found in database');
      return res.status(404).json({
        success: false,
        status: 'Not Found',
        message: 'Certificate not found',
        debug: {
          searchedFor: certificateId,
          availableCertificates: allCerts.map(c => c.certificateId)
        }
      });
    }
    
    console.log(`✅ Found certificate: ${certificate.certificateId}`);
    console.log(`📊 Merkle Root: ${certificate.merkleRoot || 'null'}`);
    console.log(`🆔 Batch ID: ${certificate.batchId || 'null'}`);
    console.log(`🔐 Merkle Proof: ${certificate.merkleProof ? certificate.merkleProof.length + ' elements' : 'null'}`);
    
    // Check if certificate is anchored
    if (!certificate.merkleProof || certificate.merkleProof.length === 0 || !certificate.merkleRoot || !certificate.batchId) {
      console.log('⚠️ Certificate not anchored on blockchain');
      return res.status(202).json({
        success: false,
        status: 'Not Anchored',
        message: 'Certificate has been issued but not yet anchored on the blockchain. Blockchain anchoring is disabled in this deployment.',
        certificate: {
          certificateId: certificate.certificateId,
          learner: certificate.learner,
          course: certificate.course,
          institute: certificate.institute,
          issueDate: certificate.issueDate,
          validUntil: certificate.validUntil,
          status: certificate.status,
          ncvqLevel: certificate.ncvqLevel,
          ncvqQualificationTitle: certificate.ncvqQualificationTitle
        },
        blockchain: {
          verified: false,
          reason: 'Not anchored - blockchain features disabled',
          merkleRoot: certificate.merkleRoot || null,
          batchId: certificate.batchId || null,
          blockchainTxHash: certificate.blockchainTxHash || null
        }
      });
    }
    
    // If we get here, the certificate has blockchain anchoring
    console.log('🔗 Certificate has blockchain anchoring, attempting full verification...');
    
    try {
      const result = await BlockchainService.verifyCertificate(certificateId);
      
      const statusCode = result.isValid ? 200 : 400;
      
      return res.status(statusCode).json({
        success: result.isValid,
        status: result.status,
        message: result.message,
        certificate: {
          certificateId: result.certificate?.certificateId,
          learner: result.certificate?.learner,
          course: result.certificate?.course,
          institute: result.certificate?.institute,
          issueDate: result.certificate?.issueDate,
          validUntil: result.certificate?.validUntil,
          status: result.certificate?.status,
          ncvqLevel: result.certificate?.ncvqLevel,
          ncvqQualificationTitle: result.certificate?.ncvqQualificationTitle
        },
        blockchain: {
          verified: result.isValid,
          localVerification: result.localVerification,
          merkleRoot: result.certificate?.merkleRoot,
          batchId: result.certificate?.batchId,
          blockchainTxHash: result.blockchainTxHash,
          onChainRoot: result.onChainRoot
        }
      });
    } catch (blockchainError) {
      console.error('❌ Blockchain verification failed:', blockchainError.message);
      
      // Fallback: return certificate info even if blockchain verification fails
      return res.status(200).json({
        success: true,
        status: 'Issued',
        message: 'Certificate is valid (blockchain verification unavailable)',
        certificate: {
          certificateId: certificate.certificateId,
          learner: certificate.learner,
          course: certificate.course,
          institute: certificate.institute,
          issueDate: certificate.issueDate,
          validUntil: certificate.validUntil,
          status: certificate.status,
          ncvqLevel: certificate.ncvqLevel,
          ncvqQualificationTitle: certificate.ncvqQualificationTitle
        },
        blockchain: {
          verified: false,
          error: blockchainError.message,
          merkleRoot: certificate.merkleRoot,
          batchId: certificate.batchId,
          blockchainTxHash: certificate.blockchainTxHash
        }
      });
    }
  } catch (error) {
    console.error('❌ Certificate verification failed:', error);
    logger.error('Certificate verification failed:', error);
    return res.status(500).json({ 
      success: false, 
      status: 'Error',
      message: error.message || 'Verification failed'
    });
  }
});

/**
 * POST /api/verify/hash
 * Verify a certificate by its metadata hash
 */
router.post('/hash', async (req, res) => {
  try {
    const { metadataHash, merkleProof, merkleRoot, batchId } = req.body;
    
    if (!metadataHash) {
      return res.status(400).json({
        success: false,
        message: 'metadataHash is required'
      });
    }
    
    console.log(`🔍 Verification request for hash: ${metadataHash}`);
    
    // Find certificate by metadata hash
    const certificate = await Certificate.findOne({ metadataHash })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .populate('institute', 'name');
    
    if (!certificate) {
      // If proof provided, verify directly without database
      if (merkleProof && merkleRoot) {
        const localVerification = BlockchainService.verifyMerkleProof(
          merkleProof,
          metadataHash,
          merkleRoot
        );
        
        let onChainResult = null;
        if (batchId) {
          try {
            onChainResult = await BlockchainService.verifyOnChain(merkleProof, metadataHash, batchId);
          } catch (e) {
            console.warn('On-chain verification unavailable:', e.message);
          }
        }
        
        return res.json({
          success: localVerification && (onChainResult ? onChainResult.isValid : true),
          status: localVerification ? 'Valid' : 'Invalid',
          message: localVerification 
            ? 'Certificate hash is cryptographically valid'
            : 'Certificate verification failed',
          blockchain: {
            verified: localVerification && (onChainResult ? onChainResult.isValid : true),
            localVerification,
            onChainVerification: onChainResult?.isValid,
            merkleRoot,
            batchId
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        status: 'Not Found',
        message: 'Certificate not found in database'
      });
    }
    
    // Use certificate's stored proof
    const result = await BlockchainService.verifyCertificate(certificate.certificateId);
    
    return res.json({
      success: result.isValid,
      status: result.status,
      message: result.message,
      certificate: {
        certificateId: certificate.certificateId,
        learner: certificate.learner,
        course: certificate.course,
        institute: certificate.institute
      },
      blockchain: {
        verified: result.isValid,
        localVerification: result.localVerification,
        merkleRoot: certificate.merkleRoot,
        batchId: certificate.batchId,
        blockchainTxHash: certificate.blockchainTxHash
      }
    });
  } catch (error) {
    logger.error('Hash verification failed:', error);
    return res.status(500).json({
      success: false,
      status: 'Error',
      message: error.message || 'Verification failed'
    });
  }
});

/**
 * POST /api/verify/upload
 * Verify a certificate by uploading PDF/document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a certificate file' 
      });
    }

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const formattedHash = '0x' + fileHash;
    
    console.log(`🔍 Verification request for uploaded file (hash: ${formattedHash})`);

    // Find certificate by artifact hash (PDF hash)
    let certificate = await Certificate.findOne({ artifactHash: formattedHash })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .populate('institute', 'name');
    
    if (!certificate) {
      // Try metadata hash as fallback
      certificate = await Certificate.findOne({ metadataHash: formattedHash })
        .populate('learner', 'name email')
        .populate('course', 'title')
        .populate('institute', 'name');
    }

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        status: 'Not Found',
        message: 'No certificate matches the uploaded document',
        fileHash: formattedHash
      });
    }

    // Verify the certificate
    const result = await BlockchainService.verifyCertificate(certificate.certificateId);

    return res.json({
      success: result.isValid,
      status: result.status,
      message: result.message,
      certificate: {
        certificateId: certificate.certificateId,
        learner: certificate.learner,
        course: certificate.course,
        institute: certificate.institute,
        issueDate: certificate.issueDate,
        validUntil: certificate.validUntil,
        status: certificate.status
      },
      blockchain: {
        verified: result.isValid,
        localVerification: result.localVerification,
        merkleRoot: certificate.merkleRoot,
        batchId: certificate.batchId,
        blockchainTxHash: certificate.blockchainTxHash,
        onChainRoot: result.onChainRoot
      },
      fileHash: formattedHash
    });
  } catch (error) {
    logger.error('File verification failed:', error);
    return res.status(500).json({ 
      success: false, 
      status: 'Error',
      message: error.message || 'Verification failed' 
    });
  }
});

/**
 * GET /api/verify/batch/:batchId
 * Get all certificates in a batch
 */
router.get('/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const certificates = await Certificate.find({ batchId })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .populate('institute', 'name')
      .select('certificateId learner course institute issueDate status merkleRoot batchId blockchainTxHash');
    
    if (!certificates || certificates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No certificates found for this batch'
      });
    }
    
    // Get on-chain root for this batch
    let onChainRoot = null;
    try {
      const result = await BlockchainService.verifyOnChain([], certificates[0].metadataHash, batchId);
      onChainRoot = result.onChainRoot;
    } catch (e) {
      console.warn('Could not fetch on-chain root:', e.message);
    }
    
    return res.json({
      success: true,
      batchId,
      certificateCount: certificates.length,
      merkleRoot: certificates[0]?.merkleRoot,
      onChainRoot,
      blockchainTxHash: certificates[0]?.blockchainTxHash,
      certificates: certificates.map(cert => ({
        certificateId: cert.certificateId,
        learner: cert.learner,
        course: cert.course,
        institute: cert.institute,
        issueDate: cert.issueDate,
        status: cert.status
      }))
    });
  } catch (error) {
    logger.error('Batch lookup failed:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Batch lookup failed'
    });
  }
});

module.exports = router;
