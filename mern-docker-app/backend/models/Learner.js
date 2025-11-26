const mongoose = require('mongoose');

const LearnerSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  learnerId: { type: String, required: true, unique: true },
  skills: { type: [String], default: [] },
  role: { type: String, default: 'Learner' }
}, { timestamps: true });

module.exports = mongoose.model('Learner', LearnerSchema);
