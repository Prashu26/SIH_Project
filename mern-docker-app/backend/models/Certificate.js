const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    modulesAwarded: { type: [String], default: [] },
    issueDate: { type: Date, default: Date.now },
    validUntil: { type: Date },
    pdfPath: { type: String },
    qrCodeData: { type: String },
    metadataHash: { type: String },
    status: { type: String, enum: ['Issued', 'Revoked'], default: 'Issued' },
  },
  { timestamps: true }
);

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
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Certificate', CertificateSchema);
