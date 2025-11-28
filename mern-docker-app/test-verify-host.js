const fetch = require('node-fetch');

(async () => {
  try {
    console.log('=== TESTING VERIFICATION FROM HOST ===\n');
    
    const certificateId = 'CERT-1764309621204-799';
    console.log(`Testing verification for: ${certificateId}`);
    
    const response = await fetch(`http://localhost:8081/api/verify/${certificateId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response Status:', response.status);
    
    const result = await response.json();
    console.log('Response Body:');
    console.log(JSON.stringify(result, null, 2));
    
    // Test with second certificate too
    console.log('\n=== TESTING SECOND CERTIFICATE ===');
    const response2 = await fetch(`http://localhost:8081/api/verify/CERT-1764309621396-927`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response Status:', response2.status);
    const result2 = await response2.json();
    console.log('Response Body:');
    console.log(JSON.stringify(result2, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();