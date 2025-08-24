const express = require('express');
const rateLimit = require('express-rate-limit');
const AnalysisController = require('../controllers/analysisController');
const { authenticateToken, requirePlan } = require('../middleware/auth');
const { validate, validateParams, schemas, paramSchemas } = require('../utils/validation');

const router = express.Router();

// Rate limiting for AI analysis endpoints (more restrictive)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 analysis requests per minute
  message: {
    success: false,
    message: 'Too many analysis requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// All routes require authentication
router.use(authenticateToken);

// Analyze CV compatibility with job description
router.post('/analyze', 
  analysisLimiter,
  validate(schemas.analyzeCV),
  AnalysisController.analyzeCV
);

// Optimize CV based on analysis
router.post('/optimize',
  analysisLimiter,
  requirePlan('freemium'), // Available to all plans
  validate(schemas.analyzeCV), // Reuse the same schema
  AnalysisController.optimizeCV
);

// Get analysis results for a CV
router.get('/cv/:id',
  validateParams(paramSchemas.id),
  AnalysisController.getAnalysis
);

// Get detailed skill gap analysis
router.get('/skill-gaps',
  AnalysisController.getSkillGapAnalysis
);

module.exports = router;