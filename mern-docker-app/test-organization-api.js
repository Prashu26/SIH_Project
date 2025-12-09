const { default: fetch } = require('node-fetch');

async function testOrganizationAPI() {
  try {
    console.log('🧪 Testing Organization Registration API...');
    
    const testData = {
      organizationName: "Test Organization",
      industry: "Information Technology", 
      email: "test@testorg.com",
      password: "test123456",
      registrationId: "TEST001",
      contactNumber: "1234567890",
      headOfficeLocation: {
        address: "123 Test Street",
        city: "Test City",
        state: "Test State",
        pincode: "12345"
      },
      contactPerson: {
        name: "Test Contact",
        designation: "HR Manager", 
        email: "hr@testorg.com",
        phone: "9876543210"
      },
      hiringRequirements: [{
        skillSets: ["React", "Node.js", "MongoDB"],
        numberOfPositions: 2,
        minimumQualification: "Bachelor's Degree",
        experienceLevel: "Fresher",
        technicalSkills: ["JavaScript", "Express"],
        jobType: "Full-time",
        jobTitle: "Full Stack Developer",
        salaryRange: { min: "30000", max: "50000", currency: "INR" }
      }]
    };

    const response = await fetch('http://localhost:5000/api/organization/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📄 Response Data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Organization registration successful!');
      console.log('🎯 Testing login...');
      
      // Test login
      const loginResponse = await fetch('http://localhost:5000/api/organization/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testData.email,
          password: testData.password
        })
      });
      
      const loginResult = await loginResponse.json();
      console.log('🔐 Login Response:', JSON.stringify(loginResult, null, 2));
      
      if (loginResult.success) {
        console.log('✅ Organization login successful!');
        
        // Test student pool access
        console.log('📚 Testing student pool access...');
        const poolResponse = await fetch('http://localhost:5000/api/organization/student-pool', {
          headers: {
            'Authorization': `Bearer ${loginResult.token}`
          }
        });
        
        const poolResult = await poolResponse.json();
        console.log('👥 Student Pool Response:', JSON.stringify(poolResult, null, 2));
        
      } else {
        console.log('❌ Login failed:', loginResult.message);
      }
      
    } else {
      console.log('❌ Registration failed:', result.message);
    }

  } catch (error) {
    console.error('🚨 Test Error:', error.message);
  }
}

testOrganizationAPI();