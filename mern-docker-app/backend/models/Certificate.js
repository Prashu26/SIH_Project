const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  learner: { type: mongoose.Schema.Types.ObjectId, ref: 'Learner', required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  courseName: { type: String },
  skillsAcquired: { type: [String], default: [] },
  issueDate: { type: Date, default: Date.now },
  validUntil: { type: Date },
  qrCodeData: { type: String },
  metadataHash: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
