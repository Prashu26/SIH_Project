const fetch = require('node-fetch');

(async () => {
  try {
    console.log('=== TESTING VERIFICATION ENDPOINT ===\n');
    
    // Test 1: Verify a certificate that should exist
    const certificateId = 'CERT-1764309621204-799';
    console.log(`Testing verification for: ${certificateId}`);
    
    const response = await fetch(`http://localhost:8080/api/verify/${certificateId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    // Test 2: Get all certificates to see what we have
    console.log('\n=== CHECKING WHAT CERTIFICATES EXIST ===');
    const { MongoClient } = require('mongodb');
    
    const client = new MongoClient('mongodb://mongo:27017');
    await client.connect();
    const db = client.db('mernapp');
    const certificates = await db.collection('certificates').find({}, {
      projection: { certificateId: 1, status: 1, merkleRoot: 1, batchId: 1 }
    }).toArray();
    
    console.log('Found certificates:');
    certificates.forEach(cert => {
      console.log(`  - ${cert.certificateId} (Status: ${cert.status})`);
    });
    
    await client.close();
    
    // Test 3: Try verification with first certificate
    if (certificates.length > 0) {
      console.log(`\n=== TESTING WITH FIRST CERTIFICATE: ${certificates[0].certificateId} ===`);
      const verifyResponse = await fetch(`http://localhost:8080/api/verify/${certificates[0].certificateId}`);
      const verifyResult = await verifyResponse.json();
      
      console.log('Verification Response Status:', verifyResponse.status);
      console.log('Verification Result:');
      console.log(JSON.stringify(verifyResult, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();