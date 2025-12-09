const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const htmlPdfService = require('../services/htmlPdfService');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Storage for template assets
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const instituteId = req.user && req.user.id ? req.user.id : 'public';
      const uploadDir = path.join(__dirname, '..', 'uploads', 'templates', instituteId.toString());
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Memory storage for CSV files (batch upload)
const csvUpload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// List templates for institute
router.get('/', auth(['institute', 'institution']), async (req, res) => {
  try {
    const templates = await Template.find({ institute: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ message: 'Failed to list templates', error: err.message });
  }
});

// Get a template
router.get('/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.id, institute: req.user.id });
    if (!t) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true, template: t });
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ message: 'Failed to fetch template', error: err.message });
  }
});

// Create template (with optional background upload)
router.post('/', auth(['institute', 'institution']), upload.single('background'), async (req, res) => {
  try {
    const body = req.body || {};
    const templateObj = {
      name: body.name || `Template ${Date.now()}`,
      institute: req.user.id,
      createdBy: req.user.id,
      fields: body.fields ? JSON.parse(body.fields) : [],
      defaultFont: body.defaultFont || 'Roboto',
      defaultFontSize: body.defaultFontSize ? Number(body.defaultFontSize) : 14,
      watermark: body.watermark ? JSON.parse(body.watermark) : { invisible: true },
    };

    if (req.file) {
      // store public relative path
      templateObj.backgroundPath = `/uploads/templates/${req.user.id}/${req.file.filename}`;
    }

    const template = new Template(templateObj);
    await template.save();
    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ message: 'Failed to create template', error: err.message });
  }
});

// Upload additional asset for template
router.post('/:id/assets', auth(['institute', 'institution']), upload.single('asset'), async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.id, institute: req.user.id });
    if (!t) return res.status(404).json({ message: 'Template not found' });
    if (req.file) {
      const assetPath = `/uploads/templates/${req.user.id}/${req.file.filename}`;
      t.assets = t.assets || [];
      t.assets.push(assetPath);
      await t.save();
      return res.json({ success: true, assetPath });
    }
    res.status(400).json({ message: 'No file uploaded' });
  } catch (err) {
    console.error('Upload asset error:', err);
    res.status(500).json({ message: 'Failed to upload asset', error: err.message });
  }
});

// Update template
router.put('/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.id, institute: req.user.id });
    if (!t) return res.status(404).json({ message: 'Template not found' });

    const update = {};
    if (req.body.name) update.name = req.body.name;
    if (req.body.fields) update.fields = JSON.parse(req.body.fields);
    if (req.body.defaultFont) update.defaultFont = req.body.defaultFont;
    if (req.body.defaultFontSize) update.defaultFontSize = Number(req.body.defaultFontSize);
    if (req.body.watermark) update.watermark = JSON.parse(req.body.watermark);

    Object.assign(t, update);
    await t.save();
    res.json({ success: true, template: t });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ message: 'Failed to update template', error: err.message });
  }
});

// Delete template
router.delete('/:id', auth(['institute', 'institution']), async (req, res) => {
  try {
    const t = await Template.findOneAndDelete({ _id: req.params.id, institute: req.user.id });
    if (!t) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ message: 'Failed to delete template', error: err.message });
  }
});

// Render template preview as PDF
router.post('/:id/preview', auth(['institute', 'institution']), async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.id, institute: req.user.id }).lean();
    if (!t) return res.status(404).json({ message: 'Template not found' });

    const certificateData = req.body || {};
    // support query param ?fit=small to force a smaller single-page PDF
    const fit = req.query.fit || certificateData.fit;
    const opts = (fit === 'small' || fit === '1' || fit === 'true') ? { maxWidth: 800, maxHeight: 565 } : {};
    const result = await htmlPdfService.generatePdfFromTemplate(t, certificateData, opts);
    const pdfBuffer = result && result.pdfBuffer ? result.pdfBuffer : null;
    const renderer = result && result.renderer ? result.renderer : 'unknown';
    const pdfWidth = result && result.pdfWidth ? result.pdfWidth : null;
    const pdfHeight = result && result.pdfHeight ? result.pdfHeight : null;

    console.info('Template preview - renderer:', renderer, 'pdfBuffer length:', pdfBuffer && pdfBuffer.length, 'pdfWxH:', pdfWidth, pdfHeight);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=template-preview.pdf');
    if (pdfWidth) res.setHeader('X-PDF-Width', String(pdfWidth));
    if (pdfHeight) res.setHeader('X-PDF-Height', String(pdfHeight));
    res.setHeader('Content-Length', typeof pdfBuffer.length === 'number' ? pdfBuffer.length : Buffer.byteLength(pdfBuffer));
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Template preview error:', err);
    const advice = [];
    advice.push('If using Puppeteer, try setting PUPPETEER_EXECUTABLE_PATH to a system Chrome/Chromium binary.');
    advice.push('On macOS: PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"');
    advice.push('Or install wkhtmltopdf (brew install wkhtmltopdf) to enable a fallback renderer.');
    res.status(500).json({ message: 'Preview failed', error: err.message, advice, details: { puppeteer: err.puppeteer && err.puppeteer.message, wkhtmltopdf: err.wkhtmltopdf && err.wkhtmltopdf.message } });
  }
});

