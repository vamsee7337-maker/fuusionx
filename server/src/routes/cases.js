const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql } = require('../db/schema');
const { authenticate, requireOfficer } = require('../middleware/auth');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

/**
 * GET /api/cases
 * List cases. Officers see only their own cases. Admin sees all.
 */
router.get('/', authenticate, (req, res) => {
  try {
    let cases;

    if (req.user.role === 'ADMIN') {
      cases = queryAll(
        `SELECT c.*, u.name as creator_name
         FROM cases c
         JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC`
      );
    } else {
      // Legal officers see only their own cases
      cases = queryAll(
        `SELECT c.*, u.name as creator_name
         FROM cases c
         JOIN users u ON c.created_by = u.id
         WHERE c.created_by = ?
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );
    }

    // Add evidence count to each case
    cases = cases.map(c => {
      const countResult = queryOne(
        "SELECT COUNT(*) as count FROM evidence WHERE case_id = ? AND status = 'ACTIVE'",
        [c.id]
      );
      return { ...c, evidence_count: countResult ? countResult.count : 0 };
    });

    res.json({ cases });
  } catch (err) {
    console.error('[CASES] List error:', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

/**
 * POST /api/cases
 * Create a new case (officer only).
 */
router.post('/', authenticate, requireOfficer, (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = `case-${uuidv4()}`;

    // Generate unique case number
    const countResult = queryOne('SELECT COUNT(*) as count FROM cases');
    const count = countResult ? countResult.count : 0;
    const caseNumber = `DP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    runSql(
      `INSERT INTO cases (id, case_number, title, description, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'OPEN', datetime('now'))`,
      [id, caseNumber, title, description || '', req.user.id]
    );

    createAuditLog({
      userId: req.user.id,
      action: 'CASE_CREATED',
      entityType: 'CASE',
      entityId: id,
      details: `Created case ${caseNumber}: ${title}`,
      ipAddress: req.ip,
    });

    const newCase = queryOne('SELECT * FROM cases WHERE id = ?', [id]);
    res.status(201).json({ case: newCase });
  } catch (err) {
    console.error('[CASES] Create error:', err);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

/**
 * GET /api/cases/:id
 * Get case details with evidence. Officers can only see their own.
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const caseData = queryOne(
      `SELECT c.*, u.name as creator_name
       FROM cases c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Authorization: officers can only see their own cases
    if (req.user.role === 'LEGAL_OFFICER' && caseData.created_by !== req.user.id) {
      createAuditLog({
        userId: req.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        entityType: 'CASE',
        entityId: caseData.id,
        details: `Officer ${req.user.email} attempted to access case ${caseData.case_number} owned by another officer`,
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'You do not have access to this case' });
    }

    const evidence = queryAll(
      `SELECT id, original_filename, file_size, mime_type, sha256_hash, encryption_status, uploaded_at, status
       FROM evidence
       WHERE case_id = ? AND status = 'ACTIVE'
       ORDER BY uploaded_at DESC`,
      [req.params.id]
    );

    res.json({ case: caseData, evidence });
  } catch (err) {
    console.error('[CASES] Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

module.exports = router;
