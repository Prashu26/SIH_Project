const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/csv'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF and CSV files are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

// Initialize upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to handle file upload errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File size too large. Maximum 10MB allowed.'
      });
    }
    return res.status(400).json({ 
      success: false,
      error: err.message 
    });
  } else if (err) {
    // An unknown error occurred
    logger.error('File upload error:', err);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while processing your file.'
    });
  }
  next();
};

// Clean up temporary files
const cleanupTempFiles = (req, res, next) => {
  // Clean up files after response is sent
  res.on('finish', () => {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          logger.error('Error deleting temporary file:', err);
        } else {
          logger.debug(`Temporary file deleted: ${req.file.path}`);
        }
      });
    }
  });
  next();
};

// Helper function to parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const csv = require('csv-parser');
    const fs = require('fs');
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        logger.error('Error parsing CSV file:', error);
        reject(error);
      });
  });
};

module.exports = {
  upload,
  handleUploadErrors,
  cleanupTempFiles,
  parseCSV
};
