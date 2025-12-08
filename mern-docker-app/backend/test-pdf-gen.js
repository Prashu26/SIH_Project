const { generateCertificatePDF } = require('./services/pdfGenerator');
const path = require('path');
const fs = require('fs');

const mockCertificateData = {
  certificate_id: 'TEST-CERT-001',
  student_name: 'Rahul Kumar',
  father_name: 'Suresh Kumar',
  mother_name: 'Sunita Devi',
  dob: '2000-05-15',
  institute_name: 'Government Industrial Training Institute, Delhi',
  address: 'H.No 123, Sector 4, Rohini',
  district: 'North West Delhi',
  state: 'Delhi',
  trade: 'Electrician',
  nsqf_level: 'Level 5',
  duration: '2 Years',
  session: '2023-2025',
  test_month: 'July',
  test_year: '2025',
  issue_date: '2025-08-10'
};

async function testGeneration() {
  console.log('Starting PDF generation test...');
  try {
    const result = await generateCertificatePDF(mockCertificateData);
    console.log('PDF generated successfully!');
    console.log('File path:', result.filePath);
    console.log('Buffer length:', result.pdfBuffer.length);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

testGeneration();
