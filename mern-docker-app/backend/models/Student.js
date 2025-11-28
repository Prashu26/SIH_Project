const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    student_unique_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    first_name: {
      type: String,
      trim: true
    },
    last_name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    institute_code: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

StudentSchema.index({ institute_code: 1, student_unique_code: 1 });

module.exports = mongoose.model('Student', StudentSchema);
