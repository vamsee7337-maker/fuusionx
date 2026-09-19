const express = require('express');
const { queryAll, queryOne, runSql } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/officers
 * List all legal officers (admin only).
 */
router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const officers = queryAll(
      `SELECT id, name, email, role, status, created_at
       FROM users
       WHERE role = 'LEGAL_OFFICER'
       ORDER BY created_at DESC`
    );

    res.json({ officers });
  } catch (err) {
    console.error('[OFFICERS] List error:', err);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

/**
 * PATCH /api/officers/:id/approve
 * Approve a pending legal officer (admin only).
 */
router.patch('/:id/approve', authenticate, requireAdmin, (req, res) => {
  try {
    const officer = queryOne('SELECT * FROM users WHERE id = ? AND role = ?', [req.params.id, 'LEGAL_OFFICER']);

    if (!officer) {
      return res.status(404).json({ error: 'Officer not found' });
    }

    if (officer.status === 'APPROVED') {
      return res.status(400).json({ error: 'Officer already approved' });
    }

    runSql('UPDATE users SET status = ? WHERE id = ?', ['APPROVED', officer.id]);

    createAuditLog({
      userId: req.user.id,
      action: 'OFFICER_APPROVED',
      entityType: 'USER',
      entityId: officer.id,
      details: `Admin approved Legal Officer: ${officer.name} (${officer.email})`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Officer approved successfully', officer: { ...officer, status: 'APPROVED' } });
  } catch (err) {
    console.error('[OFFICERS] Approve error:', err);
    res.status(500).json({ error: 'Failed to approve officer' });
  }
});

/**
 * PATCH /api/officers/:id/reject
 * Reject a pending legal officer (admin only).
 */
router.patch('/:id/reject', authenticate, requireAdmin, (req, res) => {
  try {
    const officer = queryOne('SELECT * FROM users WHERE id = ? AND role = ?', [req.params.id, 'LEGAL_OFFICER']);

    if (!officer) {
      return res.status(404).json({ error: 'Officer not found' });
    }

    if (officer.status === 'REJECTED') {
      return res.status(400).json({ error: 'Officer already rejected' });
    }

    runSql('UPDATE users SET status = ? WHERE id = ?', ['REJECTED', officer.id]);

    createAuditLog({
      userId: req.user.id,
      action: 'OFFICER_REJECTED',
      entityType: 'USER',
      entityId: officer.id,
      details: `Admin rejected Legal Officer: ${officer.name} (${officer.email})`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Officer rejected', officer: { ...officer, status: 'REJECTED' } });
  } catch (err) {
    console.error('[OFFICERS] Reject error:', err);
    res.status(500).json({ error: 'Failed to reject officer' });
  }
});

module.exports = router;
