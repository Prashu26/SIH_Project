const mongoose = require('mongoose');

const STATUSES = ['Pending', 'Approved', 'Rejected'];

const ModuleProofSchema = new mongoose.Schema(
  {
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleTitle: { type: String, required: true, trim: true },
    proofPath: { type: String },
    notes: { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: 'Pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModuleProof', ModuleProofSchema);
