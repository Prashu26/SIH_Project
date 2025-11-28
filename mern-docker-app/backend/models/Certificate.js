const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    // Primary identifiers
    certificateId: { type: String, required: true, unique: true, index: true },
    certificate_id: { type: String, index: true }, // Legacy field
    
    studentUniqueCode: { type: String, required: true, index: true },
    student_unique_code: { type: String, index: true }, // Legacy field
    
    // References
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    
    // Legacy references
    institute_code: { type: String, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    
    // Certificate details
    modulesAwarded: { type: [String], default: [] },
    issueDate: { type: Date, required: true, default: Date.now },
    issue_date: { type: Date }, // Legacy field
    validUntil: { type: Date },
    
    // NCVQ / Qualification details
    ncvqLevel: { type: String },
    ncvqQualificationCode: { type: String },
    ncvqQualificationTitle: { type: String },
    ncvqQualificationType: { type: String, default: 'National Certificate' },
    
    // Status
    status: {
      type: String,
      enum: ['Pending', 'Ready', 'Issued', 'Revoked', 'Failed', 'PENDING', 'READY', 'ISSUED', 'REVOKED', 'FAILED'],
      default: 'Issued',
      index: true
    },
    
    // Blockchain & Merkle
    blockchainTxHash: { type: String, index: true },
    blockchain_tx: { type: String }, // Legacy field
    merkleRoot: { type: String, index: true },
    merkleProof: { type: [String], default: [] },
    merkle_proof: { type: [String], default: [] }, // Legacy field
    batchId: { type: String, index: true },
    
    // Hashes & verification
    metadataHash: { type: String, required: true, index: true },
    artifactHash: { type: String },
    sha256: { type: String, index: true }, // Legacy field
    qrCodeData: { type: String },
    
    // File paths
    pdfPath: { type: String },
    pdf_url: { type: String }, // Legacy field
    jsonLdPath: { type: String },
    proofPath: { type: String },
    proof_json_path: { type: String }, // Legacy field
    
    // IPFS
    ipfsCid: { type: String },
    ipfs_cid: { type: String }, // Legacy field
    
    // Revocation
    revokedAt: { type: Date },
    revoked_at: { type: Date }, // Legacy field
    revocationReason: { type: String },
    revocation_reason: { type: String }, // Legacy field
    
    // Additional metadata
    meta: { type: mongoose.Schema.Types.Mixed },
    storage: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true
  }
);

// Indexes
CertificateSchema.index({ studentUniqueCode: 1, institute: 1 });
CertificateSchema.index({ student_unique_code: 1, institute_code: 1 }); // Legacy index
CertificateSchema.index({ learner: 1, course: 1 });
CertificateSchema.index({ merkleRoot: 1 });

module.exports = mongoose.model('Certificate', CertificateSchema);
