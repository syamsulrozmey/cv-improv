const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config/config');
const pool = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const cvRoutes = require('./routes/cvs');
const jobRoutes = require('./routes/jobs');
const analysisRoutes = require('./routes/analysis');
const applicationRoutes = require('./routes/applications');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.server.clientUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      // Add production URLs here
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/cvs', cvRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/applications', applicationRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'CV Improv API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile'
      },
      cvs: {
        list: 'GET /api/cvs',
        get: 'GET /api/cvs/:id',
        create: 'POST /api/cvs',
        upload: 'POST /api/cvs/upload',
        update: 'PUT /api/cvs/:id',
        delete: 'DELETE /api/cvs/:id',
        download: 'GET /api/cvs/:id/download',
        preview: 'GET /api/cvs/:id/preview',
        templates: 'GET /api/cvs/templates/list'
      },
      jobs: {
        list: 'GET /api/jobs',
        get: 'GET /api/jobs/:id',
        create: 'POST /api/jobs',
        scrape: 'POST /api/jobs/scrape'
      },
      analysis: {
        analyze: 'POST /api/analysis/analyze',
        optimize: 'POST /api/analysis/optimize',
        getAnalysis: 'GET /api/analysis/cv/:id',
        skillGaps: 'GET /api/analysis/skill-gaps'
      },
      applications: {
        list: 'GET /api/applications',
        create: 'POST /api/applications',
        update: 'PUT /api/applications/:id',
        delete: 'DELETE /api/applications/:id',
        analytics: 'GET /api/applications/analytics'
      },
      health: 'GET /health'
    },
    documentation: 'Visit /api/docs for detailed API documentation'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(config.server.nodeEnv === 'development' && { error: err.message })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database pool
    await pool.end();
    console.log('Database pool closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit the process in production, just log the error
  if (config.server.nodeEnv !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Exit the process as the application is in an undefined state
  process.exit(1);
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`
🚀 CV Improv Server Started
📍 Port: ${PORT}
🌍 Environment: ${config.server.nodeEnv}
🕐 Time: ${new Date().toISOString()}
🔗 Health Check: http://localhost:${PORT}/health
📊 API Info: http://localhost:${PORT}/api
  `);
});

module.exports = app;