const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const BlockchainService = require('./blockchainService');

class CertificateService {
  /**
   * Issue a new certificate
   * @param {Object} certificateData - Certificate data
   * @returns {Promise<Object>} Created certificate
   */
  static async issueCertificate(certificateData, { skipBlockchain = false } = {}) {
    try {
      const {
        certificateId,
        studentUniqueCode,
        learner,
        institute,
        course,
        modulesAwarded,
        validUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType,
        status = 'Issued'
      } = certificateData;

      console.log('issueCertificate called with:', {
        certificateId,
        studentUniqueCode,
        validUntil,
        learner: typeof learner,
        institute: typeof institute,
        course: typeof course
      });

      // Parse and validate validUntil date
      let parsedValidUntil = null;
      if (validUntil) {
        parsedValidUntil = new Date(validUntil);
        // If invalid date, set to 1 year from now
        if (isNaN(parsedValidUntil.getTime())) {
          console.warn(`Invalid validUntil date: ${validUntil}, defaulting to 1 year from now`);
          parsedValidUntil = new Date();
          parsedValidUntil.setFullYear(parsedValidUntil.getFullYear() + 1);
        }
      }

      console.log('Parsed validUntil:', parsedValidUntil);

      // Generate metadata hash
      const metadata = this.generateMetadata({
        certificateId,
        studentUniqueCode,
        learner,
        institute,
        course,
        modulesAwarded,
        issueDate: new Date(),
        validUntil: parsedValidUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType
      });

      // Generate QR code data
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const qrCodeData = `${frontendUrl}/verify/${certificateId}`;
      
      // Create certificate
      const certificate = new Certificate({
        certificateId,
        studentUniqueCode,
        learner,
        institute,
        course,
        modulesAwarded,
        issueDate: new Date(),
        validUntil: parsedValidUntil,
        status,
        metadataHash: metadata.hash,
        qrCodeData,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType
      });

      // Generate PDF and update certificate with file paths
      // Pass the plain object but ensure all required fields are included
      const certData = {
        ...certificate.toObject(),
        certificateId: certificateId,
        studentUniqueCode: studentUniqueCode,
        issueDate: new Date(),
        validUntil: parsedValidUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType
      };
      const { pdfPath, jsonLdPath } = await this.generateCertificateFiles(certData);
      certificate.pdfPath = pdfPath;
      certificate.jsonLdPath = jsonLdPath;
      
      // Calculate artifact hash from the full path
      const fullPdfPath = path.join(__dirname, '../../', pdfPath);
      certificate.artifactHash = await this.calculateFileHash(fullPdfPath);

      // Save certificate to database
      await certificate.save();

      // Anchor certificate on blockchain (optional: skip for batch flow)
      if (!skipBlockchain) {
        try {
          const tx = await BlockchainService.anchorSingle(metadata.hash);
          if (tx && tx.txHash) {
            certificate.blockchainTxHash = tx.txHash;
            await certificate.save();
          }
        } catch (blockchainError) {
          console.error('Error anchoring certificate on blockchain:', blockchainError);
          // Continue even if blockchain anchoring fails
        }
      }

      return { certificate };
    } catch (error) {
      console.error('Error in issueCertificate:', error);
      throw new Error('Failed to issue certificate');
    }
  }

