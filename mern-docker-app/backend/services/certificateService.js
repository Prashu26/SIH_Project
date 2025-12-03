const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Certificate = require("../models/Certificate");
const BlockchainService = require("./blockchainService");
const storageService = require("./storageService");
const {
  canonicalizeCertificate,
  canonicalStringify,
} = require("../utils/canonicalizeCertificate");

class CertificateService {
  /**
   * Issue a new certificate
   * @param {Object} certificateData - Certificate data
   * @returns {Promise<Object>} Created certificate
   */
  static async issueCertificate(
    certificateData,
    { skipBlockchain = false } = {}
  ) {
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
        status = "Issued",
      } = certificateData;

      console.log("issueCertificate called with:", {
        certificateId,
        studentUniqueCode,
        validUntil,
        learner: typeof learner,
        institute: typeof institute,
        course: typeof course,
      });

      // Parse and validate validUntil date
      let parsedValidUntil = null;
      if (validUntil) {
        parsedValidUntil = new Date(validUntil);
        // If invalid date, set to 1 year from now
        if (isNaN(parsedValidUntil.getTime())) {
          console.warn(
            `Invalid validUntil date: ${validUntil}, defaulting to 1 year from now`
          );
          parsedValidUntil = new Date();
          parsedValidUntil.setFullYear(parsedValidUntil.getFullYear() + 1);
        }
      }

      console.log("Parsed validUntil:", parsedValidUntil);

      const issueDate = new Date();

      const { canonical, hash: canonicalHash } = canonicalizeCertificate({
        certificateId,
        studentUniqueCode,
        learner,
        institute,
        course,
        modulesAwarded,
        issueDate,
        validUntil: parsedValidUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType,
      });

      const metadataHash = canonicalHash.startsWith("0x")
        ? canonicalHash
        : `0x${canonicalHash}`;

      const { metadata: metadataDoc, hash: metadataDocumentHash } =
        this.generateMetadata({
          certificateId,
          studentUniqueCode,
          learner,
          institute,
          course,
          modulesAwarded,
          issueDate,
          validUntil: parsedValidUntil,
          ncvqLevel,
          ncvqQualificationCode,
          ncvqQualificationTitle,
          ncvqQualificationType,
          canonicalHash: metadataHash,
        });

      // Generate QR code data
      const qrCodeData = await this.generateQRCode(certificateId, metadataHash);

      // Create certificate
      const certificate = new Certificate({
        certificateId,
        studentUniqueCode,
        learner,
        institute,
        course,
        modulesAwarded,
        issueDate,
        validUntil: parsedValidUntil,
        status,
        metadataHash,
        qrCodeData,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType,
        storage: {
          canonical: {
            hash: metadataHash,
            rawHash: canonicalHash,
            payload: canonical,
          },
        },
      });

      const fileArtifacts = await this.generateCertificateFiles({
        certificateId,
        studentUniqueCode,
        issueDate,
        validUntil: parsedValidUntil,
        ncvqLevel,
        ncvqQualificationCode,
        ncvqQualificationTitle,
        ncvqQualificationType,
        modulesAwarded,
        learner,
        institute,
        course,
        metadata: metadataDoc,
        canonicalHash: metadataHash,
      });

      const artifactHash = fileArtifacts.pdfHash.startsWith("0x")
        ? fileArtifacts.pdfHash
        : `0x${fileArtifacts.pdfHash}`;
      const metadataArtifactHash = metadataDocumentHash.startsWith("0x")
        ? metadataDocumentHash
        : `0x${metadataDocumentHash}`;

      certificate.artifactHash = artifactHash;
      // Provide legacy filesystem-style paths for older frontends
      // Use API download endpoints so frontends can fetch the artifact
      certificate.pdfPath = `/api/certificates/${certificateId}/download`;
      certificate.jsonLdPath = `/api/certificates/${certificateId}/artifacts/metadata`;
      certificate.storage = {
        ...(certificate.storage || {}),
        canonical: {
          hash: metadataHash,
          rawHash: canonicalHash,
          payload: canonical,
        },
        artifacts: {
          pdf: {
            bucket: fileArtifacts.bucketName,
            fileId: fileArtifacts.pdfFileId,
            filename: fileArtifacts.pdfFilename,
            contentType: "application/pdf",
            hash: artifactHash,
          },
          metadata: {
            bucket: fileArtifacts.bucketName,
            fileId: fileArtifacts.jsonLdFileId,
            filename: fileArtifacts.jsonFilename,
            contentType: "application/json",
            hash: metadataArtifactHash,
          },
        },
        metadataDocument: metadataDoc,
      };

      // Save certificate to database
      certificate.markModified("storage");
      await certificate.save();

