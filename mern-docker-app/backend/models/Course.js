const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    courseCode: { type: String, trim: true },
    description: { type: String, trim: true },
    platform: { type: String, trim: true },
    modules: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Course must contain at least one module title.',
      },
      required: true,
    },
    duration: { type: Number, default: null },
    ncvqLevel: { type: String, trim: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedInstitutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

CourseSchema.index({ institute: 1, title: 1 }, { unique: true });
CourseSchema.index({ institute: 1, courseCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Course', CourseSchema);
