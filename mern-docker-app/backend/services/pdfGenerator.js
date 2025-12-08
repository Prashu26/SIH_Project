const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// We will generate the design programmatically if the template is missing or blank
// This ensures the "design" is visible even without the background image

/**
 * Generate a PDF certificate using pdf-lib
 * @param {Object} certificateData - Certificate data
 * @returns {Promise<{pdfBuffer: Buffer, filePath: string}>}
 */
async function generateCertificatePDF(certificateData) {
  try {
    // Create a new document to ensure clean slate
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.5, 850.08]); // A4 size
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Helper to capitalize
    const capitalize = (str) => str ? String(str).replace(/(?:^|\s|["'([{])+\S/g, (match) => match.toUpperCase()) : '';

    // Map data
    const name = capitalize(certificateData.student_name);
    const fatherName = capitalize(certificateData.father_name);
    const motherName = capitalize(certificateData.mother_name);
    const dob = certificateData.dob || '';
    const institute = capitalize(certificateData.institute_name);
    const address = capitalize(certificateData.address);
    const district = capitalize(certificateData.district);
    const state = capitalize(certificateData.state);
    const trade = capitalize(certificateData.trade);
    const nsqf = certificateData.nsqf_level || '';
    const duration = certificateData.duration || '';
    const session = certificateData.session || '';
    const testMonth = capitalize(certificateData.test_month);
    const testYear = certificateData.test_year || '';
    const date = certificateData.issue_date || '';

    // --- DRAWING HELPERS ---
    const drawText = (text, x, y, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
        if (!text) return;
        page.drawText(String(text), {
            x,
            y,
            size,
            font: isBold ? fontBold : font,
            color,
        });
    };

    const drawLabelValue = (label, value, xLabel, xValue, y, size = 10) => {
        drawText(label, xLabel, y, size, false);
        // Draw dotted line
        const lineStart = xLabel + (label.length * size * 0.5) + 5; // Approx width
        const lineEnd = 550;
        // page.drawLine({ start: { x: lineStart, y: y + 2 }, end: { x: lineEnd, y: y + 2 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5), dashArray: [2, 2] });
        
        if (value) {
            drawText(value, xValue, y, size, true);
        }
    };

    // --- MAIN CERTIFICATE DESIGN ---
    
    // Border
    page.drawRectangle({
        x: 20,
        y: 350,
        width: 555.5,
        height: 480,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
    });

    // Header
    drawText('GOVERNMENT OF INDIA', 220, 800, 14, true);
    drawText('MINISTRY OF SKILL DEVELOPMENT AND ENTREPRENEURSHIP', 130, 780, 12, true);
    drawText('DIRECTORATE GENERAL OF TRAINING', 180, 760, 12, true);
    drawText('NATIONAL TRADE CERTIFICATE', 190, 730, 16, true);

    // Fields
    // Coordinates derived from user's snippet, adjusted for labels
    
    // "This is to certify that"
    drawText('This is to certify that', 50, 640, 10);

    // Name
    drawLabelValue('Shri/Smt/Kumari', name, 50, 250, 615);
    
    // Father
    drawLabelValue('Son/Wife/Daughter of Shri', fatherName, 50, 250, 600);
    
    // Mother
    drawLabelValue("Mother's name Smt", motherName, 50, 250, 585);
    
    // DOB
    drawLabelValue('Date of Birth', dob, 50, 250, 568);
    
    // Institute
    drawLabelValue('Name of the Institute', institute, 50, 250, 548);
    
    // Address
    drawLabelValue('Address', address, 50, 120, 530);
    
    // District & State
    drawText('District', 50, 515, 10);
    drawText(district, 120, 515, 10, true);
    drawText('State', 350, 515, 10);
    drawText(state, 400, 515, 10, true);
    
    // Trade & NSQF
    drawText('Name of the Trade', 50, 500, 10);
    drawText(trade, 220, 500, 10, true);
    drawText('NSQF Level', 450, 500, 10);
    drawText(nsqf, 540, 500, 10, true);
    
    // Duration & Session
    drawText('Training Duration', 50, 482, 10);
    drawText(duration, 220, 482, 10, true);
    drawText('Admission Session', 380, 482, 10);
    drawText(session, 490, 482, 10, true);
    
    // Test Month & Year
    drawText('All India Trade Test, Month', 50, 465, 10);
    drawText(testMonth, 410, 465, 10, true);
    drawText('Year', 480, 465, 10);
    drawText(testYear, 515, 465, 10, true);
    
    drawText('is hereby awarded this National Trade certificate.', 50, 440, 10);

    // Signatures
    drawText('New Delhi', 50, 400, 10);
    drawText('Date:', 50, 390, 10, true);
    drawText(date, 100, 390, 10, true);

    drawText('Controller of Examination', 400, 400, 10);
    drawText('Directorate General of Training', 380, 385, 10);


    // --- POCKET CERTIFICATE (Bottom) ---
    
    // Cut line
    page.drawLine({ start: { x: 20, y: 330 }, end: { x: 575, y: 330 }, thickness: 1, color: rgb(0, 0, 0), dashArray: [5, 5] });
    drawText('---------------- FRONT ---------------- Cut from this line and use as pocket NTC ---------------- BACK ----------------', 60, 335, 8);

    // Pocket Border
    page.drawRectangle({
        x: 20,
        y: 20,
        width: 555.5,
        height: 300,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
    });

    // Pocket Header
    drawText('GOVERNMENT OF INDIA', 220, 300, 10, true);
    drawText('NATIONAL TRADE CERTIFICATE', 200, 285, 10, true);

    // Pocket Fields (Left Side - Front)
    drawText('Shri/Smt/Kumari', 30, 145, 6);
    drawText(name, 150, 145, 6, true);
    
    drawText('Son/Wife/Daughter of Shri', 30, 130, 6);
    drawText(fatherName, 180, 130, 6, true);
    
    drawText('Date of Birth', 30, 115, 6);
    drawText(dob, 130, 115, 6, true);
    
    drawText('Name of the Trade', 30, 100, 6);
    drawText(trade, 170, 100, 6, true);
    
    drawText('NSQF Level', 30, 85, 6);
    drawText(nsqf, 120, 85, 6, true);

    // Pocket Fields (Right Side - Back)
    // Vertical separator
    page.drawLine({ start: { x: 297, y: 20 }, end: { x: 297, y: 320 }, thickness: 1, color: rgb(0, 0, 0) });

    drawText('Institute', 310, 265, 6);
    drawText(institute, 370, 265, 6, true);
    
    drawText('District', 310, 240, 6);
    drawText(district, 370, 240, 6, true);
    
    drawText('State', 310, 225, 6);
    drawText(state, 370, 225, 6, true);
    
    drawText('Training Duration', 310, 210, 6);
    drawText(duration, 430, 210, 6, true);
    
    drawText('Admission Session', 310, 195, 6);
    drawText(session, 410, 195, 6, true);
    
    drawText('Month', 490, 180, 6);
    drawText(testMonth, 524, 180, 6, true);
    
    drawText('Year', 310, 165, 6);
    drawText(testYear, 350, 165, 6, true);
    
    drawText('Date:', 310, 107.5, 6);
    drawText(date, 352, 107.5, 6, true);

    const pdfBuffer = await pdfDoc.save();
    
    // Save to file
    const fileName = `${certificateData.certificate_id || 'cert'}.pdf`;
    const outputDir = path.join(__dirname, '../../certificates');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    return {
        pdfBuffer: Buffer.from(pdfBuffer),
        filePath
    };

  } catch (error) {
    logger.error('Error generating PDF:', error);
    throw error;
  }
}

module.exports = {
  generateCertificatePDF
};
