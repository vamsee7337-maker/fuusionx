const express = require('express');
const { queryAll, queryOne } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Dashboard statistics (admin only).
 */
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const totalOfficers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'LEGAL_OFFICER'");
    const pendingOfficers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'LEGAL_OFFICER' AND status = 'PENDING'");
    const approvedOfficers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'LEGAL_OFFICER' AND status = 'APPROVED'");
    const rejectedOfficers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'LEGAL_OFFICER' AND status = 'REJECTED'");
    const totalCases = queryOne('SELECT COUNT(*) as count FROM cases');
    const totalEvidence = queryOne("SELECT COUNT(*) as count FROM evidence WHERE status = 'ACTIVE'");

    const recentActivity = queryAll(
      `SELECT a.*, u.name as user_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.timestamp DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        totalOfficers: totalOfficers ? totalOfficers.count : 0,
        pendingOfficers: pendingOfficers ? pendingOfficers.count : 0,
        approvedOfficers: approvedOfficers ? approvedOfficers.count : 0,
        rejectedOfficers: rejectedOfficers ? rejectedOfficers.count : 0,
        totalCases: totalCases ? totalCases.count : 0,
        totalEvidence: totalEvidence ? totalEvidence.count : 0,
      },
      recentActivity,
    });
  } catch (err) {
    console.error('[DASHBOARD] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
