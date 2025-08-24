const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const JWTUtil = require('../utils/jwt');
const config = require('../config/config');

class AuthController {
  static async signup(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { email, password, fullName } = req.body;
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, plan, cv_upload_count, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, full_name, plan, created_at`,
        [email.toLowerCase(), passwordHash, fullName || null, 'freemium', 0, true] // Setting email_verified to true for simplicity
      );
      
      const user = userResult.rows[0];
      
      // Generate tokens
      const accessToken = JWTUtil.generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = JWTUtil.generateRefreshToken({ userId: user.id });
      
      // Store refresh token
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, refreshTokenExpiry]
      );
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
        [
          user.id, 
          'USER_SIGNUP', 
          JSON.stringify({ plan: 'freemium' }), 
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            plan: 'freemium',
            createdAt: user.created_at
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during signup'
      });
    } finally {
      client.release();
    }
  }

  static async login(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { email, password } = req.body;
      
      // Get user with password hash
      const userResult = await client.query(
        'SELECT id, email, password_hash, full_name, plan, cv_upload_count, email_verified FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      const user = userResult.rows[0];
      
      if (!user.email_verified) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Generate tokens
      const accessToken = JWTUtil.generateAccessToken({ userId: user.id, email: user.email });
      const refreshToken = JWTUtil.generateRefreshToken({ userId: user.id });
      
      // Store refresh token
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, refreshTokenExpiry]
      );
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
        [user.id, 'USER_LOGIN', req.ip || req.connection.remoteAddress, req.get('User-Agent')]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            plan: user.plan,
            cvUploadCount: user.cv_upload_count
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    } finally {
      client.release();
    }
  }

  static async refreshToken(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { refreshToken } = req.body;
      
      // Verify refresh token format
      let decoded;
      try {
        decoded = JWTUtil.verifyRefreshToken(refreshToken);
      } catch (error) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
      
      // Check if refresh token exists and is valid
      const tokenResult = await client.query(
        'SELECT rt.id, rt.expires_at, u.id as user_id, u.email, u.plan FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = $1 AND rt.is_revoked = FALSE',
        [refreshToken]
      );
      
      if (tokenResult.rows.length === 0 || new Date() > tokenResult.rows[0].expires_at) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired or invalid'
        });
      }
      
      const tokenData = tokenResult.rows[0];
      
      // Generate new access token
      const newAccessToken = JWTUtil.generateAccessToken({ 
        userId: tokenData.user_id, 
        email: tokenData.email 
      });
      
      // Optionally rotate refresh token (more secure)
      const newRefreshToken = JWTUtil.generateRefreshToken({ userId: tokenData.user_id });
      const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // Revoke old refresh token and create new one
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1',
        [tokenData.id]
      );
      
      await client.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [tokenData.user_id, newRefreshToken, newRefreshTokenExpiry]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh'
      });
    } finally {
      client.release();
    }
  }

  static async logout(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { refreshToken } = req.body;
      const userId = req.userId;
      
      if (refreshToken) {
        // Revoke specific refresh token
        await client.query(
          'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1 AND user_id = $2',
          [refreshToken, userId]
        );
      } else {
        // Revoke all refresh tokens for user
        await client.query(
          'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
          [userId]
        );
      }
      
      // Log audit event
      await client.query(
        'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
        [userId, 'USER_LOGOUT', req.ip || req.connection.remoteAddress, req.get('User-Agent')]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    } finally {
      client.release();
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.userId;
      
      const userResult = await pool.query(
        'SELECT id, email, full_name, plan, cv_upload_count, created_at FROM users WHERE id = $1',
        [userId]
      );
      
      const user = userResult.rows[0];
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            plan: user.plan,
            cvUploadCount: user.cv_upload_count,
            createdAt: user.created_at,
            planLimits: config.plans[user.plan]
          }
        }
      });
      
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;