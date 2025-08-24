const express = require('express');
const CVController = require('../controllers/cvController');
const { authenticateToken, checkPlanLimits } = require('../middleware/auth');
const { uploadCV, handleUploadError } = require('../middleware/upload');
const { validate, validateParams, schemas, paramSchemas } = require('../utils/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all CVs for user
router.get('/', CVController.getCVs);

// Get specific CV
router.get('/:id', validateParams(paramSchemas.id), CVController.getCV);

// Create new CV manually
router.post('/', checkPlanLimits('cv_upload'), validate(schemas.createCV), CVController.createCV);

// Upload CV file
router.post('/upload', 
  checkPlanLimits('cv_upload'), 
  uploadCV, 
  CVController.uploadCV,
  handleUploadError
);

// Update CV
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.updateCV), CVController.updateCV);

// Delete CV
router.delete('/:id', validateParams(paramSchemas.id), CVController.deleteCV);

// Download CV as PDF
router.get('/:id/download', validateParams(paramSchemas.id), CVController.downloadCV);

// Preview CV as PDF
router.get('/:id/preview', validateParams(paramSchemas.id), CVController.previewCV);

// Get available templates
router.get('/templates/list', CVController.getTemplates);

module.exports = router;