const express = require('express');
const crypto = require('crypto');
const multer = require('multer');

const Certificate = require('../models/Certificate');
const CertificateService = require('../services/certificateService');
const BlockchainService = require('../services/blockchainService');
const blockchainService = new BlockchainService();
const LocalChainService = require('../services/localChainService');
const localChain = new LocalChainService();
const logger = require('../utils/logger');
const { canonicalizeCertificate } = require('../utils/canonicalizeCertificate');

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
        status: result.valid ? 'Valid' : 'Invalid',
        message: result.reason || 'Certificate is valid',
        certificate: {
          certificateId: certificate.certificateId,
          learner: certificate.learner,
          course: certificate.course,
          institute: certificate.institute,
          issueDate: certificate.issueDate,
          validUntil: certificate.validUntil,
          status: certificate.status,
          ncvqLevel: certificate.ncvqLevel,
          ncvqQualificationTitle: certificate.ncvqQualificationTitle,
          // Extended Details
          fatherName: certificate.fatherName,
          motherName: certificate.motherName,
          dob: certificate.dob,
          address: certificate.address,
          district: certificate.district,
          state: certificate.state,
          trade: certificate.trade,
          duration: certificate.duration,
          session: certificate.session,
          testMonth: certificate.testMonth,
          testYear: certificate.testYear
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
          ncvqQualificationTitle: certificate.ncvqQualificationTitle,
          // Extended Details
          fatherName: certificate.fatherName,
          motherName: certificate.motherName,
          dob: certificate.dob,
          address: certificate.address,
          district: certificate.district,
          state: certificate.state,
          trade: certificate.trade,
          duration: certificate.duration,
          session: certificate.session,
          testMonth: certificate.testMonth,
          testYear: certificate.testYear
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
 * POST /api/verify/single/store
 * Accepts JSON body `{ certificate }` or multipart file upload (JSON file or PDF).
 * Stores SHA256(canonicalized certificate) on local Hardhat contract under regNo/key.
 */
router.post('/single/store', upload.single('file'), async (req, res) => {
  try {
    let certObj = null;
    let key = req.body.regNo || req.body.reg_no || req.body.studentUniqueCode || null;

    if (req.file) {
      // If uploaded JSON file
      const mimetype = req.file.mimetype || '';
      if (mimetype === 'application/json' || req.file.originalname.toLowerCase().endsWith('.json')) {
        try {
          certObj = JSON.parse(req.file.buffer.toString());
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid JSON file' });
        }
      } else if (mimetype === 'application/pdf') {
        // PDF uploaded: we will store hash of PDF bytes if no JSON available
        const hexHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        if (!key) return res.status(400).json({ success: false, message: 'regNo required when uploading raw PDF' });
        try {
          const result = await localChain.storeHash(key, hexHash);
          return res.json({ success: true, key, hash: hexHash, txHash: result.txHash });
        } catch (err) {
          return res.status(500).json({ success: false, message: 'Failed to store on local chain: ' + err.message });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Unsupported file type. Upload JSON or PDF.' });
      }
    }

    // If certificate in JSON body
    if (!certObj && req.body.certificate) {
      certObj = typeof req.body.certificate === 'string' ? JSON.parse(req.body.certificate) : req.body.certificate;
    }

    if (!certObj) {
      return res.status(400).json({ success: false, message: 'Certificate JSON required in body or uploaded as file' });
    }

    // Canonicalize and compute SHA256
    const { canonicalString, hash } = canonicalizeCertificate(certObj);
    const hexHash = hash; // plain hex (no 0x)

    // Resolve key
    if (!key) key = certObj.reg_no || certObj.studentUniqueCode || certObj.student_unique_code || certObj.certificateId || null;
    if (!key) return res.status(400).json({ success: false, message: 'regNo (key) is required' });

    try {
      const result = await localChain.storeHash(key, hexHash);
      return res.json({ success: true, key, hash: hexHash, txHash: result.txHash });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to store on local chain: ' + err.message });
    }
  } catch (error) {
    logger.error('single/store failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/verify/single/verify
 * Accepts JSON body `{ certificate }` or multipart file upload (JSON file or PDF).
 * Recomputes SHA256 and compares with on-chain stored value.
 */
router.post('/single/verify', upload.single('file'), async (req, res) => {
  try {
    let certObj = null;
    let key = req.body.regNo || req.body.reg_no || req.body.studentUniqueCode || null;

    if (req.file) {
      const mimetype = req.file.mimetype || '';
      if (mimetype === 'application/json' || req.file.originalname.toLowerCase().endsWith('.json')) {
        try {
          certObj = JSON.parse(req.file.buffer.toString());
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid JSON file' });
        }
      } else if (mimetype === 'application/pdf') {
        // PDF: compute PDF SHA256
        const pdfHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        if (!key) return res.status(400).json({ success: false, message: 'regNo required when uploading raw PDF' });
        try {
          const stored = await localChain.verifyHash(key);
          const valid = stored === pdfHash;
          return res.json({ success: valid, valid, stored, computed: pdfHash, key });
        } catch (err) {
          return res.status(500).json({ success: false, message: 'Failed to verify on local chain: ' + err.message });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Unsupported file type. Upload JSON or PDF.' });
      }
    }

    if (!certObj && req.body.certificate) {
      certObj = typeof req.body.certificate === 'string' ? JSON.parse(req.body.certificate) : req.body.certificate;
    }

    if (!certObj) {
      return res.status(400).json({ success: false, message: 'Certificate JSON required in body or uploaded as file' });
    }

    const { hash } = canonicalizeCertificate(certObj);
    const hexHash = hash;

    if (!key) key = certObj.reg_no || certObj.studentUniqueCode || certObj.student_unique_code || certObj.certificateId || null;
    if (!key) return res.status(400).json({ success: false, message: 'regNo (key) is required' });

    try {
      const stored = await localChain.verifyHash(key);
      const valid = stored === hexHash;
      return res.json({ success: valid, valid, stored, computed: hexHash, key });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to verify on local chain: ' + err.message });
    }
  } catch (error) {
    logger.error('single/verify failed:', error);
    return res.status(500).json({ success: false, message: error.message });
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

module.exports = router;
