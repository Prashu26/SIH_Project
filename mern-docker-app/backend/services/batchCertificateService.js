/**
 * Batch Certificate Generation Service with Template Support
 * 
 * This service handles:
 * - Creating user accounts from CSV
 * - Generating certificates using templates
 * - Sending PDFs and login credentials via email
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const Template = require('../models/Template');

const emailService = require('./emailService');
const htmlPdfService = require('./htmlPdfService');
const logger = require('../utils/logger');

// Create certificates directory if it doesn't exist
const certificatesDir = path.join(__dirname, '..', 'generated', 'certificates');
if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir, { recursive: true });
  logger.info(`📁 Created certificates directory: ${certificatesDir}`);
}

/**
 * Generate a random secure password
 */
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Process batch certificate generation from CSV data
 * 
 * CSV Expected columns:
 * - name (required)
 * - email (required)
 * - Additional template fields as needed
 */
async function processBatchCertificates({
  csvData,
  templateId,
  instituteId,
  instituteName,
  courseId,
  courseName
}) {
  const results = {
    success: [],
    failed: [],
    total: csvData.length
  };

  // Validate template exists
  const template = await Template.findOne({ _id: templateId, institute: instituteId });
  if (!template) {
    throw new Error('Template not found or access denied');
  }

  // Find or create course
  let course = null;
  if (courseId) {
    course = await Course.findById(courseId);
  } else if (courseName) {
    course = await Course.findOne({
      title: new RegExp(`^${courseName}$`, 'i'),
      institute: instituteId
    });
    
    if (!course) {
      // Generate unique course code to avoid duplicate key errors
      const courseCode = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      course = await Course.create({
        title: courseName,
        description: `Batch certificate course for ${courseName}`,
        institute: instituteId,
        courseCode: courseCode,
        modules: ['General']
      });
    }
  } else {
    // If no courseName provided, find or create a default course
    const defaultCourseName = 'Batch Certificate Course';
    
    course = await Course.findOne({
      title: defaultCourseName,
      institute: instituteId
    });
    
    if (!course) {
      const courseCode = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      course = await Course.create({
        title: defaultCourseName,
        description: 'Default batch certificate course',
        institute: instituteId,
        courseCode: courseCode,
        modules: ['General']
      });
    }
  }

  // Process each row
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    
    try {
      const result = await processSingleCertificate({
        row,
        template,
        instituteId,
        instituteName,
        course
      });
      
      results.success.push({
        rowIndex: i + 1,
        email: row.email,
        certificateId: result.certificateId,
        userCreated: result.userCreated,
        password: result.password
      });
      
      logger.info(`✅ Processed certificate for ${row.email}`);
      
    } catch (error) {
      results.failed.push({
        rowIndex: i + 1,
        email: row.email || 'unknown',
        error: error.message
      });
      
      logger.error(`❌ Failed to process certificate for row ${i + 1}:`, error);
    }
  }

  return results;
}

/**
 * Process a single certificate from batch
 */
