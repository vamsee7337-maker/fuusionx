const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { queryOne, runSql } = require('../db/schema');
const { authenticate, requireOfficer } = require('../middleware/auth');
const { encryptStreamAndHash, decryptStream, sha256 } = require('../utils/crypto');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types — no executables
const ALLOWED_MIME_TYPES = [
  'text/plain', 'text/csv', 'text/html',
  'application/pdf',
  'application/json',
  'application/xml', 'text/xml',
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/mpeg', 'video/webm',
  'application/zip', 'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
];

// Blocked file extensions — no executables
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.ps1', '.vbs', '.js', '.wsf', '.wsh',
  '.dll', '.sys', '.drv',
];

// Configure multer with disk storage (temp OS dir) for streaming encryption
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check blocked extensions
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed`));
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`MIME type ${file.mimetype} is not allowed`));
    }

    cb(null, true);
  },
});

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * POST /api/evidence/upload
 * Upload evidence to a case (officer only).
 */
router.post('/upload', authenticate, requireOfficer, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { caseId } = req.body;
      if (!caseId) {
        return res.status(400).json({ error: 'caseId is required' });
      }

      // Verify case exists and officer owns it
      const caseData = queryOne('SELECT * FROM cases WHERE id = ?', [caseId]);
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }

      if (caseData.created_by !== req.user.id) {
        createAuditLog({
          userId: req.user.id,
          action: 'UNAUTHORIZED_ACCESS',
          entityType: 'CASE',
          entityId: caseId,
          details: `Officer ${req.user.email} attempted to upload evidence to case ${caseData.case_number} owned by another officer`,
          ipAddress: req.ip,
        });
        return res.status(403).json({ error: 'You do not have access to this case' });
      }

      // 1. Path traversal protection — sanitize original filename
      const safeOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // 2. Generate server-side filename
      const storedFilename = `${uuidv4()}.enc`;
      const filePath = path.join(UPLOADS_DIR, storedFilename);

      // 3. Create read stream from multer's temp file
      const readStream = fs.createReadStream(req.file.path);

      // 4. Stream through hasher and encryptor directly to disk
      const { iv, authTag, sha256: hash } = await encryptStreamAndHash(readStream, filePath);

      // 5. Clean up multer temp file
      fs.unlinkSync(req.file.path);

      // 5. Store metadata
      const id = `evd-${uuidv4()}`;
      runSql(
        `INSERT INTO evidence (id, case_id, uploaded_by, original_filename, stored_filename, file_size, mime_type, sha256_hash, encryption_iv, encryption_auth_tag, encryption_status, uploaded_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ENCRYPTED', datetime('now'), 'ACTIVE')`,
        [id, caseId, req.user.id, safeOriginalName, storedFilename, req.file.size, req.file.mimetype, hash, iv, authTag]
      );

      // 6. Audit log
      createAuditLog({
        userId: req.user.id,
        action: 'EVIDENCE_UPLOADED',
        entityType: 'EVIDENCE',
        entityId: id,
        details: `Uploaded ${safeOriginalName} to case ${caseData.case_number} (SHA-256: ${hash.substring(0, 16)}...)`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        evidence: {
          id,
          case_id: caseId,
          original_filename: safeOriginalName,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          sha256_hash: hash,
          encryption_status: 'ENCRYPTED',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      console.error('[EVIDENCE] Upload error:', error);
      res.status(500).json({ error: 'Failed to upload evidence' });
    }
  });
});

