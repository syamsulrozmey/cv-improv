const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF and DOCX files are allowed. Received: ${file.mimetype}`), false);
  }
};

// Configure multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize, // 10MB default
    files: 1 // Only allow one file at a time
  },
  fileFilter: fileFilter
});

// Middleware function for single CV file upload
const uploadCV = (req, res, next) => {
  const singleUpload = upload.single('cv');
  
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size allowed is ${config.upload.maxFileSize / 1024 / 1024}MB.`,
          error: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one file is allowed per upload.',
          error: 'TOO_MANY_FILES'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name. Use "cv" as the field name for file upload.',
          error: 'UNEXPECTED_FIELD'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
        error: 'UPLOAD_ERROR'
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'VALIDATION_ERROR'
      });
    }
    
    // Validate that file was actually uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a PDF or DOCX file.',
        error: 'NO_FILE'
      });
    }
    
    next();
  });
};

// Cleanup middleware to remove temporary files
const cleanupTempFile = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Clean up temp file after response is sent
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error('Error cleaning up temp file:', err);
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Error handling for file upload routes
const handleUploadError = (err, req, res, next) => {
  // Clean up any uploaded files on error
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Error cleaning up temp file after error:', unlinkErr);
      }
    });
  }
  
  next(err);
};

module.exports = {
  uploadCV,
  cleanupTempFile,
  handleUploadError
};