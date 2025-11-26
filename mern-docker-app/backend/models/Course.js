const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    platform: { type: String, trim: true },
    modules: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'Course must contain at least one module title.',
      },
      required: true,
    },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedInstitutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', CourseSchema);
