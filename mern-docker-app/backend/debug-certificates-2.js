const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/mernapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // 1. Fetch some learners
    const learners = await User.find({ role: 'learner' }).limit(10).lean();
    console.log(`Found ${learners.length} learners`);
    learners.forEach(l => console.log(`Learner: ${l.name} (${l._id})`));
    
    const learnerIds = learners.map(l => l._id);
    
    // 2. Fetch certificates for these learners
    console.log('\nSearching for certificates for these learners...');
    const certificates = await Certificate.find({ 
      learner: { $in: learnerIds } 
    }).lean();
    
    console.log(`Found ${certificates.length} certificates matching these learners`);
    
    certificates.forEach(cert => {
      console.log(`- Cert ${cert.certificateId} for Learner ${cert.learner}`);
      console.log(`  PDF Path: ${cert.pdfPath}`);
      console.log(`  Status: ${cert.status}`);
    });

    // 3. Check if there are ANY certificates
    const allCerts = await Certificate.countDocuments();
    console.log(`\nTotal certificates in DB: ${allCerts}`);
    
    if (allCerts > 0 && certificates.length === 0) {
        console.log("\nChecking one random certificate to see its learner ID...");
        const randomCert = await Certificate.findOne().lean();
        console.log(`Random Cert Learner ID: ${randomCert.learner}`);
        const learner = await User.findById(randomCert.learner);
        console.log(`Is that learner in our list? ${learnerIds.some(id => id.toString() === randomCert.learner.toString())}`);
        if (learner) {
            console.log(`Learner Name: ${learner.name}, Role: ${learner.role}`);
        } else {
            console.log("Learner not found for this certificate!");
        }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
});
