const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ownerEmail: { type: String, index: true },
    storagePath: { type: String },
    fileName: { type: String },
    fileMime: { type: String },
    fileSize: { type: Number },
    sha256: { type: String, index: true },
      signature: { type: String },
      anchoredTx: { type: String },
      batchId: { type: String },
      merkleRoot: { type: String },
      merkleProof: { type: [String], default: [] },
      revoked: { type: Boolean, default: false },
      revokedAt: { type: Date },
    validUntil: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);
