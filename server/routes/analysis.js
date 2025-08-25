const express = require('express');
const rateLimit = require('express-rate-limit');
const AnalysisController = require('../controllers/analysisController');
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

// Analyze CV compatibility with job description
router.post('/analyze', 
  analysisLimiter,
  validate(schemas.analyzeCV),
  AnalysisController.analyzeCV
);

// Optimize CV based on analysis
router.post('/optimize',
  analysisLimiter,
  validate(schemas.analyzeCV), // Reuse the same schema
  AnalysisController.optimizeCV
);

// Get analysis results for a CV (requires authentication)
router.get(
  '/cv/:id',
  requireAuth, // e.g., Firebase ID token verifier middleware
  validateParams(paramSchemas.id),
  AnalysisController.getAnalysis
);

// Get detailed skill gap analysis (requires authentication)
router.get(
  '/skill-gaps',
  requireAuth,
  AnalysisController.getSkillGapAnalysis
);

module.exports = router;