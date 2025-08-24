const JWTUtil = require('../utils/jwt');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = JWTUtil.extractTokenFromHeader(authHeader);
    const decoded = JWTUtil.verifyAccessToken(token);

    // Verify user still exists in database
    const result = await pool.query(
      'SELECT id, email, full_name, plan, cv_upload_count FROM users WHERE id = $1 AND email_verified = TRUE',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or not verified'
      });
    }

    // Attach user info to request
    req.user = result.rows[0];
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid access token'
    });
  }
};

const checkPlanLimits = (resource) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      
      if (resource === 'cv_upload') {
        if (user.plan === 'freemium' && user.cv_upload_count >= 3) {
          return res.status(403).json({
            success: false,
            message: 'CV upload limit reached. Upgrade to paid plan for unlimited uploads.',
            code: 'PLAN_LIMIT_REACHED',
            limit: {
              current: user.cv_upload_count,
              max: 3,
              plan: user.plan
            }
          });
        }
      }

      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during plan validation'
      });
    }
  };
};

const requirePlan = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      
      if (requiredPlan === 'paid' && user.plan !== 'paid') {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a paid plan subscription.',
          code: 'PAID_PLAN_REQUIRED',
          currentPlan: user.plan
        });
      }

      next();
    } catch (error) {
      console.error('Plan requirement check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during plan validation'
      });
    }
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = JWTUtil.extractTokenFromHeader(authHeader);
    const decoded = JWTUtil.verifyAccessToken(token);

    const result = await pool.query(
      'SELECT id, email, full_name, plan, cv_upload_count FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
      req.userId = decoded.userId;
    } else {
      req.user = null;
      req.userId = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    req.userId = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  checkPlanLimits,
  requirePlan,
  optionalAuth
};