  /**
   * Issue multiple certificates in batch
   * @param {Object} params - Batch parameters
   * @param {string} params.instituteId - Institute ID
   * @param {Array} params.certificates - Array of certificate data
   * @returns {Promise<Object>} Batch processing results
   */
  static async issueBatchCertificates({ instituteId, certificates }) {
    const results = {
      total: certificates.length,
      successCount: 0,
      failedCount: 0,
      certificates: [],
      errors: []
    };

    const createdCertificates = [];
    const metadataHashes = [];

    for (const certData of certificates) {
      try {
        // Validate required fields
        if (!certData.learner || !certData.course || !certData.studentUniqueCode) {
          throw new Error('Missing required fields');
        }

        // Check if certificate already exists
        const exists = await Certificate.findOne({
          learner: certData.learner,
          course: certData.course,
          status: { $ne: 'Revoked' }
        });

        if (exists) {
          throw new Error('Certificate already exists for this learner and course');
        }

        // Generate certificate ID
        const certificateId = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Issue certificate
        const { certificate } = await this.issueCertificate({
          ...certData,
          certificateId,
          institute: instituteId,
          status: 'Issued'
        }, { skipBlockchain: true }); // skip per-certificate anchoring for batch

        createdCertificates.push(certificate);
        metadataHashes.push(certificate.metadataHash);
        results.certificates.push(certificate);
        results.successCount++;
      } catch (error) {
        console.error(`Error processing certificate for student ${certData.studentUniqueCode}:`, error);
        results.failedCount++;
        results.errors.push({
          studentUniqueCode: certData.studentUniqueCode,
          error: error.message
        });
      }
    }

    // Anchor the batch Merkle root on-chain and store proofs
    try {
      console.log(`🔗 Anchoring batch of ${metadataHashes.length} certificates to blockchain...`);
      const anchorResult = await BlockchainService.anchorBatch(metadataHashes);
      
      if (anchorResult && anchorResult.success && anchorResult.txHash) {
        console.log(`✅ Batch anchored successfully: ${anchorResult.txHash}`);
        console.log(`  - Merkle Root: ${anchorResult.merkleRoot}`);
        console.log(`  - Batch ID: ${anchorResult.batchId}`);
        
        // Update each certificate with blockchain data and proofs
        for (let i = 0; i < createdCertificates.length; i++) {
          const cert = createdCertificates[i];
          const proofData = anchorResult.proofs[i];
          
          try {
            // Update certificate with blockchain anchoring data
            cert.blockchainTxHash = anchorResult.txHash;
            cert.merkleRoot = anchorResult.merkleRoot;
            cert.merkleProof = proofData.merkleProof;
            cert.batchId = anchorResult.batchId;
            await cert.save();

            // Write proof JSON file for download/verification
            const proofJson = {
              certificateId: cert.certificateId,
              metadataHash: cert.metadataHash,
              merkleRoot: anchorResult.merkleRoot,
              merkleProof: proofData.merkleProof,
              batchId: anchorResult.batchId,
              blockchainTxHash: anchorResult.txHash,
              issuedAt: cert.issueDate.toISOString(),
              verificationInstructions: {
                step1: "Verify locally using the Merkle proof and root",
                step2: `Query blockchain for batch root: getBatchRoot(${anchorResult.batchId})`,
                step3: "Compare computed root with on-chain root"
              }
            };

            const proofPath = path.join(__dirname, '../../uploads/certificates', cert.certificateId, `${cert.certificateId}-proof.json`);
            const proofDir = path.dirname(proofPath);
            if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
            fs.writeFileSync(proofPath, JSON.stringify(proofJson, null, 2));
            
            cert.proofPath = proofPath.replace(/^.*[\\/]uploads[\/]/, 'uploads/');
            await cert.save();
            
            console.log(`  ✓ Updated certificate ${cert.certificateId} with proof`);
          } catch (e) {
            console.warn(`Failed to update certificate ${cert.certificateId}:`, e.message || e);
          }
        }
        
        // Add anchoring info to results
        results.blockchainAnchoring = {
          success: true,
          txHash: anchorResult.txHash,
          merkleRoot: anchorResult.merkleRoot,
          batchId: anchorResult.batchId,
          gasUsed: anchorResult.gasUsed
        };
      } else if (anchorResult && !anchorResult.success) {
        console.warn('⚠️ Blockchain anchoring skipped:', anchorResult.error || anchorResult.message);
        results.blockchainAnchoring = {
          success: false,
          reason: anchorResult.error || anchorResult.message
        };
      }
    } catch (e) {
      console.error('❌ Batch anchoring failed:', e.message || e);
      results.blockchainAnchoring = {
        success: false,
        error: e.message
      };
    }

    return results;
  }

  /**
   * Revoke a certificate
   * @param {string} certificateId - Certificate ID
   * @param {string} reason - Reason for revocation
   * @returns {Promise<Object>} Updated certificate
   */
  static async revokeCertificate(certificateId, reason) {
    const certificate = await Certificate.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.status === 'Revoked') {
      throw new Error('Certificate is already revoked');
    }

    // Update certificate status
    certificate.status = 'Revoked';
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason;

    // Update on blockchain
    try {
      const blockchainService = new BlockchainService();
      await blockchainService.revokeCertificate(certificateId, reason);
    } catch (blockchainError) {
      console.error('Error revoking certificate on blockchain:', blockchainError);
      // Continue even if blockchain update fails
    }

