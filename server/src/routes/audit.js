const express = require('express');
const { queryAll, queryOne } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/audit
 * List audit logs (admin only). Supports pagination and filtering.
 */
router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('a.action = ?');
      params.push(action);
    }
    if (userId) {
      conditions.push('a.user_id = ?');
      params.push(userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = queryAll(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs a';
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      if (action) countParams.push(action);
      if (userId) countParams.push(userId);
    }
    const countResult = queryOne(countQuery, countParams);
    const total = countResult ? countResult.total : 0;

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[AUDIT] List error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
