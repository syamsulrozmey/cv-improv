const express = require('express');
const ApplicationController = require('../controllers/applicationController');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateParams, schemas, paramSchemas } = require('../utils/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all applications (Kanban board data)
router.get('/', ApplicationController.getApplications);

// Create new application
router.post('/', validate(schemas.createApplication), ApplicationController.createApplication);

// Update application
router.put('/:id', validateParams(paramSchemas.id), validate(schemas.updateApplication), ApplicationController.updateApplication);

// Delete application
router.delete('/:id', validateParams(paramSchemas.id), ApplicationController.deleteApplication);

// Get analytics
router.get('/analytics', ApplicationController.getAnalytics);

module.exports = router;