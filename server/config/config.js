require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-please-change-in-production',
    expiresIn: process.env.JWT_EXPIRE || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'docx'],
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  email: {
    service: process.env.EMAIL_SERVICE || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@cv-improv.com',
  },
  
  plans: {
    freemium: {
      maxCvs: 3,
      features: ['basic_templates', 'basic_ai_analysis', 'pdf_export']
    },
    paid: {
      maxCvs: -1, // unlimited
      features: ['all_templates', 'advanced_ai_analysis', 'pdf_export', 'docx_export', 'kanban_board', 'analytics']
    }
  }
};

// Validate required environment variables in production
if (config.server.nodeEnv === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL', 'OPENAI_API_KEY'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
}

module.exports = config;