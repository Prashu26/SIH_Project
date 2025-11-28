const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

(async () => {
  try {
    // Login
    console.log('=== LOGGING IN ===');
    const loginResp = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@inst.com', password: 'Password123!' })
    });
    const { token } = await loginResp.json();
    console.log('Login successful!\n');

    // Upload batch
    console.log('=== UPLOADING BATCH CSV ===');
    const form = new FormData();
    form.append('file', fs.createReadStream('/usr/src/app/test-files/working-batch.csv'));
    
    const uploadResp = await fetch('http://localhost:8080/api/institute/certificates/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await uploadResp.json();
    
    console.log('=== BATCH UPLOAD RESULT ===');
    console.log('Success:', result.success);
    console.log('Total:', result.data.total);
    console.log('Success Count:', result.data.successCount);
    console.log('Failed Count:', result.data.failedCount);
    console.log('Batch ID:', result.data.batchId);
    console.log('Message:', result.message);
    
    if (result.data.results && result.data.results.length > 0) {
      console.log('\n=== CERTIFICATES CREATED ===');
      result.data.results.forEach((cert, i) => {
        console.log(`${i+1}. Certificate ID: ${cert.certificateId}`);
        console.log(`   Learner: ${cert.learner.name} (${cert.learner.email})`);
        console.log(`   Course: ${cert.course.name}`);
        console.log(`   MerkleRoot: ${cert.merkleRoot || 'N/A'}`);
        console.log(`   BatchId: ${cert.batchId || 'N/A'}`);
        console.log(`   BlockchainTx: ${cert.blockchainTxHash || 'N/A'}`);
        console.log('');
      });
    }
    
    if (result.data.errors && result.data.errors.length > 0) {
      console.log('=== ERRORS ===');
      result.data.errors.forEach(err => {
        console.log(`  - ${err.studentUniqueCode}: ${err.error}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
