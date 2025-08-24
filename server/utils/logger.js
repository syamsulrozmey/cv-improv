const config = require('../config/config');

class Logger {
  static log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    if (config.server.nodeEnv === 'development') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  static info(message, meta = {}) {
    this.log('info', message, meta);
  }

  static warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  static error(message, meta = {}) {
    this.log('error', message, meta);
  }

  static debug(message, meta = {}) {
    if (config.server.nodeEnv === 'development') {
      this.log('debug', message, meta);
    }
  }

  static audit(action, userId, details = {}, req = null) {
    const auditEntry = {
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    };

    if (req) {
      auditEntry.ip = req.ip || req.connection.remoteAddress;
      auditEntry.userAgent = req.get('User-Agent');
      auditEntry.method = req.method;
      auditEntry.url = req.url;
    }

    this.info('AUDIT', auditEntry);
  }
}

module.exports = Logger;