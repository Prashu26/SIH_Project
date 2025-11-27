const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    // Certificate Identification
    certificateId: { type: String, required: true, unique: true, index: true },
    studentUniqueCode: { type: String, required: true, index: true }, // College-issued ID
    
    // Relationships
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    
    // Certificate Details
    modulesAwarded: { type: [String], default: [] },
    issueDate: { type: Date, default: Date.now },
    validUntil: { type: Date },
    
    // File Storage
    pdfPath: { type: String },
    jsonLdPath: { type: String }, // Path to JSON-LD file
    
    // Verification Data
    qrCodeData: { type: String },
    metadataHash: { type: String, index: true }, // SHA-256 hash of certificate data
    artifactHash: { type: String }, // Hash of the PDF content
    ipfsCid: { type: String }, // IPFS Content Identifier
    
    // Blockchain Data
    blockchainTxHash: { type: String },
    merkleRoot: { type: String },
    merkleProof: { type: mongoose.Schema.Types.Mixed }, // Array of proof objects
    batchId: { type: String }, // Batch ID from contract
    
    // Status and Audit
    status: { 
      type: String, 
      enum: ['Draft', 'Issued', 'Revoked'], 
      default: 'Draft' 
    },
    revokedAt: { type: Date },
    revocationReason: { type: String },
    
    // NCVET Compliance Fields
    ncvqLevel: { type: String },
    ncvqQualificationCode: { type: String },
    ncvqQualificationTitle: { type: String },
    ncvqQualificationType: { type: String },
    
    // Additional Metadata
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
CertificateSchema.index({ studentUniqueCode: 1, institute: 1 }, { unique: true });
CertificateSchema.index({ merkleRoot: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ institute: 1, status: 1 });
CertificateSchema.index({ learner: 1, status: 1 });

CertificateSchema.methods.toSummary = function toSummary() {
  return {
    id: this._id,
    certificateId: this.certificateId,
    learner: this.learner,
    institute: this.institute,
    course: this.course,
    modulesAwarded: this.modulesAwarded,
    issueDate: this.issueDate,
    validUntil: this.validUntil,
    status: this.status,
    pdfPath: this.pdfPath,
    artifactHash: this.artifactHash,
    ipfsCid: this.ipfsCid,
    blockchainTxHash: this.blockchainTxHash,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Certificate', CertificateSchema);