async function processSingleCertificate({
  row,
  template,
  instituteId,
  instituteName,
  course
}) {
  // Validate required fields
  if (!row.email || !row.name) {
    throw new Error('Email and name are required fields');
  }

  const email = row.email.toLowerCase().trim();
  const name = row.name.trim();

  // Check if user exists
  let user = await User.findOne({ email, role: 'learner' });
  let userCreated = false;
  let temporaryPassword = null;

  if (!user) {
    // Create new user account
    temporaryPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const learnerId = `LRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'learner',
      learnerProfile: {
        learnerId,
        courses: [course._id]
      }
    });

    userCreated = true;
    logger.info(`Created new user account: ${email}`);
  } else {
    // Ensure user has the course
    if (!user.learnerProfile) {
      user.learnerProfile = { courses: [] };
    }
    if (!user.learnerProfile.courses) {
      user.learnerProfile.courses = [];
    }

    const courseIdString = course._id.toString();
    const hasCourse = user.learnerProfile.courses.some(
      cid => cid.toString() === courseIdString
    );

    if (!hasCourse) {
      user.learnerProfile.courses.push(course._id);
      await user.save();
    }
  }

  // Generate Certificate ID
  const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Prepare certificate data from CSV row and template fields
  const certificateData = {
    certificateId,
    name,
    email,
    course: course.title,
    learnerName: name, // Add explicit mapping
    courseName: course.title, // Add explicit mapping
    ...row // Include all CSV columns as template data
  };

  // Debug log - show actual data values
  logger.info(`🎨 Generating certificate for ${name}`);
  logger.info(`📋 Certificate data:`, JSON.stringify(certificateData, null, 2));
  logger.info(`📝 Template has ${template.fields ? template.fields.length : 0} fields`);
  if (template.fields) {
    template.fields.forEach(f => {
      const value = certificateData[f.key];
      logger.info(`   Field "${f.key}" → "${value || 'NOT FOUND'}"`);
    });
  }

  // Generate PDF from template
  const pdfResult = await htmlPdfService.generatePdfFromTemplate(
    template,
    certificateData,
    { maxWidth: 800, maxHeight: 565 }
  );

  const pdfBuffer = pdfResult.pdfBuffer;

  // Calculate PDF hash for verification
  const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const formattedHash = '0x' + pdfHash;

  // Create certificate record in database
  const certificate = await Certificate.create({
    certificateId,
    studentUniqueCode: user.learnerProfile?.learnerId || email,
    learner: user._id,
    institute: instituteId,
    course: course._id,
    artifactHash: formattedHash,
    pdfHash: formattedHash,
    sha256: formattedHash,
    metadataHash: formattedHash,
    status: 'Issued',
    issueDate: new Date(),
    modulesAwarded: course.modules || []
  });

  logger.info(`Certificate created: ${certificateId} for ${email}`);

  // Save PDF to local file system
  const pdfFilename = `${certificateId}.pdf`;
  const pdfPath = path.join(certificatesDir, pdfFilename);
  fs.writeFileSync(pdfPath, pdfBuffer);
  logger.info(`💾 PDF saved to: ${pdfPath}`);

  // Try to send email with PDF and credentials (non-blocking)
  try {
    await sendCertificateWithCredentials({
      user,
      certificate,
      course,
      instituteName,
      pdfBuffer,
      certificateId,
      temporaryPassword,
      userCreated
    });
    logger.info(`✅ Email sent successfully to ${email}`);
  } catch (emailError) {
    // Log warning but don't fail the entire process
    logger.warn(`⚠️ Email delivery failed for ${email}: ${emailError.message}`);
    if (userCreated) {
      logger.warn(`⚠️ NEW USER - Certificate created but email not sent. Login credentials: email=${email}, password=${temporaryPassword}`);
    } else {
      logger.warn(`⚠️ EXISTING USER - Certificate created but email not sent. User: ${email} (password unchanged)`);
    }
  }

  return {
    certificateId,
    userId: user._id,
    userCreated,
    password: temporaryPassword,
    emailSent: true, // Will be caught by try-catch if it fails
    pdfHash: formattedHash
  };
}

/**
 * Send email with certificate PDF and login credentials
 */
async function sendCertificateWithCredentials({
  user,
  certificate,
  course,
  instituteName,
  pdfBuffer,
  certificateId,
  temporaryPassword,
  userCreated
}) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/verify`;

  // Build email content
  let emailSubject = `🎓 Your Certificate from ${instituteName}`;
  
  let emailText = `Dear ${user.name},\n\nCongratulations! 🎉\n\n`;
  emailText += `You have been awarded a certificate for completing: ${course.title}\n\n`;
  emailText += `Certificate Details:\n`;
  emailText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  emailText += `📋 Certificate ID: ${certificateId}\n`;
  emailText += `📧 Recipient: ${user.email}\n`;
  emailText += `🏛️  Issued by: ${instituteName}\n`;
  emailText += `📚 Course: ${course.title}\n`;
  emailText += `📅 Issue Date: ${new Date().toLocaleDateString()}\n`;
  emailText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (userCreated) {
    emailText += `🔐 YOUR LOGIN CREDENTIALS:\n`;
    emailText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailText += `📧 Email: ${user.email}\n`;
    emailText += `🔑 Temporary Password: ${temporaryPassword}\n`;
    emailText += `🌐 Login URL: ${frontendUrl}/login\n`;
    emailText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    emailText += `⚠️  IMPORTANT: Please change your password after first login for security.\n\n`;
  }

  emailText += `📎 Your certificate PDF is attached to this email.\n\n`;
  emailText += `🔍 To verify your certificate:\n`;
  emailText += `1. Visit: ${verifyUrl}\n`;
  emailText += `2. Upload the attached PDF file\n`;
  emailText += `3. The system will verify its authenticity\n\n`;
  emailText += `Keep this certificate safe. You can verify it anytime.\n\n`;
  emailText += `Best regards,\n`;
  emailText += `${instituteName}\n\n`;
  emailText += `---\n`;
  emailText += `This is an automated email. Please do not reply to this message.`;

  try {
    await emailService.sendCertificateEmail({
      to: user.email,
      subject: emailSubject,
      text: emailText,
      pdfBuffer,
      pdfFilename: `${certificateId}.pdf`
    });

    logger.info(`✅ Email sent successfully to ${user.email}`);
  } catch (emailError) {
    logger.error(`❌ Failed to send email to ${user.email}:`, emailError);
    throw new Error(`Email delivery failed: ${emailError.message}`);
  }
}

module.exports = {
  processBatchCertificates,
  generateSecurePassword
};
