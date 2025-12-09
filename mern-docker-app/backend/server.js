const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
// const { initBlockchainService } = require('./services/blockchain');
const { initIPFS } = require('./services/ipfs');
const { seedDemoUsers } = require('./scripts/seedDemoUsers');
const { seedLearnerBatch } = require('./scripts/seedLearnerBatch');
const { seedCoursesFromTemplate } = require('./scripts/seedCoursesFromTemplate');
const AnchoringService = require('./services/anchoringService');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/mernapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  // Seed demo users for testing
  try {
    await seedDemoUsers();
    await seedLearnerBatch();
    await seedCoursesFromTemplate();
  } catch (error) {
    console.error('Error during initial data seeding:', error);
  }
});

// Initialize services. Make blockchain optional in dev (don't exit on missing env vars)
(async () => {
  try {
    /*
    try {
      initBlockchainService();
    } catch (err) {
      logger.warn('Blockchain not configured, continuing without on-chain anchoring');
    }
    */

    if (process.env.USE_IPFS === 'true') {
      // initIPFS is async (uses dynamic import). Initialize but don't block startup.
      initIPFS().catch((err) => logger.error('Failed to init IPFS:', err));
    }
    // Start anchoring service in background (non-blocking) and expose on app.locals
    try {
      const anchoring = new AnchoringService({ intervalMs: 60000, batchSize: 50 });
      anchoring.start();
      app.locals.anchoringService = anchoring;
    } catch (err) {
      logger.warn('Anchoring service not started:', err.message || err);
    }
  } catch (error) {
    logger.error('Unexpected error initializing services: %s', error.message);
  }
})();

// Define a simple route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Skill Credentialing Backend' });
});

// Mount API routes
const authRoutes = require('./routes/auth');
const instituteRoutes = require('./routes/institute');
const learnerRoutes = require('./routes/learner');
const verifyRoutes = require('./routes/verify');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const courseRoutes = require('./routes/courses');
const issuerRoutes = require('./routes/issuer');
const certificateRoutes = require('./routes/certificates');
const templateRoutes = require('./routes/templates');
const organizationRoutes = require('./routes/organization');
const messageRoutes = require('./routes/messages');
const documentRoutes = require('./routes/documents');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/artifacts', express.static(path.join(__dirname, 'generated')));

app.use('/api/auth', authRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/institution', instituteRoutes);
app.use('/api/learner', learnerRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/issuer', issuerRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/documents', documentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