      // Anchor certificate on blockchain (optional: skip for batch flow)
      if (!skipBlockchain) {
        try {
          const tx = await BlockchainService.anchorSingle(metadataHash);
          if (tx && tx.txHash) {
            certificate.blockchainTxHash = tx.txHash;
            await certificate.save();
          }
        } catch (blockchainError) {
          console.error(
            "Error anchoring certificate on blockchain:",
            blockchainError
          );
          // Continue even if blockchain anchoring fails
        }
      }

      return { certificate };
    } catch (error) {
      console.error("Error in issueCertificate:", error);
      throw new Error("Failed to issue certificate");
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
    const bucketName =
      process.env.CERTIFICATE_BUCKET_NAME || "certificateArtifacts";

    const results = {
      total: certificates.length,
      successCount: 0,
      failedCount: 0,
      certificates: [],
      errors: [],
      successful: [],
      failed: [],
      merkleRoot: null,
      batchId: null,
    };

    const createdCertificates = [];
    const metadataHashes = [];

    for (const certData of certificates) {
      try {
        if (
          !certData.learner ||
          !certData.course ||
          !certData.studentUniqueCode
        ) {
          throw new Error("Missing required fields");
        }

        const exists = await Certificate.findOne({
          learner: certData.learner,
          course: certData.course,
          status: { $ne: "Revoked" },
        });

        if (exists) {
          throw new Error(
            "Certificate already exists for this learner and course"
          );
        }

        const certificateId = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const { certificate } = await this.issueCertificate(
          {
            ...certData,
            certificateId,
            institute: instituteId,
            status: "Issued",
          },
          { skipBlockchain: true }
        );

        createdCertificates.push(certificate);
        metadataHashes.push(certificate.metadataHash);
        results.certificates.push(certificate);
        results.successCount++;
        results.successful.push({
          certificateId: certificate.certificateId,
          metadataHash: certificate.metadataHash,
          learner: certificate.learner,
          course: certificate.course,
          artifactHash: certificate.artifactHash,
          storage: certificate.storage,
        });
      } catch (error) {
        console.error(
          `Error processing certificate for student ${certData.studentUniqueCode}:`,
          error
        );
        results.failedCount++;
        const failure = {
          studentUniqueCode: certData.studentUniqueCode,
          error: error.message,
        };
        results.errors.push(failure);
        results.failed.push(failure);
      }
    }

    if (metadataHashes.length === 0) {
      return results;
    }

    try {
      console.log(
        `🔗 Anchoring batch of ${metadataHashes.length} certificates to blockchain...`
      );
      const anchorResult = await BlockchainService.anchorBatch(metadataHashes);

      if (anchorResult && anchorResult.success && anchorResult.txHash) {
        console.log(`✅ Batch anchored successfully: ${anchorResult.txHash}`);
        console.log(`  - Merkle Root: ${anchorResult.merkleRoot}`);
        console.log(`  - Batch ID: ${anchorResult.batchId}`);

        results.blockchainAnchoring = {
          success: true,
          txHash: anchorResult.txHash,
          merkleRoot: anchorResult.merkleRoot,
          batchId: anchorResult.batchId,
          gasUsed: anchorResult.gasUsed,
        };
        results.merkleRoot = anchorResult.merkleRoot;
        results.batchId = anchorResult.batchId;

        for (let i = 0; i < createdCertificates.length; i++) {
          const cert = createdCertificates[i];
          const proofData = anchorResult.proofs[i];

          try {
            cert.blockchainTxHash = anchorResult.txHash;
            cert.merkleRoot = anchorResult.merkleRoot;
            cert.merkleProof = proofData.merkleProof;
            cert.batchId = anchorResult.batchId;

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
                step3: "Compare computed root with on-chain root",
              },
            };

            const proofBuffer = Buffer.from(
              JSON.stringify(proofJson, null, 2),
              "utf-8"
            );
            const proofFileId = await storageService.saveFileFromBuffer(
              `${cert.certificateId}-proof.json`,
              proofBuffer,
              "application/json",
              {
                certificateId: cert.certificateId,
                type: "certificate-proof",
                batchId: anchorResult.batchId,
                canonicalHash: cert.metadataHash,
              }
            );

            const currentStorage = cert.storage || {};
            const artifacts = {
              ...(currentStorage.artifacts || {}),
              proof: {
                bucket: bucketName,
                fileId: proofFileId.toString(),
                filename: `${cert.certificateId}-proof.json`,
                contentType: "application/json",
              },
            };

            cert.proofPath = null;
            cert.storage = {
              ...currentStorage,
              artifacts,
            };
            cert.markModified("storage");
            await cert.save();

            const summaryIndex = results.successful.findIndex(
              (entry) => entry.certificateId === cert.certificateId
            );

            if (summaryIndex >= 0) {
              results.successful[summaryIndex] = {
                ...results.successful[summaryIndex],
                blockchainTxHash: anchorResult.txHash,
                merkleRoot: anchorResult.merkleRoot,
                merkleProof: proofData.merkleProof,
                batchId: anchorResult.batchId,
                storage: cert.storage,
              };
            }

            console.log(
              `  ✓ Updated certificate ${cert.certificateId} with proof`
            );
          } catch (updateError) {
            console.warn(
              `Failed to update certificate ${cert.certificateId}:`,
              updateError.message || updateError
            );
          }
        }
      } else if (anchorResult && !anchorResult.success) {
        console.warn(
          "⚠️ Blockchain anchoring skipped:",
          anchorResult.error || anchorResult.message
        );
        results.blockchainAnchoring = {
          success: false,
          reason: anchorResult.error || anchorResult.message,
        };
      }
    } catch (e) {
      console.error("❌ Batch anchoring failed:", e.message || e);
      results.blockchainAnchoring = {
        success: false,
        error: e.message,
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
      throw new Error("Certificate not found");
    }

    if (certificate.status === "Revoked") {
      throw new Error("Certificate is already revoked");
    }

    // Update certificate status
    certificate.status = "Revoked";
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason;

    // Update on blockchain
    try {
      const blockchainService = new BlockchainService();
      await blockchainService.revokeCertificate(certificateId, reason);
    } catch (blockchainError) {
      console.error(
        "Error revoking certificate on blockchain:",
        blockchainError
      );
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
        .populate("learner", "name email")
        .populate("institute", "name")
        .populate("course", "name code");

      if (!certificate) {
        return {
          isValid: false,
          status: "not_found",
          message: "Certificate not found",
        };
      }

      if (certificate.status === "Revoked") {
        return {
          isValid: false,
          status: "revoked",
          message: "Certificate has been revoked",
          certificate,
          revocation: {
            date: certificate.revokedAt,
            reason: certificate.revocationReason,
          },
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
            timestamp: tx.timestamp,
          };
        } catch (error) {
          console.error("Error verifying on blockchain:", error);
          blockchain = { error: "Blockchain verification failed" };
        }
      }

      return {
        isValid: true,
        status: "valid",
        message: "Certificate is valid",
        certificate,
        blockchain,
      };
    } catch (error) {
      console.error("Error verifying certificate:", error);
      return {
        isValid: false,
        status: "error",
        message: "Error verifying certificate",
        error: error.message,
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
      ncvqQualificationType,
    } = certificateData;

    const metadata = {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      id: `${process.env.ISSUER_URL || "http://localhost:8080"}/certificates/${certificateId}`,
      recipient: {
        type: "email",
        identity: studentUniqueCode,
        hashed: false,
      },
      badge: {
        type: "BadgeClass",
        id: `${process.env.ISSUER_URL || "http://localhost:8080"}/badges/${course}`,
        name: ncvqQualificationTitle || "Certificate of Completion",
        description: `Awarded to ${studentUniqueCode} for completing the course`,
        image: "",
        criteria: {
          narrative:
            "Awarded upon successful completion of all required modules.",
        },
        issuer: {
          type: "Profile",
          id: `${process.env.ISSUER_URL || "http://localhost:"}/institutes/${institute}`,
          name: "Issuing Institution",
          url: process.env.ISSUER_URL || "http://localhost:8080",
        },
        tags: ["certificate", "education", "ncvq"],
      },
      verification: {
        type: "HostedBadge",
      },
      issuedOn: new Date(issueDate).toISOString(),
      expires: validUntil ? new Date(validUntil).toISOString() : null,
      evidence: [
        {
          type: "Certificate",
          id: certificateId,
          title: ncvqQualificationTitle || "Certificate of Completion",
          description: "Awarded for successful completion of the course",
          issuedOn: new Date(issueDate).toISOString(),
          evidenceDocument: `${process.env.API_URL || "http://localhost:8080"}/api/certificates/${certificateId}/download`,
          documentType: "CertificateDocument",
        },
      ],
    };

    metadata.canonicalHash = certificateData.canonicalHash || null;

    // Add NCVQ specific fields if available
    if (ncvqLevel || ncvqQualificationCode) {
      metadata.badge.extensions = {
        NCVQ: {
          level: ncvqLevel,
          qualificationCode: ncvqQualificationCode,
          qualificationType: ncvqQualificationType || "National Certificate",
        },
      };
    }

    // Calculate hash of the metadata
    const hash = crypto
      .createHash("sha256")
      .update(canonicalStringify(metadata))
      .digest("hex");

    return { metadata, hash };
  }

  /**
   * Generate certificate files (PDF and JSON-LD)
   * @private
   */
  static async generateCertificateFiles(certificateData) {
    const bucketName =
      process.env.CERTIFICATE_BUCKET_NAME || "certificateArtifacts";

    const metadataDoc =
      certificateData.metadata ||
      this.generateMetadata(certificateData).metadata;
    const metadataBuffer = Buffer.from(
      JSON.stringify(metadataDoc, null, 2),
      "utf-8"
    );

    const pdfBuffer = await this.generatePDF({
      ...certificateData,
      metadata: metadataDoc,
    });

    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const pdfFilename = `${certificateData.certificateId}.pdf`;
    const jsonFilename = `${certificateData.certificateId}.json`;

    const pdfFileId = await storageService.saveFileFromBuffer(
      pdfFilename,
      pdfBuffer,
      "application/pdf",
      {
        certificateId: certificateData.certificateId,
        type: "certificate-pdf",
        canonicalHash: certificateData.canonicalHash,
      }
    );

    const jsonLdFileId = await storageService.saveFileFromBuffer(
      jsonFilename,
      metadataBuffer,
      "application/json",
      {
        certificateId: certificateData.certificateId,
        type: "certificate-metadata",
        canonicalHash: certificateData.canonicalHash,
      }
    );

    return {
      bucketName,
      pdfFileId: pdfFileId.toString(),
      jsonLdFileId: jsonLdFileId.toString(),
      pdfFilename,
      jsonFilename,
      pdfHash,
    };
  }

  static async generatePDF(data) {
    const metadata = data.metadata || {};
    const badge = metadata.badge || {};
    const issuerProfile = badge.issuer || {};
    const modulesAwarded = Array.isArray(data.modulesAwarded)
      ? data.modulesAwarded.filter(Boolean)
      : [];

    const learnerDisplayName =
      data.learnerName ||
      metadata.recipient?.name ||
      metadata.recipient?.identity ||
      data.studentUniqueCode ||
      "Learner";
    const courseTitle = data.courseName || badge.name || "Certified Course";
    const instituteName =
      data.instituteName || issuerProfile.name || "Issuing Institution";
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const expiryDate = data.validUntil ? new Date(data.validUntil) : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .text("Certificate of Achievement", { align: "center" });
      doc.moveDown(1.5);

      doc
        .font("Helvetica")
        .fontSize(14)
        .text(`This certifies that`, { align: "center" });
      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(learnerDisplayName, { align: "center" });
      doc.moveDown(1);

      doc
        .font("Helvetica")
        .fontSize(14)
        .text(`has successfully completed`, { align: "center" });
      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(courseTitle, { align: "center" });
      doc.moveDown(1.25);

      if (modulesAwarded.length) {
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("Modules Awarded:", { underline: true });
        doc.moveDown(0.25);
        doc.font("Helvetica").fontSize(12);
        modulesAwarded.forEach((module, index) => {
          doc.text(`${index + 1}. ${module}`);
        });
        doc.moveDown(0.75);
      }

      doc.font("Helvetica").fontSize(12);
      doc.text(`Certificate ID: ${data.certificateId}`, { continued: false });
      doc.text(`Student ID: ${data.studentUniqueCode}`);
      doc.text(`Issue Date: ${issueDate.toLocaleDateString()}`);
      if (expiryDate) {
        doc.text(`Valid Until: ${expiryDate.toLocaleDateString()}`);
      }
      doc.text(`NCVQ Level: ${data.ncvqLevel || "N/A"}`);
      doc.text(`Qualification Code: ${data.ncvqQualificationCode || "N/A"}`);
      doc.moveDown(1.25);

      doc.font("Helvetica-Bold").fontSize(14).text(instituteName);
      doc.font("Helvetica").fontSize(12).text("Authorized Issuer");

      doc.moveDown(2);
      doc.fontSize(10).fillColor("#555555");
      doc.text(
        "This document is digitally generated and verifiable through the accompanying metadata and hash records.",
        {
          align: "center",
        }
      );

      doc.end();
    });
  }

  static async generateQRCode(certificateId, metadataHash) {
    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/verify/${certificateId}`;
    const qrData = {
      certificateId,
      verificationUrl,
      metadataHash,
      timestamp: Date.now(),
    };

    try {
      return await QRCode.toDataURL(JSON.stringify(qrData));
    } catch (err) {
      console.error("Error generating QR code:", err);
      throw new Error("Failed to generate QR code");
    }
  }
}

module.exports = CertificateService;
