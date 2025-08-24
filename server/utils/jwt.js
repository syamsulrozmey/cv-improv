const jwt = require('jsonwebtoken');
const config = require('../config/config');

class JWTUtil {
  static generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'cv-improv',
      audience: 'cv-improv-users'
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'cv-improv',
      audience: 'cv-improv-users'
    });
  }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'cv-improv',
        audience: 'cv-improv-users'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'cv-improv',
        audience: 'cv-improv-users'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    return authHeader.substring(7); // Remove "Bearer " prefix
  }
}

module.exports = JWTUtil;