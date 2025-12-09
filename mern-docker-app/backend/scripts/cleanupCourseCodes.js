require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mernapp';
  console.log('Connecting to', uri.replace(/(:\/\/)(.+@)?/, '$1****@'));
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const res = await Course.updateMany({ courseCode: null }, { $unset: { courseCode: '' } });
    console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);

    // Also remove explicit empty-string courseCode if present
    const res2 = await Course.updateMany({ courseCode: '' }, { $unset: { courseCode: '' } });
    console.log('Empty-string matched:', res2.matchedCount, 'Modified:', res2.modifiedCount);

    await mongoose.disconnect();
    console.log('Done. Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
