const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/schema');
const { createAuditLog } = require('../utils/audit');

/**
 * Authenticate JWT token from Authorization header.
 * Attaches req.user with { id, name, email, role, status }.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch fresh user data from database (don't trust token payload for role/status)
    const user = queryOne('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'APPROVED') {
      createAuditLog({
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS',
        details: `Access attempt by ${user.status} user: ${user.email}`,
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'Account not approved. Contact administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Require ADMIN role.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    createAuditLog({
      userId: req.user.id,
      action: 'UNAUTHORIZED_ACCESS',
      details: `Non-admin user ${req.user.email} attempted admin action: ${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
    });
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Require LEGAL_OFFICER role with APPROVED status.
 */
function requireOfficer(req, res, next) {
  if (req.user.role !== 'LEGAL_OFFICER') {
    createAuditLog({
      userId: req.user.id,
      action: 'UNAUTHORIZED_ACCESS',
      details: `Non-officer user ${req.user.email} attempted officer action: ${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
    });
    return res.status(403).json({ error: 'Legal Officer access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireOfficer };
