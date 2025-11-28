const fetch = require('node-fetch');

(async () => {
  try {
    console.log('=== TESTING VERIFICATION API ===\n');
    
    const certificateId = 'CERT-1764314380822-197';
    console.log(`Testing verification for: ${certificateId}`);
    
    const response = await fetch(`http://localhost:8080/api/verify/${encodeURIComponent(certificateId)}`);
    console.log('Response Status:', response.status);
    
    const result = await response.json();
    console.log('Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== TESTING NON-EXISTENT CERTIFICATE ===');
    const fakeId = 'CERT-9999999999-999';
    const response2 = await fetch(`http://localhost:8080/api/verify/${encodeURIComponent(fakeId)}`);
    console.log('Response Status:', response2.status);
    
    const result2 = await response2.json();
    console.log('Response Body:');
    console.log(JSON.stringify(result2, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();