// Generate certificate PDF. Single-step flow:
// Generate PDF -> Calculate hash -> Return PDF with hash in headers
router.post('/:id/generate', auth(['institute', 'institution']), async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.id, institute: req.user.id }).lean();
    if (!t) return res.status(404).json({ message: 'Template not found' });

    const certificateData = req.body || {};
    const fit = req.query.fit || certificateData.fit;
    const opts = (fit === 'small' || fit === '1' || fit === 'true') ? { maxWidth: 800, maxHeight: 565 } : {};
    
    // Generate PDF
    const result = await htmlPdfService.generatePdfFromTemplate(t, certificateData, opts);
    const pdfBuffer = result && result.pdfBuffer ? result.pdfBuffer : null;
    const renderer = result && result.renderer ? result.renderer : 'unknown';
    const pdfWidth = result && result.pdfWidth ? result.pdfWidth : null;
    const pdfHeight = result && result.pdfHeight ? result.pdfHeight : null;
    
    // Calculate hash of generated PDF
    const crypto = require('crypto');
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const formattedHash = '0x' + pdfHash;
    
    console.info('Template generate - renderer:', renderer, 'pdfBuffer length:', pdfBuffer && pdfBuffer.length, 'hash:', formattedHash);
    
    // If recipient email provided, send the PDF as an attachment
    if (certificateData.email) {
      (async () => {
        try {
          console.info('Sending certificate PDF to', certificateData.email);
          await emailService.sendCertificateEmail({
            to: certificateData.email,
            subject: `Your certificate from ${req.user && req.user.name ? req.user.name : 'Issuer'}`,
            text: `Dear learner,\n\nPlease find attached your certificate.\n\nRegards,`,
            pdfBuffer,
            pdfFilename: `certificate-${Date.now()}.pdf`,
          });
          console.info('Certificate email sent to', certificateData.email);
        } catch (e) {
          console.error('Failed to send certificate email to', certificateData.email, e && e.message ? e.message : e);
        }
      })();
    }
    
    // Return PDF with hash in headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${Date.now()}.pdf`);
    res.setHeader('X-PDF-Hash', pdfHash);
    res.setHeader('X-PDF-Hash-Formatted', formattedHash);
    if (pdfWidth) res.setHeader('X-PDF-Width', String(pdfWidth));
    if (pdfHeight) res.setHeader('X-PDF-Height', String(pdfHeight));
    res.setHeader('Content-Length', typeof pdfBuffer.length === 'number' ? pdfBuffer.length : Buffer.byteLength(pdfBuffer));
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Template generate error:', err);
    const advice = [];
    advice.push('If using Puppeteer, try setting PUPPETEER_EXECUTABLE_PATH to a system Chrome/Chromium binary.');
    advice.push('On macOS: PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"');
    advice.push('Or install wkhtmltopdf (brew install wkhtmltopdf) to enable a fallback renderer.');
    res.status(500).json({ message: 'Generate failed', error: err.message, advice, details: { puppeteer: err.puppeteer && err.puppeteer.message, wkhtmltopdf: err.wkhtmltopdf && err.wkhtmltopdf.message } });
  }
});

