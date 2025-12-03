const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { seedLearnerBatch } = require('./seedLearnerBatch');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mernapp';

  console.log(`Connecting to MongoDB at ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connection established');

    await seedLearnerBatch();
    console.log('Learner batch seeding complete');
  } catch (err) {
    console.error('Failed to seed learners:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('MongoDB connection closed');
  }
}

main();