    await certificate.save();
    return { certificate };
  }

  /**
   * Verify a certificate
   * @param {string} certificateId - Certificate ID
   * @returns {Promise<Object>} Verification result
   */
  static async verifyCertificate(certificateId) {
    try {
      const certificate = await Certificate.findById(certificateId)
        .populate('learner', 'name email')
        .populate('institute', 'name')
        .populate('course', 'name code');

      if (!certificate) {
        return {
          isValid: false,
          status: 'not_found',
          message: 'Certificate not found'
        };
      }

      if (certificate.status === 'Revoked') {
        return {
          isValid: false,
          status: 'revoked',
          message: 'Certificate has been revoked',
          certificate,
          revocation: {
            date: certificate.revokedAt,
            reason: certificate.revocationReason
          }
        };
      }

      // Verify blockchain status if available
      let blockchain = null;
      if (certificate.blockchainTxHash) {
        try {
          const blockchainService = new BlockchainService();
          const tx = await blockchainService.verifyCertificate(certificateId);
          blockchain = {
            verified: tx.verified,
            txHash: certificate.blockchainTxHash,
            timestamp: tx.timestamp
          };
        } catch (error) {
          console.error('Error verifying on blockchain:', error);
          blockchain = { error: 'Blockchain verification failed' };
        }
      }

      return {
        isValid: true,
        status: 'valid',
        message: 'Certificate is valid',
        certificate,
        blockchain
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return {
        isValid: false,
        status: 'error',
        message: 'Error verifying certificate',
        error: error.message
      };
    }
  }

  /**
   * Generate metadata hash for certificate
   * @private
   */
  static generateMetadata(certificateData) {
    const { 
      certificateId,
      studentUniqueCode,
      learner,
      institute,
      course,
      modulesAwarded,
      issueDate,
      validUntil,
      ncvqLevel,
      ncvqQualificationCode,
      ncvqQualificationTitle,
      ncvqQualificationType
    } = certificateData;

    const metadata = {
      '@context': 'https://w3id.org/openbadges/v2',
      type: 'Assertion',
      id: `${process.env.ISSUER_URL || 'http://localhost:3000'}/certificates/${certificateId}`,
      recipient: {
        type: 'email',
        identity: studentUniqueCode,
        hashed: false
      },
      badge: {
        type: 'BadgeClass',
        id: `${process.env.ISSUER_URL || 'http://localhost:3000'}/badges/${course}`,
        name: ncvqQualificationTitle || 'Certificate of Completion',
        description: `Awarded to ${studentUniqueCode} for completing the course`,
        image: '',
        criteria: {
          narrative: 'Awarded upon successful completion of all required modules.'
        },
        issuer: {
          type: 'Profile',
          id: `${process.env.ISSUER_URL || 'http://localhost:3000'}/institutes/${institute}`,
          name: 'Issuing Institution',
          url: process.env.ISSUER_URL || 'http://localhost:3000'
        },
        tags: ['certificate', 'education', 'ncvq']
      },
      verification: {
        type: 'HostedBadge'
      },
      issuedOn: new Date(issueDate).toISOString(),
      expires: validUntil ? new Date(validUntil).toISOString() : null,
      evidence: [
        {
          type: 'Certificate',
          id: certificateId,
          title: ncvqQualificationTitle || 'Certificate of Completion',
          description: 'Awarded for successful completion of the course',
          issuedOn: new Date(issueDate).toISOString(),
          evidenceDocument: `${process.env.API_URL || 'http://localhost:8080'}/api/certificates/${certificateId}/download`,
          documentType: 'CertificateDocument'
        }
      ]
    };

    // Add NCVQ specific fields if available
    if (ncvqLevel || ncvqQualificationCode) {
      metadata.badge.extensions = {
        'NCVQ': {
          level: ncvqLevel,
          qualificationCode: ncvqQualificationCode,
          qualificationType: ncvqQualificationType || 'National Certificate'
        }
      };
    }

    // Calculate hash of the metadata
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(metadata))
      .digest('hex');

    return { metadata, hash };
  }

  /**
   * Generate certificate files (PDF and JSON-LD)
   * @private
   */
  static async generateCertificateFiles(certificateData) {
    const uploadDir = path.join(__dirname, '../../uploads/certificates');
    const certDir = path.join(uploadDir, certificateData.certificateId);
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create certificate directory
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // Generate file paths
    const pdfPath = path.join(certDir, 'certificate.pdf');
    const jsonLdPath = path.join(certDir, 'metadata.json');
    
    // Generate metadata and save as JSON-LD
    const { metadata } = this.generateMetadata(certificateData);
    fs.writeFileSync(jsonLdPath, JSON.stringify(metadata, null, 2));
    
    // Generate PDF (placeholder implementation)
    const pdfContent = `Certificate of Completion\n\n` +
      `ID: ${certificateData.certificateId}\n` +
      `Awarded To: ${certificateData.studentUniqueCode}\n` +
      `Course: ${certificateData.ncvqQualificationTitle || 'Not specified'}\n` +
      `Issued On: ${new Date().toLocaleDateString()}\n` +
      `Valid Until: ${certificateData.validUntil ? new Date(certificateData.validUntil).toLocaleDateString() : 'N/A'}\n`;
    
    fs.writeFileSync(pdfPath, pdfContent);
    
    return {
      pdfPath: pdfPath.replace(/^.*[\\/]uploads[\\/]/, 'uploads/'),
      jsonLdPath: jsonLdPath.replace(/^.*[\\/]uploads[\\/]/, 'uploads/')
    };
  }

  /**
   * Generate QR code for certificate
   * @private
   */
  static async generateQRCode(certificateId, metadataHash) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${certificateId}`;
    return await QRCode.toDataURL(verificationUrl);
  }

  static async generatePDF(data, outputPath) {
    // Simplified text-based certificate placeholder
    // In production, use a proper PDF library like pdfkit or puppeteer
    const certificateText = `