// Save certificate metadata (for verification)
router.post('/:id/save-certificate', auth(['institute', 'institution']), async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const User = require('../models/User');
    const Course = require('../models/Course');
    const { certificateId, pdfHash, learnerData } = req.body;
    
    if (!certificateId || !pdfHash) {
      return res.status(400).json({ message: 'certificateId and pdfHash are required' });
    }
    
    const formattedHash = pdfHash.startsWith('0x') ? pdfHash : `0x${pdfHash}`;
    
    // Create or update certificate record
    let cert = await Certificate.findOne({ certificateId });
    if (!cert) {
      // Find or create a default learner and course for template-based certificates
      let learner = await User.findOne({ email: learnerData?.email || 'template@example.com' });
      if (!learner) {
        learner = await User.create({
          name: learnerData?.name || 'Template User',
          email: learnerData?.email || `template-${Date.now()}@example.com`,
          role: 'learner',
          password: 'temp' // Will be hashed by model
        });
      }
      
      let course = await Course.findOne({ institute: req.user.id }).limit(1);
      if (!course) {
        course = await Course.create({
          title: 'Template Certificate Course',
          institute: req.user.id,
          courseCode: `TEMPLATE-${Date.now()}`,
          description: 'Auto-generated course for template-based certificates',
          modules: ['General'] // Required field
        });
      }
      
      cert = new Certificate({
        certificateId,
        studentUniqueCode: learnerData?.email || certificateId,
        learner: learner._id,
        institute: req.user.id,
        course: course._id,
        artifactHash: formattedHash,
        pdfHash: formattedHash,
        sha256: formattedHash,
        metadataHash: formattedHash, // Set metadataHash to same value
        status: 'Issued',
        issueDate: new Date(),
      });
    } else {
      cert.artifactHash = formattedHash;
      cert.pdfHash = formattedHash;
      cert.sha256 = formattedHash;
      cert.metadataHash = formattedHash;
    }
    
    // Add learner data if provided
    if (learnerData) {
      if (learnerData.name) cert.fatherName = learnerData.name; // Store in available field
      if (learnerData.email) cert.storage = { ...cert.storage, learnerEmail: learnerData.email };
    }
    
    await cert.save();
    
    console.log(`✅ Saved certificate ${certificateId} with hash ${formattedHash}`);
    
    res.json({ success: true, certificateId, hash: formattedHash });
  } catch (err) {
    console.error('Save certificate error:', err);
    res.status(500).json({ message: 'Failed to save certificate', error: err.message, stack: err.stack });
  }
});

// Batch certificate generation from CSV
router.post('/:id/batch-generate', auth(['institute', 'institution']), csvUpload.single('csvFile'), async (req, res) => {
  try {
    const templateId = req.params.id;
    const { courseId, courseName } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }
    
    // Parse CSV file
    const csvContent = req.file.buffer ? req.file.buffer.toString('utf8') : require('fs').readFileSync(req.file.path, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV file must contain header and at least one data row' });
    }
    
    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate required columns
    if (!headers.includes('name') || !headers.includes('email')) {
      return res.status(400).json({ 
        message: 'CSV must contain "name" and "email" columns',
        found: headers
      });
    }
    
    // Parse CSV data
    const csvData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue; // Skip malformed rows
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      if (row.email && row.name) { // Only include rows with required fields
        csvData.push(row);
      }
    }
    
    if (csvData.length === 0) {
      return res.status(400).json({ message: 'No valid data rows found in CSV' });
    }
    
    console.log(`📊 Processing batch of ${csvData.length} certificates...`);
    
    // Import batch service
    const batchService = require('../services/batchCertificateService');
    
    // Process batch
    const results = await batchService.processBatchCertificates({
      csvData,
      templateId,
      instituteId: req.user.id,
      instituteName: req.user.name || 'Institution',
      courseId,
      courseName
    });
    
    console.log(`✅ Batch processing complete: ${results.success.length} succeeded, ${results.failed.length} failed`);
    
    res.json({
      success: true,
      message: `Processed ${results.total} certificates`,
      results: {
        total: results.total,
        succeeded: results.success.length,
        failed: results.failed.length,
        successDetails: results.success,
        failedDetails: results.failed
      }
    });
    
  } catch (err) {
    console.error('Batch generate error:', err);
    res.status(500).json({ 
      message: 'Failed to process batch certificates', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Download certificate PDF
router.get('/download-certificate/:certificateId', auth, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const fsSync = require('fs');
    const certificatesDir = path.join(__dirname, '..', 'generated', 'certificates');
    const pdfPath = path.join(certificatesDir, `${certificateId}.pdf`);

    // Check if file exists
    if (!fsSync.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'Certificate PDF not found' });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificateId}.pdf"`);

    // Stream the file
    const fileStream = fsSync.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download certificate error:', err);
    res.status(500).json({ message: 'Failed to download certificate', error: err.message });
  }
});

module.exports = router;

