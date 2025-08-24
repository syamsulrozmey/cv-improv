const Joi = require('joi');

const schemas = {
  // User authentication schemas
  signup: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    fullName: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),

  // CV schemas
  createCV: Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      'string.min': 'CV title is required',
      'string.max': 'CV title cannot exceed 255 characters',
      'any.required': 'CV title is required'
    }),
    originalText: Joi.string().optional(),
    templateId: Joi.number().integer().positive().optional()
  }),

  updateCV: Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    originalText: Joi.string().optional(),
    optimizedText: Joi.string().optional(),
    templateId: Joi.number().integer().positive().optional()
  }),

  // Job schemas
  createJob: Joi.object({
    title: Joi.string().max(255).optional(),
    company: Joi.string().max(255).optional(),
    url: Joi.string().uri().optional(),
    description: Joi.string().min(10).required().messages({
      'string.min': 'Job description must be at least 10 characters long',
      'any.required': 'Job description is required'
    })
  }),

  scrapeJob: Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'Please provide a valid URL',
      'any.required': 'Job URL is required'
    })
  }),

  // Application schemas
  createApplication: Joi.object({
    cvId: Joi.number().integer().positive().required().messages({
      'number.base': 'CV ID must be a number',
      'number.positive': 'CV ID must be positive',
      'any.required': 'CV ID is required'
    }),
    jobId: Joi.number().integer().positive().required().messages({
      'number.base': 'Job ID must be a number',
      'number.positive': 'Job ID must be positive',
      'any.required': 'Job ID is required'
    }),
    status: Joi.string().valid('applied', 'interviewing', 'offer', 'rejected').optional(),
    notes: Joi.string().max(1000).optional()
  }),

  updateApplication: Joi.object({
    status: Joi.string().valid('applied', 'interviewing', 'offer', 'rejected').optional(),
    notes: Joi.string().max(1000).optional()
  }),

  // Analysis schema
  analyzeCV: Joi.object({
    cvId: Joi.number().integer().positive().required(),
    jobId: Joi.number().integer().positive().required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }
    
    next();
  };
};

const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  token: Joi.object({
    token: Joi.string().uuid().required()
  })
};

module.exports = {
  schemas,
  validate,
  validateParams,
  paramSchemas
};