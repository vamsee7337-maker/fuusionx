const { v4: uuidv4 } = require('uuid');
const { queryOne, runSql } = require('../db/schema');

/**
 * Create an audit log entry.
 */
function createAuditLog({ userId, action, entityType, entityId, details, ipAddress }) {
  const id = `aud-${uuidv4()}`;
  
  runSql(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, userId || null, action, entityType || null, entityId || null, details || null, ipAddress || null]
  );

  return id;
}

module.exports = { createAuditLog };
