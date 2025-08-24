const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, status: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, status: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, status: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, status: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, status: 401 };
  }

  // PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    const message = 'Resource already exists';
    error = { message, status: 409 };
  }

  if (err.code === '23503') { // Foreign key violation
    const message = 'Referenced resource not found';
    error = { message, status: 400 };
  }

  if (err.code === '23502') { // Not null violation
    const message = 'Required field is missing';
    error = { message, status: 400 };
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(config.server.nodeEnv === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

module.exports = errorHandler;