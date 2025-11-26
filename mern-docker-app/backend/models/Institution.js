const mongoose = require('mongoose');

const InstitutionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  regId: { type: String, unique: true },
  verificationKey: { type: String },
  role: { type: String, default: 'Institution' }
}, { timestamps: true });

module.exports = mongoose.model('Institution', InstitutionSchema);
