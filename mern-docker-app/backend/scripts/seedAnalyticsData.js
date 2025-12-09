const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Organization = require('../models/Organization');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedOrganizationAnalyticsData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create or find institute user
    let instituteUser = await User.findOne({ email: 'institute@analytics.com' });
    if (!instituteUser) {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      instituteUser = new User({
        name: 'Analytics Institute',
        email: 'institute@analytics.com',
        password: hashedPassword,
        role: 'institute',
        isApproved: true
      });
      await instituteUser.save();
      console.log('✅ Institute user created');
    }

    // Create or find learner users
    const learnerEmails = [
      'learner1@example.com',
      'learner2@example.com',
      'learner3@example.com',
      'learner4@example.com',
      'learner5@example.com'
    ];

    const learnerUsers = [];
    for (const email of learnerEmails) {
      let learner = await User.findOne({ email });
      if (!learner) {
        const hashedPassword = await bcrypt.hash('Password@123', 10);
        learner = new User({
          name: email.split('@')[0],
          email,
          password: hashedPassword,
          role: 'learner',
          isApproved: true
        });
        await learner.save();
      }
      learnerUsers.push(learner);
    }

    // Create organization
    let organization = await Organization.findOne({ email: 'analytics@organization.com' });
    if (!organization) {
      const hashedPassword = await bcrypt.hash('OrgPassword@123', 10);
      organization = new Organization({
        organizationName: 'Digital Excellence Institute',
        industry: 'Professional Development & Training',
        registrationId: 'ORG-DEI-2024-001',
        email: 'analytics@organization.com',
        contactNumber: '+91-8765432100',
        headOfficeLocation: {
          address: '456 Innovation Drive, Tech Park',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
          pincode: '500081'
        },
        website: 'https://digitalexcellence.edu',
        linkedinProfile: 'https://linkedin.com/company/digitalexcellence',
        profileDescription: 'Leading institute for digital transformation and professional certifications.',
        password: hashedPassword,
        contactPerson: {
          name: 'Dr. Rajesh Sharma',
          designation: 'Chief Executive Officer',
          email: 'rajesh.sharma@digitalexcellence.com',
          phone: '+91-8765432100'
        },
        stats: {
          certificatesVerified: 487,
          studentsContacted: 2150,
          activeConversations: 87
        },
        isVerified: true,
        isActive: true
      });
      await organization.save();
      console.log('✅ Organization created:', organization.organizationName);
    } else {
      organization.stats = {
        certificatesVerified: 487,
        studentsContacted: 2150,
        activeConversations: 87
      };
      await organization.save();
      console.log('✅ Organization updated with stats');
    }

    // Create courses
    const courseData = [
      {
        title: 'Advanced Full Stack Development',
        courseCode: 'COURSE-FS-001',
        description: 'Master modern web development with MERN stack',
        modules: ['React Fundamentals', 'Node.js Backend', 'Database Design', 'Authentication', 'Deployment', 'Real-time Systems'],
        duration: 6,
        ncvqLevel: 'Level 4',
        institute: instituteUser._id
      },
      {
        title: 'Machine Learning & AI Foundations',
        courseCode: 'COURSE-ML-001',
        description: 'Deep dive into machine learning algorithms and applications',
        modules: ['Python & Libraries', 'Statistics', 'Supervised Learning', 'Unsupervised Learning', 'Deep Learning', 'Practical Projects'],
        duration: 4,
        ncvqLevel: 'Level 4',
        institute: instituteUser._id
      },
      {
        title: 'Cloud Architecture with AWS',
        courseCode: 'COURSE-AWS-001',
        description: 'Design and deploy scalable cloud solutions',
        modules: ['AWS Core Services', 'Networking', 'Storage Solutions', 'Security', 'Microservices', 'DevOps'],
        duration: 3,
        ncvqLevel: 'Level 3',
        institute: instituteUser._id
      },
      {
        title: 'Cybersecurity Professional',
        courseCode: 'COURSE-CS-001',
        description: 'Comprehensive cybersecurity training',
        modules: ['Network Security', 'Encryption', 'Incident Response', 'Compliance', 'Penetration Testing', 'Advanced Defense'],
        duration: 5,
        ncvqLevel: 'Level 4',
        institute: instituteUser._id
      },
      {
        title: 'Data Science Mastery',
        courseCode: 'COURSE-DS-001',
        description: 'Transform data into actionable insights',
        modules: ['Data Analysis', 'Visualization', 'Statistics', 'Big Data', 'BI Tools', 'Case Studies'],
        duration: 4,
        ncvqLevel: 'Level 4',
        institute: instituteUser._id
      }
    ];

    const createdCourses = [];
    for (const course of courseData) {
      let existingCourse = await Course.findOne({ title: course.title });
      if (!existingCourse) {
        existingCourse = new Course(course);
        await existingCourse.save();
        console.log('✅ Course created:', course.title);
      }
      createdCourses.push(existingCourse);
    }

    // Create sample certificates with realistic data
    const certificateData = [];
    const startDate = new Date('2024-01-01');
    
    // Generate 50+ certificates spread across 6 months
    let certCounter = 1;
    for (let month = 0; month < 6; month++) {
      const monthStart = new Date(2024, month, 1);
      const certificatesPerMonth = month === 5 ? 8 : Math.floor(Math.random() * 4) + 8;

      for (let i = 0; i < certificatesPerMonth; i++) {
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const issueDate = new Date(2024, month, randomDay);
        
        const courseIndex = i % createdCourses.length;
        const learnerIndex = i % learnerUsers.length;
        const status = Math.random() > 0.15 ? 'Issued' : 'Pending';
        
        certificateData.push({
          certificateId: `CERT-${String(certCounter).padStart(5, '0')}`,
          studentUniqueCode: `STU-${String(certCounter).padStart(4, '0')}`,
          organizationId: organization._id,
          learner: learnerUsers[learnerIndex]._id,
          institute: instituteUser._id,
          course: createdCourses[courseIndex]._id,
          issueDate,
          validUntil: new Date(issueDate.getFullYear() + 2, issueDate.getMonth(), issueDate.getDate()),
          status,
          blockchainTxHash: status === 'Issued' ? `0x${Math.random().toString(16).substring(2)}` : null,
          merkleRoot: status === 'Issued' ? `0x${Math.random().toString(16).substring(2)}` : null,
          ncvqLevel: 'Level 4',
          credentialType: 'Professional Certificate'
        });
        certCounter++;
      }
    }

    // Insert certificates
    for (const certData of certificateData) {
      const exists = await Certificate.findOne({ certificateId: certData.certificateId });
      if (!exists) {
        const certificate = new Certificate(certData);
        await certificate.save();
      }
    }
    console.log(`✅ Created ${certificateData.length} certificates`);

    // Fetch updated data for summary
    const totalCerts = await Certificate.countDocuments({ organizationId: organization._id });
    const issuedCerts = await Certificate.countDocuments({ organizationId: organization._id, status: 'Issued' });
    const pendingCerts = await Certificate.countDocuments({ organizationId: organization._id, status: 'Pending' });
    const verifiedCerts = await Certificate.countDocuments({ organizationId: organization._id, blockchainTxHash: { $exists: true, $ne: null } });

    console.log('\n✅ Analytics Data Seeding Completed!');
    console.log('\n📊 Dashboard Statistics:');
    console.log('   Organization:', organization.organizationName);
    console.log('   Email:', organization.email);
    console.log('   Total Certificates:', totalCerts);
    console.log('   Issued:', issuedCerts);
    console.log('   Pending:', pendingCerts);
    console.log('   Blockchain Verified:', verifiedCerts);
    console.log('   Total Courses:', createdCourses.length);
    console.log('   Unique Learners:', learnerUsers.length);
    console.log('\n💾 Login Credentials:');
    console.log('   Organization Email: analytics@organization.com');
    console.log('   Organization Password: OrgPassword@123');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

seedOrganizationAnalyticsData();
