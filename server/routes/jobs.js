const express = require('express');
const rateLimit = require('express-rate-limit');
const JobController = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateParams, schemas, paramSchemas } = require('../utils/validation');

const router = express.Router();

// Rate limiting for scraping endpoints (more restrictive)
const scrapingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 scraping requests per minute
  message: {
    success: false,
    message: 'Too many scraping requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// All routes require authentication
router.use(authenticateToken);

// Get all jobs for user
router.get('/', JobController.getJobs);

// Get specific job
router.get('/:id', validateParams(paramSchemas.id), JobController.getJob);

// Create job description manually
router.post('/', validate(schemas.createJob), JobController.createJob);

// Scrape job from URL
router.post('/scrape', scrapingLimiter, validate(schemas.scrapeJob), JobController.scrapeJob);

module.exports = router;