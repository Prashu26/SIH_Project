const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Ensure the certificates directory exists
const CERTS_DIR = path.join(__dirname, '../../certificates');
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

// Certificate template path
const TEMPLATE_PATH = path.join(__dirname, '../templates/certificate.html');

/**
 * Generate a PDF certificate from template and data
 * @param {Object} certificateData - Certificate data to be injected into the template
 * @returns {Promise<{pdfBuffer: Buffer, filePath: string}>} - Generated PDF buffer and file path
 */
async function generateCertificatePDF(certificateData) {
  let browser;
  try {
    // Read HTML template
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    // Replace placeholders with actual data
    const placeholders = {
      '{{certificate_id}}': certificateData.certificate_id || '',
      '{{student_name}}': certificateData.student_name || 'Student Name',
      '{{course_name}}': certificateData.course_name || 'Course Name',
      '{{institute_name}}': certificateData.institute_name || 'Institution Name',
      '{{issue_date}}': certificateData.issue_date || new Date().toLocaleDateString(),
      '{{verification_url}}': process.env.VERIFICATION_BASE_URL || 'https://verify.example.com'
    };

    // Replace all placeholders in the HTML
    Object.entries(placeholders).forEach(([key, value]) => {
      html = html.replace(new RegExp(key, 'g'), value);
    });

    // Launch Puppeteer
    logger.info('Launching Puppeteer for PDF generation');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set content and wait for any resources to load
    logger.info('Setting HTML content and generating PDF');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    // Save the PDF to disk
    const fileName = `certificate_${certificateData.certificate_id || uuidv4()}.pdf`;
    const filePath = path.join(CERTS_DIR, fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    logger.info(`PDF certificate saved to ${filePath}`);
    
    return {
      pdfBuffer,
      filePath
    };
  } catch (error) {
    logger.error('Error generating PDF certificate:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateCertificatePDF
};