// Debug route: generate a simple test PDF to validate rendering and download
router.get('/debug/test-pdf', async (req, res) => {
  try {
    const simpleHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px}h1{font-size:24px}p{font-size:14px}</style></head><body><h1>PDF Test</h1><p>This is a test PDF to verify server rendering and full download (two-page content follows).</p><div style="page-break-after:always;"></div><h1>Page 2</h1><p>Second page content should appear fully.</p></body></html>`;
    // prefer the same service method if available
    let pdfBuffer;
    try {
      // try puppeteer path first
      const result = await htmlPdfService.generatePdfFromTemplate({}, { _debugHtml: simpleHtml });
      // service expects templateDoc; if it returned buffer inside object
      if (result && result.pdfBuffer) pdfBuffer = result.pdfBuffer;
      else if (Buffer.isBuffer(result)) pdfBuffer = result;
    } catch (e) {
      // fallback: call internal wkhtmltopdf helper if available
      try {
        // attempt direct call to fallback
        // htmlPdfService may expose tryWkhtmltopdfFallback — if not, use older helper
        if (typeof htmlPdfService.tryWkhtmltopdfFallback === 'function') {
          pdfBuffer = await htmlPdfService.tryWkhtmltopdfFallback(simpleHtml);
        } else {
          throw e;
        }
      } catch (ee) {
        console.error('Debug test-pdf render error:', e, ee);
        return res.status(500).json({ message: 'Debug render failed', error: (ee && ee.message) || (e && e.message) });
      }
    }

    if (!pdfBuffer) return res.status(500).json({ message: 'No PDF produced by debug renderer' });
    console.info('Debug test-pdf - pdfBuffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Debug test-pdf unexpected error:', err);
    res.status(500).json({ message: 'Debug failed', error: err.message });
  }
});

// Debug renderers availability
router.get('/debug/renderers', async (req, res) => {
  try {
    const wk = (typeof htmlPdfService.findWkhtmltopdfBin === 'function') ? await htmlPdfService.findWkhtmltopdfBin() : null;
    const puppeteerExec = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    res.json({ success: true, wkhtmltopdf: wk, puppeteerExecutablePath: puppeteerExec });
  } catch (err) {
    console.error('Debug renderers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug: send a test certificate email with a generated PDF attachment
router.post('/debug/send-test-email', async (req, res) => {
  try {
    const to = req.query.to || (req.body && req.body.to);
    if (!to) return res.status(400).json({ message: 'Provide recipient email as ?to= or in JSON body { "to": "..." }' });

    const simpleHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:40px}h1{font-size:24px}p{font-size:14px}</style></head><body><h1>Certificate Test</h1><p>This is a test certificate PDF sent by the server to verify SMTP and attachment delivery.</p></body></html>`;

    let pdfBuffer;
    try {
      const result = await htmlPdfService.generatePdfFromTemplate({}, { _debugHtml: simpleHtml });
      if (result && result.pdfBuffer) pdfBuffer = result.pdfBuffer;
      else if (Buffer.isBuffer(result)) pdfBuffer = result;
    } catch (e) {
      // fallback to wkhtmltopdf helper if available
      if (typeof htmlPdfService.tryWkhtmltopdfFallback === 'function') {
        try {
          pdfBuffer = await htmlPdfService.tryWkhtmltopdfFallback(simpleHtml);
        } catch (ee) {
          console.error('Failed to render PDF for test email:', e, ee);
          return res.status(500).json({ message: 'Failed to render PDF for test email', error: (ee && ee.message) || (e && e.message) });
        }
      } else {
        console.error('Failed to render PDF for test email:', e);
        return res.status(500).json({ message: 'Failed to render PDF for test email', error: e.message || e });
      }
    }

    if (!pdfBuffer) return res.status(500).json({ message: 'Renderer returned no PDF buffer' });

    try {
      const info = await emailService.sendCertificateEmail({
        to,
        subject: 'Test certificate from your server',
        text: 'This is a test certificate PDF attached.',
        pdfBuffer,
        pdfFilename: `test-certificate-${Date.now()}.pdf`,
      });
      return res.json({ success: true, info });
    } catch (sendErr) {
      console.error('send-test-email failed to send:', sendErr && sendErr.message ? sendErr.message : sendErr);
      return res.status(500).json({ message: 'Failed to send test email', error: sendErr && sendErr.message ? sendErr.message : sendErr });
    }
  } catch (err) {
    console.error('send-test-email unexpected error:', err);
    res.status(500).json({ message: 'Unexpected error', error: err.message || err });
  }
});
