/**
 * Test Certificate Generation and Verification Flow
 * 
 * This script tests:
 * 1. Generate PDF from template
 * 2. Extract hash from response headers
 * 3. Save certificate with hash
 * 4. Verify the PDF by uploading it
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:8080/api';
let authToken = '';
let templateId = '';
let certificateId = '';
let pdfHash = '';
let pdfBuffer = null;

async function login() {
  console.log('\n📝 Step 1: Login as institution...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'institute.demo@example.com',
      password: 'password123'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  authToken = data.token;
  console.log('✅ Logged in successfully');
  return authToken;
}

async function getTemplate() {
  console.log('\n📝 Step 2: Get available template...');
  const response = await fetch(`${API_BASE}/templates`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!response.ok) {
    throw new Error(`Get templates failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (!data.templates || data.templates.length === 0) {
    throw new Error('No templates found. Please create a template first.');
  }
  
  templateId = data.templates[0]._id;
  console.log(`✅ Using template: ${data.templates[0].name} (${templateId})`);
  return templateId;
}

async function generateCertificate() {
  console.log('\n📝 Step 3: Generate certificate PDF...');
  
  certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const certificateData = {
    certificateId,
    name: 'Test User',
    email: 'test@example.com',
    course: 'Test Course',
    fit: 'small'
  };
  
  const response = await fetch(`${API_BASE}/templates/${templateId}/generate?fit=small`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/pdf',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(certificateData)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Generate failed: ${response.statusText} - ${text}`);
  }
  
  // Extract hash from headers
  pdfHash = response.headers.get('X-PDF-Hash');
  const pdfHashFormatted = response.headers.get('X-PDF-Hash-Formatted');
  
  console.log(`✅ PDF generated successfully`);
  console.log(`   Certificate ID: ${certificateId}`);
  console.log(`   PDF Hash: ${pdfHash}`);
  console.log(`   Formatted Hash: ${pdfHashFormatted}`);
  
  // Get PDF buffer
  pdfBuffer = Buffer.from(await response.arrayBuffer());
  
  // Verify hash locally
  const localHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  console.log(`   Local Hash: ${localHash}`);
  
  if (localHash === pdfHash) {
    console.log('✅ Hash verification: MATCHED');
  } else {
    throw new Error('Hash mismatch! Server hash does not match local calculation.');
  }
  
  // Save PDF to temp file
  const tempPath = path.join(__dirname, `test-cert-${certificateId}.pdf`);
  fs.writeFileSync(tempPath, pdfBuffer);
  console.log(`   PDF saved to: ${tempPath}`);
  
  return { certificateId, pdfHash, pdfBuffer, tempPath };
}

async function saveCertificate() {
  console.log('\n📝 Step 4: Save certificate to database...');
  
  const response = await fetch(`${API_BASE}/templates/${templateId}/save-certificate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      certificateId,
      pdfHash,
      learnerData: {
        name: 'Test User',
        email: 'test@example.com'
      }
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Save certificate failed: ${response.statusText} - ${text}`);
  }
  
  const data = await response.json();
  console.log('✅ Certificate saved to database');
  console.log(`   Certificate ID: ${data.certificateId}`);
  console.log(`   Hash: ${data.hash}`);
  
  return data;
}

async function verifyCertificate() {
  console.log('\n📝 Step 5: Verify certificate by uploading PDF...');
  
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', pdfBuffer, {
    filename: `${certificateId}.pdf`,
    contentType: 'application/pdf'
  });
  
  const response = await fetch(`${API_BASE}/verify/upload`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Verification failed: ${response.statusText} - ${text}`);
  }
  
  const data = await response.json();
  console.log('✅ Certificate verification result:');
  console.log(`   Success: ${data.success}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Message: ${data.message}`);
  console.log(`   File Hash: ${data.fileHash}`);
  
  if (data.certificate) {
    console.log(`   Certificate ID: ${data.certificate.certificateId}`);
  }
  
  if (data.success) {
    console.log('\n🎉 SUCCESS! The certificate verification flow works correctly!');
  } else {
    throw new Error('Verification failed: ' + data.message);
  }
  
  return data;
}

async function main() {
  try {
    console.log('🚀 Starting Certificate Generation & Verification Test\n');
    console.log('=' .repeat(60));
    
    await login();
    await getTemplate();
    await generateCertificate();
    await saveCertificate();
    await verifyCertificate();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\nThe complete flow works:');
    console.log('  1. ✅ PDF generation');
    console.log('  2. ✅ Hash calculation');
    console.log('  3. ✅ Database storage');
    console.log('  4. ✅ Verification by upload');
    console.log('\nThe downloaded PDF matches the verification hash! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
