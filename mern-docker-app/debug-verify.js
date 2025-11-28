const fetch = require('node-fetch');

(async () => {
  try {
    console.log('=== DEBUGGING VERIFICATION ISSUE ===\n');
    
    // Get certificate directly from database
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://mongo:27017');
    await client.connect();
    const db = client.db('mernapp');
    
    const certificateId = 'CERT-1764309621204-799';
    console.log(`Looking for certificate: ${certificateId}`);
    
    const cert = await db.collection('certificates').findOne({ certificateId });
    
    if (cert) {
      console.log('Found certificate in database:');
      console.log('  - certificateId:', cert.certificateId);
      console.log('  - merkleProof:', cert.merkleProof ? 'present' : 'null');
      console.log('  - merkleRoot:', cert.merkleRoot || 'null');
      console.log('  - batchId:', cert.batchId || 'null');
      console.log('  - status:', cert.status);
      
      // Try manual verification call
      console.log('\n=== TESTING BLOCKCHAINSERVICE DIRECTLY ===');
      const BlockchainService = require('./services/blockchainService');
      
      try {
        const result = await BlockchainService.verifyCertificate(certificateId);
        console.log('BlockchainService result:');
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error('BlockchainService error:', err.message);
        console.error(err.stack);
      }
    } else {
      console.log('Certificate NOT found in database');
    }
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();