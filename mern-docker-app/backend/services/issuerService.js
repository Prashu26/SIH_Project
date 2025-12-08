const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');

const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const Batch = require('../models/Batch');
const Institute = require('../models/Institute');

const { generateCertificatePDF } = require('./pdfGenerator');
const { uploadToIPFS } = require('./ipfs');
const BlockchainService = require('./blockchainService');
const blockchainService = new BlockchainService();
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
    father_name: pickString(row.fatherName) || pickString(row.father_name),
    mother_name: pickString(row.motherName) || pickString(row.mother_name),
    dob: pickString(row.dob) || pickString(row.date_of_birth),
    institute_name: pickString(row.instituteName) || pickString(row.institute_name) || institute.name,
    address: pickString(row.address),
    district: pickString(row.district),
    state: pickString(row.state),
    trade: pickString(row.trade) || courseName,
    nsqf_level: pickString(row.nsqfLevel) || pickString(row.nsqf_level) || pickString(row.nsqf),
    duration: pickString(row.duration),
    session: pickString(row.session),
    test_month: pickString(row.testMonth) || pickString(row.test_month),
    test_year: pickString(row.testYear) || pickString(row.test_year),
    course_name: courseName,
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

  const sha256 = BlockchainService.calculateHash(pdfBuffer);
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
    
    // New Fields
    fatherName: templatePayload.father_name,
    motherName: templatePayload.mother_name,
    dob: templatePayload.dob,
    address: templatePayload.address,
    district: templatePayload.district,
    state: templatePayload.state,
    trade: templatePayload.trade,
    duration: templatePayload.duration,
    session: templatePayload.session,
    testMonth: templatePayload.test_month,
    testYear: templatePayload.test_year,
    ncvqLevel: templatePayload.nsqf_level,
    nsqfLevel: templatePayload.nsqf_level,

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
    pdfHash: sha256,
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
      const hashes = processed.map(p => p.sha256);
      anchorResult = await blockchainService.anchorDocuments(hashes);
      
      // Update batch
      batch.root_hash = anchorResult.root;
      batch.transaction_hash = anchorResult.txHash;
      await batch.save();

      // Update certificates with proofs
      for (const certData of processed) {
         const proof = anchorResult.proofs[certData.sha256];
         await Certificate.findOneAndUpdate(
             { certificate_id: certData.certificate_id },
             { 
                 merkleProof: proof,
                 merkleRoot: anchorResult.root,
                 batchId: anchorResult.batchId,
                 blockchainTxHash: anchorResult.txHash,
                 status: 'ISSUED'
             }
         );
      }
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
  const batch = await Batch.findOne({ batch_id: batchId }).populate('certificate_ids');
  if (!batch) throw new Error('Batch not found');
  
  const hashes = batch.certificate_ids.map(c => c.pdfHash || c.sha256);
  return blockchainService.anchorDocuments(hashes);
}

async function generateProofPackage(certificateId) {
  const certificate = await Certificate.findOne({ certificate_id: certificateId }).populate('institute');
  if (!certificate) throw new Error('Certificate not found');

  const zip = new AdmZip();
  
  // Add PDF
  const pdfPath = path.join(BACKEND_ROOT, certificate.pdf_url || certificate.storage.pdf_path);
  if (fs.existsSync(pdfPath)) {
    zip.addLocalFile(pdfPath);
  } else {
    throw new Error('Certificate PDF file not found');
  }

  // Add Proof JSON
  const proofData = {
    version: "1.0",
    certificateId: certificate.certificate_id,
    hash: certificate.pdfHash || certificate.sha256,
    merkleRoot: certificate.merkleRoot,
    merkleProof: certificate.merkleProof,
    batchId: certificate.batchId,
    txHash: certificate.blockchainTxHash,
    issuer: {
      name: certificate.institute.name,
      id: certificate.institute_code,
      publicKey: process.env.ISSUER_PUBLIC_KEY // Assuming this env var exists or we get it from somewhere
    },
    issuedAt: certificate.issueDate
  };

  zip.addFile("proof.json", Buffer.from(JSON.stringify(proofData, null, 2)));

  const zipPath = path.join(CERTIFICATE_OUTPUT_DIR, `${certificateId}_proof.zip`);
  zip.writeZip(zipPath);
  
  return zipPath;
}

module.exports = {
  createBatchFromCsv,
  getBatchById,
  listBatchesForInstitute,
  reanchorBatch,
  generateProofPackage
};
