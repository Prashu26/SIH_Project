const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');
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
    const certificates = await Certificate.find({}).limit(5).lean();
    console.log('Found', certificates.length, 'certificates');
    
    certificates.forEach(cert => {
      console.log('Certificate ID:', cert.certificateId);
      console.log('PDF Path:', cert.pdfPath);
      console.log('Storage:', JSON.stringify(cert.storage?.artifacts?.pdf, null, 2));
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
});
