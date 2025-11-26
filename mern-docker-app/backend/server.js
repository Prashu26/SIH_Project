const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/mernapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define a simple route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Skill Credentialing Backend' });
});

// Mount API routes
const authRoutes = require('./routes/auth');
const instRoutes = require('./routes/institution');
const learnerRoutes = require('./routes/learner');
const verifyRoutes = require('./routes/verify');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/institution', instRoutes);
app.use('/api/learner', learnerRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
