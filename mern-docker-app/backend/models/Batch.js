const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  batch_id: {
    type: String,
    required: true,
    unique: true
  },
  institute_code: {
    type: String,
    required: true,
    index: true
  },
  root_hash: {
    type: String,
    default: null
  },
  anchored_tx: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'ANCHORED', 'FAILED'],
    default: 'PENDING'
  },
  leaf_count: {
    type: Number,
    required: true
  },
  certificate_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  }]
}, {
  timestamps: true
});

// Index for faster lookups
BatchSchema.index({ institute_code: 1, status: 1 });
BatchSchema.index({ anchored_tx: 1 });

module.exports = mongoose.model('Batch', BatchSchema);
