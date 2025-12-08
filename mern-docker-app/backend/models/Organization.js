const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  // Basic Organization Information
  organizationName: { type: String, required: true, trim: true },
  industry: { type: String, required: true, trim: true },
  registrationId: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  
  // Location & Web Presence
  headOfficeLocation: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    pincode: { type: String }
  },
  
  website: { type: String, trim: true },
  linkedinProfile: { type: String, trim: true },
  profileDescription: { type: String, maxlength: 1000 },
  
  // Authentication
  password: { type: String, required: true },
  
  // Hiring Requirements
  hiringRequirements: [{
    skillSets: [{ type: String }], // e.g., ['MERN', 'Data Science', 'Cloud']
    numberOfPositions: { type: Number, required: true, min: 1 },
    minimumQualification: { type: String }, // Degree/Course/Certificate
    experienceLevel: { 
      type: String, 
      enum: ['Fresher', 'Junior (1-2 years)', 'Mid-level (2-5 years)', 'Senior (5+ years)'],
      required: true 
    },
    technicalSkills: [{ type: String }],
    softSkills: [{ type: String }],
    jobType: {
      type: String,
      enum: ['Full-time', 'Internship', 'Hybrid', 'Remote', 'Contract'],
      required: true
    },
    jobTitle: { type: String, required: true },
    salaryRange: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: 'INR' }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Organization Status
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Additional fields for organization management
  contactPerson: {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  
  // Verification documents (file paths)
  documents: {
    registrationCertificate: { type: String },
    taxId: { type: String },
    otherDocuments: [{ type: String }]
  },
  
  // Statistics and tracking
  stats: {
    certificatesVerified: { type: Number, default: 0 },
    studentsContacted: { type: Number, default: 0 },
    activeConversations: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ registrationId: 1 });
OrganizationSchema.index({ 'hiringRequirements.skillSets': 1 });
OrganizationSchema.index({ 'hiringRequirements.jobType': 1 });
OrganizationSchema.index({ industry: 1 });
OrganizationSchema.index({ isActive: 1, isVerified: 1 });

// Remove password from JSON output
OrganizationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

// Virtual for active hiring requirements
OrganizationSchema.virtual('activeHiringRequirements').get(function() {
  return this.hiringRequirements.filter(req => req.isActive);
});

module.exports = mongoose.model('Organization', OrganizationSchema);