CERTIFICATE OF ACHIEVEMENT
========================

This is to certify that

${data.learnerName || 'Student Name'}

has successfully completed

${data.courseName || 'Course Name'}

Issue Date: ${new Date(data.issueDate).toLocaleDateString()}
Certificate ID: ${data.certificateId}
Student ID: ${data.studentUniqueCode}

NCVQ Level: ${data.ncvqLevel || 'N/A'}
Qualification Code: ${data.ncvqQualificationCode || 'N/A'}

Issued by: ${data.instituteName || 'Institution'}

========================
This is a placeholder certificate file.
In production, this would be a properly formatted PDF with QR code and signature.
    `;
    
    fs.writeFileSync(outputPath, certificateText);
    return outputPath;
  }
  
  static generateJsonLd(data) {
    return {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/blockcerts/v3"
      ],
      "type": ["VerifiableCredential", "BlockcertsCredential"],
      "issuer": {
        "id": data.instituteId,
        "name": data.instituteName,
        "type": "Profile",
        "url": data.instituteUrl
      },
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": `did:example:${data.studentUniqueCode}`,
        "name": data.learnerName,
        "achievement": {
          "id": `urn:uuid:${data.certificateId}`,
          "type": "Achievement",
          "name": data.courseName,
          "description": data.courseDescription,
          "criteria": {
            "narrative": data.criteriaNarrative || "Successful completion of all required assessments."
          },
          "level": data.ncvqLevel,
          "qualificationCode": data.ncvqQualificationCode,
          "qualificationTitle": data.ncvqQualificationTitle,
          "qualificationType": data.ncvqQualificationType
        }
      },
      "proof": {
        "type": "MerkleProof2019",
        "created": new Date().toISOString(),
        "proofPurpose": "assertionMethod",
        "verificationMethod": `did:example:${data.instituteId}#key-1`
      }
    };
  }
  
  static generateMetadataHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      certificateId: data.certificateId,
      studentUniqueCode: data.studentUniqueCode,
      learnerName: data.learnerName,
      courseName: data.courseName,
      issueDate: data.issueDate,
      ncvqLevel: data.ncvqLevel,
      ncvqQualificationCode: data.ncvqQualificationCode
    }));
    return hash.digest('hex');
  }
  
  static async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  static async generateQRCode(certificateId, metadataHash) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${certificateId}`;
    const qrData = {
      certificateId,
      verificationUrl,
      metadataHash,
      timestamp: Date.now()
    };
    
    try {
      // Generate QR code as data URL
      return await QRCode.toDataURL(JSON.stringify(qrData));
    } catch (err) {
      console.error('Error generating QR code:', err);
      throw new Error('Failed to generate QR code');
    }
  }
}

module.exports = CertificateService;