/**
 * GET /api/evidence/:id
 * Get evidence metadata. Officers can only see evidence from their cases.
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const evidence = queryOne(
      `SELECT e.*, c.case_number, c.title as case_title, c.created_by as case_owner
       FROM evidence e
       JOIN cases c ON e.case_id = c.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Authorization check
    if (req.user.role === 'LEGAL_OFFICER' && evidence.case_owner !== req.user.id) {
      createAuditLog({
        userId: req.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        details: `Officer ${req.user.email} attempted to access evidence from another officer's case`,
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'You do not have access to this evidence' });
    }

    createAuditLog({
      userId: req.user.id,
      action: 'EVIDENCE_ACCESSED',
      entityType: 'EVIDENCE',
      entityId: evidence.id,
      details: `Accessed evidence metadata: ${evidence.original_filename}`,
      ipAddress: req.ip,
    });

    // Don't expose stored_filename or encryption details to frontend
    const { stored_filename, encryption_iv, encryption_auth_tag, case_owner, ...safeEvidence } = evidence;
    res.json({ evidence: safeEvidence });
  } catch (err) {
    console.error('[EVIDENCE] Detail error:', err);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

/**
 * GET /api/evidence/:id/download
 * Download decrypted evidence. Officers can only download from their cases.
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const evidence = queryOne(
      `SELECT e.*, c.created_by as case_owner
       FROM evidence e
       JOIN cases c ON e.case_id = c.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Authorization check
    if (req.user.role === 'LEGAL_OFFICER' && evidence.case_owner !== req.user.id) {
      createAuditLog({
        userId: req.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        details: `Officer ${req.user.email} attempted to download evidence from another officer's case`,
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'You do not have access to this evidence' });
    }

    const filePath = path.join(UPLOADS_DIR, evidence.stored_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Evidence file not found on disk' });
    }

    res.setHeader('Content-Type', evidence.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.original_filename}"`);
    
    // Decrypt and stream directly to response
    await decryptStream(filePath, res, evidence.encryption_iv, evidence.encryption_auth_tag);
  } catch (err) {
    console.error('[EVIDENCE] Download error:', err);
    res.status(500).json({ error: 'Failed to download evidence' });
  }
});

/**
 * POST /api/evidence/:id/verify
 * Verify evidence integrity. Decrypts and re-hashes, compares with stored hash.
 */
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    const evidence = queryOne(
      `SELECT e.*, c.created_by as case_owner
       FROM evidence e
       JOIN cases c ON e.case_id = c.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Authorization check
    if (req.user.role === 'LEGAL_OFFICER' && evidence.case_owner !== req.user.id) {
      createAuditLog({
        userId: req.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        details: `Officer ${req.user.email} attempted to verify evidence from another officer's case`,
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'You do not have access to this evidence' });
    }

    const filePath = path.join(UPLOADS_DIR, evidence.stored_filename);
    if (!fs.existsSync(filePath)) {
      createAuditLog({
        userId: req.user.id,
        action: 'EVIDENCE_VERIFIED',
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        details: `Verification FAILED: Evidence file not found on disk`,
        ipAddress: req.ip,
      });
      return res.status(404).json({ error: 'Evidence file not found on disk', status: 'TAMPER_DETECTED' });
    }

    // 1. Decrypt into memory (since we only need to verify hash)
    // For large files this could be streaming too, but we need the hash.
    // Let's create a stream verification method.
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const { Writable } = require('stream');
    
    const hashStream = new Writable({
      write(chunk, encoding, callback) {
        hash.update(chunk);
        callback();
      }
    });

    await decryptStream(filePath, hashStream, evidence.encryption_iv, evidence.encryption_auth_tag);
    const currentHash = hash.digest('hex');

    // 4. Compare with stored hash
    const verified = currentHash === evidence.sha256_hash;
    const status = verified ? 'VERIFIED' : 'TAMPER_DETECTED';

    createAuditLog({
      userId: req.user.id,
      action: 'EVIDENCE_VERIFIED',
      entityType: 'EVIDENCE',
      entityId: evidence.id,
      details: `Evidence integrity verification: ${status} (${evidence.original_filename})`,
      ipAddress: req.ip,
    });

    res.json({
      status,
      evidence_id: evidence.id,
      original_filename: evidence.original_filename,
      stored_hash: evidence.sha256_hash,
      computed_hash: currentHash,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[EVIDENCE] Verify error:', err);
    res.status(500).json({ error: 'Failed to verify evidence' });
  }
});

module.exports = router;
