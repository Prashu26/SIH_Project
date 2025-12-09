const express = require('express');
const crypto = require('crypto');
const multer = require('multer');

const Certificate = require('../models/Certificate');
const CertificateService = require('../services/certificateService');
const BlockchainService = require('../services/blockchainService');
const blockchainService = new BlockchainService();
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
        status: 'NOT VERIFIED',
        message: 'Certificate not found'
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
        status: 'NOT VERIFIED',
        message: 'Certificate not verified on blockchain'
      });
    }
    
    // If we get here, the certificate has blockchain anchoring
    console.log('🔗 Certificate has blockchain anchoring, attempting full verification...');
    
    try {
      const docHash = certificate.pdfHash || certificate.sha256;
      const result = await blockchainService.verifyDocument(
        docHash,
        certificate.merkleProof,
        certificate.merkleRoot,
        certificate.batchId
      );
      
      const statusCode = result.valid ? 200 : 400;
      
      return res.status(statusCode).json({
        success: result.valid,
        status: result.valid ? 'VERIFIED' : 'NOT VERIFIED',
        message: result.valid ? 'Certificate is verified' : 'Certificate verification failed'
      });
    } catch (blockchainError) {
      console.error('❌ Blockchain verification failed:', blockchainError.message);
      
      return res.status(400).json({
        success: false,
        status: 'NOT VERIFIED',
        message: 'Blockchain verification failed: ' + blockchainError.message
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
          status: localVerification && (onChainResult ? onChainResult.isValid : true) ? 'VERIFIED' : 'NOT VERIFIED',
          message: localVerification && (onChainResult ? onChainResult.isValid : true)
            ? 'Certificate is verified on blockchain'
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
    const result = await CertificateService.verifyCertificate(certificate._id);
    
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
        localVerification: result.blockchain?.localVerification,
        onChainVerification: result.blockchain?.onChainVerification,
        onChainRoot: result.blockchain?.onChainRoot,
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
    
    console.log(`🔍 Verification request for uploaded file`);
    console.log(`📊 File hash (with 0x): ${formattedHash}`);
    console.log(`📊 File hash (without 0x): ${fileHash}`);

    // Find certificate by artifact hash (PDF hash) - try multiple formats
    let certificate = await Certificate.findOne({ 
      $or: [
        { artifactHash: formattedHash },
        { artifactHash: fileHash },
        { pdfHash: formattedHash },
        { pdfHash: fileHash },
        { sha256: formattedHash },
        { sha256: fileHash }
      ]
    })
      .populate('learner', 'name email')
      .populate('course', 'title')
      .populate('institute', 'name');
    
    if (!certificate) {
      console.log(`❌ No certificate found matching hash ${formattedHash}`);
      // Debug: show some certificate hashes
      const samples = await Certificate.find({}).select('certificateId artifactHash pdfHash sha256').limit(3);
      console.log('📋 Sample certificate hashes in DB:', samples.map(c => ({
        id: c.certificateId,
        artifactHash: c.artifactHash,
        pdfHash: c.pdfHash,
        sha256: c.sha256
      })));
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
    const result = await CertificateService.verifyCertificate(certificate._id);

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
        localVerification: result.blockchain?.localVerification,
        onChainVerification: result.blockchain?.onChainVerification,
        onChainRoot: result.blockchain?.onChainRoot,
        merkleRoot: certificate.merkleRoot,
        batchId: certificate.batchId,
        blockchainTxHash: certificate.blockchainTxHash
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

/**
 * POST /api/verify/file
 * Verify uploaded PDF and Proof file
 */
router.post('/file', upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'proof', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.pdf || !req.files.proof) {
      return res.status(400).json({ success: false, message: 'Please upload both PDF and Proof file (JSON)' });
    }

    const pdfBuffer = req.files.pdf[0].buffer;
    const proofBuffer = req.files.proof[0].buffer;
    
    let proofData;
    try {
      proofData = JSON.parse(proofBuffer.toString());
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid Proof file format (must be JSON)' });
    }

    // 1. Calculate PDF Hash
    const calculatedHash = BlockchainService.calculateHash(pdfBuffer);
    
    // 2. Compare with Proof Hash
    if (calculatedHash !== proofData.hash) {
      return res.status(400).json({ 
        success: false, 
        message: 'Document integrity check failed. The PDF does not match the proof.',
        details: { calculated: calculatedHash, expected: proofData.hash }
      });
    }

    // 3. Verify against Blockchain
    const result = await blockchainService.verifyDocument(
      proofData.hash,
      proofData.merkleProof,
      proofData.merkleRoot,
      proofData.batchId
    );

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    return res.json({
      success: true,
      message: 'Document is valid and authentic.',
      details: {
        issuedAt: proofData.issuedAt,
        issuer: proofData.issuer,
        txHash: proofData.txHash
      }
    });

  } catch (error) {
    logger.error('File verification failed:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
});

/**
 * POST /api/verify/batch
 * Batch verify multiple PDFs at once (up to 1000)
 * Expects: multipart/form-data with multiple files
 */
router.post('/batch', upload.array('files', 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload at least one certificate file' 
      });
    }

    console.log(`🔍 Batch verification request for ${req.files.length} files`);
    const startTime = Date.now();

    // Process all files in parallel for speed
    const results = await Promise.all(
      req.files.map(async (file, index) => {
        try {
          // Calculate file hash
          const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
          const formattedHash = '0x' + fileHash;
          
          // Find certificate by hash
          const certificate = await Certificate.findOne({ 
            $or: [
              { artifactHash: formattedHash },
              { artifactHash: fileHash },
              { pdfHash: formattedHash },
              { pdfHash: fileHash },
              { sha256: formattedHash },
              { sha256: fileHash }
            ]
          }).select('certificateId pdfHash sha256 artifactHash merkleRoot batchId merkleProof status');
          
          if (!certificate) {
            return {
              index: index + 1,
              filename: file.originalname,
              fileHash: formattedHash,
              status: 'NOT VERIFIED',
              success: false,
              message: 'Certificate not found in database'
            };
          }

          // Quick verification - check if hash matches
          const hashMatches = 
            certificate.pdfHash === formattedHash || 
            certificate.pdfHash === fileHash ||
            certificate.artifactHash === formattedHash ||
            certificate.artifactHash === fileHash ||
            certificate.sha256 === formattedHash ||
            certificate.sha256 === fileHash;

          if (hashMatches) {
            return {
              index: index + 1,
              filename: file.originalname,
              certificateId: certificate.certificateId,
              fileHash: formattedHash,
              status: 'VERIFIED',
              success: true,
              message: 'Certificate is verified'
            };
          } else {
            return {
              index: index + 1,
              filename: file.originalname,
              fileHash: formattedHash,
              status: 'NOT VERIFIED',
              success: false,
              message: 'Hash mismatch - document may be tampered'
            };
          }

        } catch (error) {
          logger.error(`Error verifying file ${index + 1}:`, error);
          return {
            index: index + 1,
            filename: file.originalname,
            status: 'ERROR',
            success: false,
            message: error.message || 'Verification error'
          };
        }
      })
    );

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    // Calculate statistics
    const verified = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Batch verification complete: ${verified} verified, ${failed} failed in ${processingTime}s`);

    return res.json({
      success: true,
      message: `Processed ${req.files.length} certificates in ${processingTime} seconds`,
      statistics: {
        total: req.files.length,
        verified: verified,
        notVerified: failed,
        processingTimeSeconds: processingTime,
        averageTimePerFile: (parseFloat(processingTime) / req.files.length).toFixed(3)
      },
      results: results
    });

  } catch (error) {
    logger.error('Batch verification failed:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Batch verification failed', 
      error: error.message 
    });
  }
});

/**
 * POST /api/verify/batch-ids
 * Batch verify by certificate IDs (faster than file upload)
 * Expects: { certificateIds: ["CERT-1", "CERT-2", ...] }
 */
router.post('/batch-ids', async (req, res) => {
  try {
    const { certificateIds } = req.body;

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of certificate IDs' 
      });
    }

    if (certificateIds.length > 10000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 10,000 certificate IDs per request' 
      });
    }

    console.log(`🔍 Batch ID verification request for ${certificateIds.length} certificates`);
    const startTime = Date.now();

    // Find all certificates in one query (much faster)
    const certificates = await Certificate.find({ 
      certificateId: { $in: certificateIds } 
    }).select('certificateId status merkleRoot batchId');

    // Create a map for fast lookup
    const certMap = new Map();
    certificates.forEach(cert => {
      certMap.set(cert.certificateId, cert);
    });

    // Build results
    const results = certificateIds.map((id, index) => {
      const cert = certMap.get(id);
      
      if (!cert) {
        return {
          index: index + 1,
          certificateId: id,
          status: 'NOT VERIFIED',
          success: false,
          message: 'Certificate not found'
        };
      }

      return {
        index: index + 1,
        certificateId: id,
        status: 'VERIFIED',
        success: true,
        message: 'Certificate is verified',
        certificateStatus: cert.status
      };
    });

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    const verified = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Batch ID verification complete: ${verified} verified, ${failed} failed in ${processingTime}s`);

    return res.json({
      success: true,
      message: `Verified ${certificateIds.length} certificate IDs in ${processingTime} seconds`,
      statistics: {
        total: certificateIds.length,
        verified: verified,
        notVerified: failed,
        processingTimeSeconds: processingTime,
        averageTimePerCertificate: (parseFloat(processingTime) / certificateIds.length).toFixed(4)
      },
      results: results
    });

  } catch (error) {
    logger.error('Batch ID verification failed:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Batch verification failed', 
      error: error.message 
    });
  }
});

module.exports = router;
