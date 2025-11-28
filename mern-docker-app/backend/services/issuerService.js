const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');

const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const Batch = require('../models/Batch');
const Institute = require('../models/Institute');

const { generateCertificatePDF } = require('./pdfGenerator');
const { uploadToIPFS } = require('./ipfs');
const { anchorBatch } = require('./blockchain');
const logger = require('../utils/logger');

const BACKEND_ROOT = path.join(__dirname, '..');
const CERTIFICATE_OUTPUT_DIR = path.join(BACKEND_ROOT, 'certificates');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalisePath(absolutePath) {
  return path.relative(BACKEND_ROOT, absolutePath).replace(/\\/g, '/');
}

function parseCsv(filePath) {
  const csvBuffer = fs.readFileSync(filePath);
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  if (!records.length) {
    throw new Error('Uploaded CSV is empty. Please provide at least one record.');
  }

  return records;
}

function pickString(value) {
  if (typeof value === 'string') return value.trim();
  return value ? String(value).trim() : '';
}

function buildTemplatePayload({ certificateId, studentRecord, institute, row }) {
  const studentName = pickString(row.student_name) || pickString(row.studentName) || `${pickString(row.first_name)} ${pickString(row.last_name)}`.trim() || pickString(studentRecord.first_name) || pickString(studentRecord.metadata?.full_name) || studentRecord.student_unique_code;
  const courseName = pickString(row.course_name) || pickString(row.course) || pickString(row.course_title) || 'Certified Course';
  const issueDate = pickString(row.issue_date) || new Date().toISOString().split('T')[0];

  return {
    certificate_id: certificateId,
    student_name: studentName,
    course_name: courseName,
    institute_name: institute.name,
    issue_date: issueDate,
    verification_url: process.env.VERIFICATION_BASE_URL || `${process.env.API_BASE_URL || 'http://localhost:8080'}`
  };
}

async function upsertStudent({ student_unique_code, row, institute_code }) {
  const update = {
    student_unique_code,
    institute_code,
    first_name: pickString(row.first_name) || undefined,
    last_name: pickString(row.last_name) || undefined,
    email: pickString(row.email) || undefined,
    phone: pickString(row.phone) || undefined,
    metadata: row
  };

  const student = await Student.findOneAndUpdate(
    { student_unique_code },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return student;
}

async function handleCertificateRecord({ row, institute, batch, options }) {
  const studentCode = pickString(row.student_unique_code) || pickString(row.studentUniqueCode);
  if (!studentCode) {
    throw new Error('CSV row missing required column "student_unique_code".');
  }

  const student = await upsertStudent({
    student_unique_code: studentCode,
    row,
    institute_code: institute.institute_code
  });

  const certificateId = uuidv4();
  const templatePayload = buildTemplatePayload({ certificateId, studentRecord: student, institute, row });
  const { pdfBuffer, filePath } = await generateCertificatePDF(templatePayload);

  ensureDir(CERTIFICATE_OUTPUT_DIR);

  const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const relativePdfPath = normalisePath(filePath);

  let ipfsCid;
  if (options.useIpfs) {
    try {
      ipfsCid = await uploadToIPFS(pdfBuffer, `${certificateId}.pdf`);
    } catch (error) {
      logger.error('IPFS upload failed for certificate %s: %s', certificateId, error.message);
    }
  }

  const certificate = await Certificate.create({
    certificate_id: certificateId,
    student_unique_code: studentCode,
    institute_code: institute.institute_code,
    batch: batch._id,
    student: student._id,
    institute: institute._id,
    meta: {
      ...row,
      certificate_id: certificateId,
      course_name: templatePayload.course_name,
      student_name: templatePayload.student_name,
      issue_date: templatePayload.issue_date
    },
    pdf_url: relativePdfPath,
    ipfs_cid: ipfsCid,
    sha256,
    status: 'READY',
    storage: {
      pdf_path: relativePdfPath,
      ...(ipfsCid ? { ipfs_cid: ipfsCid } : {})
    }
  });

  batch.certificate_ids.push(certificate._id);

  return {
    certificate_id: certificate.certificate_id,
    sha256,
    student_unique_code: studentCode
  };
}

async function createBatchFromCsv({ instituteCode, csvPath, options = {} }) {
  const institute = await Institute.findOne({ institute_code: instituteCode, status: 'approved' });
  if (!institute) {
    throw new Error(`Institute with code ${instituteCode} not found or not approved.`);
  }

  const rows = parseCsv(csvPath);
  const batchId = uuidv4();

  const batch = await Batch.create({
    batch_id: batchId,
    institute_code: instituteCode,
    status: 'PENDING',
    leaf_count: rows.length,
    certificate_ids: []
  });

  const processed = [];
  for (const row of rows) {
    try {
      const result = await handleCertificateRecord({
        row,
        institute,
        batch,
        options: {
          useIpfs: options.useIpfs ?? process.env.USE_IPFS === 'true'
        }
      });
      processed.push(result);
    } catch (error) {
      logger.error('Failed processing row for student %s: %s', row.student_unique_code || row.studentUniqueCode || 'N/A', error.message);
      throw error;
    }
  }

  batch.leaf_count = processed.length;
  await batch.save();

  let anchorResult = null;
  if (options.anchor !== false) {
    try {
      anchorResult = await anchorBatch(batch.batch_id, instituteCode);
    } catch (error) {
      logger.error('Batch %s anchoring failed: %s', batch.batch_id, error.message);
    }
  }

  return {
    batch_id: batch.batch_id,
    institute_code: instituteCode,
    total_certificates: processed.length,
    anchor: anchorResult,
    certificates: processed
  };
}

async function getBatchById(batchId) {
  const batch = await Batch.findOne({ batch_id: batchId }).populate('certificate_ids');
  if (!batch) {
    return null;
  }

  return batch;
}

async function listBatchesForInstitute(instituteCode, { limit = 20, page = 1 } = {}) {
  const query = { institute_code: instituteCode };
  const batches = await Batch.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-certificate_ids');

  const total = await Batch.countDocuments(query);

  return {
    total,
    page,
    pageSize: limit,
    batches
  };
}

async function reanchorBatch(batchId, instituteCode) {
  return anchorBatch(batchId, instituteCode);
}

module.exports = {
  createBatchFromCsv,
  getBatchById,
  listBatchesForInstitute,
  reanchorBatch
};
