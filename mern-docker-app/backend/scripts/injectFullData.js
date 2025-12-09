const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { seedDemoUsers } = require('./seedDemoUsers');
const { seedLearnerBatch } = require('./seedLearnerBatch');
const { seedCoursesFromTemplate } = require('./seedCoursesFromTemplate');

const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const { v4: uuidv4 } = require('uuid');

async function injectCertificates() {
  console.log('🌱 Starting certificate injection...');

  const institute = await User.findOne({ email: 'institute@example.com' });
  if (!institute) {
    console.error('❌ Institute not found. Cannot inject certificates.');
    return;
  }

  const learners = await User.find({ role: 'learner' });
  if (learners.length === 0) {
    console.error('❌ No learners found. Cannot inject certificates.');
    return;
  }

  const courses = await Course.find({ institute: institute._id });
  if (courses.length === 0) {
    console.error('❌ No courses found. Cannot inject certificates.');
    return;
  }

  let certCount = 0;

  for (const learner of learners) {
    // Assign 1-3 random courses to each learner
    const numCourses = Math.floor(Math.random() * 3) + 1;
    const shuffledCourses = courses.sort(() => 0.5 - Math.random()).slice(0, numCourses);

    for (const course of shuffledCourses) {
      const certId = `CERT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const studentUniqueCode = learner.learnerProfile?.learnerId || `LRN-${Math.floor(Math.random() * 10000)}`;

      const existingCert = await Certificate.findOne({
        learner: learner._id,
        course: course._id
      });

      if (existingCert) {
        console.log(`⚠️  Certificate already exists for ${learner.name} - ${course.title}`);
        continue;
      }

      const certificate = new Certificate({
        certificateId: certId,
        studentUniqueCode: studentUniqueCode,
        learner: learner._id,
        institute: institute._id,
        course: course._id,
        modulesAwarded: course.modules,
        issueDate: new Date(),
        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 2)), // Valid for 2 years
        
        // Personal Details
        fatherName: "John Doe Sr.",
        motherName: "Jane Doe",
        dob: "2000-01-01",
        
        // Status
        status: 'Issued',
        
        // Dummy Blockchain/Hash Data
        blockchainTxHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        merkleRoot: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        pdfHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        metadataHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        
        // Dummy File Paths
        pdfPath: `/uploads/certificates/${certId}.pdf`,
        
        meta: {
          injected: true
        }
      });

      await certificate.save();
      
      // Update learner profile
      if (!learner.learnerProfile.courses.includes(course._id)) {
        learner.learnerProfile.courses.push(course._id);
        await learner.save();
      }

      console.log(`✅ Issued certificate ${certId} to ${learner.name} for ${course.title}`);
      certCount++;
    }
  }

  console.log(`🎉 Injected ${certCount} certificates successfully!`);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mernapp';

  console.log(`Connecting to MongoDB at ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connection established');

    // 1. Seed Users
    await seedDemoUsers();
    
    // 2. Seed Learner Batch
    await seedLearnerBatch();

    // 3. Seed Courses
    await seedCoursesFromTemplate();

    // 4. Inject Certificates
    await injectCertificates();

    console.log('All data injection complete!');
  } catch (err) {
    console.error('Failed to inject data:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('MongoDB connection closed');
  }
}

main();
