const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initSchema, queryOne, runSql, saveDb } = require('./schema');
const { encryptBuffer } = require('../utils/crypto');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function seed() {
  console.log('[SEED] Starting idempotent seed process...');
  
  initSchema();
  ensureUploadsDir();

  // --- Seed Users ---
  const SALT_ROUNDS = 12;

  const users = [
    {
      id: 'usr-admin-001',
      name: 'System Administrator',
      email: 'admin@digiprotect.gov',
      password: 'Admin123!',
      role: 'ADMIN',
      status: 'APPROVED',
    },
    {
      id: 'usr-officer-001',
      name: 'Sarah Chen',
      email: 'sarah.chen@digiprotect.gov',
      password: 'Officer123!',
      role: 'LEGAL_OFFICER',
      status: 'APPROVED',
    },
    {
      id: 'usr-officer-002',
      name: 'James Wright',
      email: 'james.wright@digiprotect.gov',
      password: 'Officer123!',
      role: 'LEGAL_OFFICER',
      status: 'PENDING',
    },
  ];

  for (const user of users) {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [user.id]);
    if (!existing) {
      const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
      runSql(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [user.id, user.name, user.email, hash, user.role, user.status]
      );
      console.log(`[SEED] Created user: ${user.email} (${user.role}/${user.status})`);
    } else {
      console.log(`[SEED] User already exists: ${user.email} — skipped`);
    }
  }

  // --- Seed Cases ---
  const cases = [
    {
      id: 'case-001',
      case_number: 'DP-2024-0001',
      title: 'Digital Fraud Investigation - Meridian Corp',
      description: 'Investigation into suspected digital financial fraud involving falsified electronic records at Meridian Corporation. Multiple suspicious transactions identified between Jan-Mar 2024.',
      created_by: 'usr-officer-001',
      status: 'OPEN',
    },
    {
      id: 'case-002',
      case_number: 'DP-2024-0002',
      title: 'Intellectual Property Theft - Nova Systems',
      description: 'Alleged unauthorized access and exfiltration of proprietary source code from Nova Systems internal repositories. Incident reported on 2024-02-15.',
      created_by: 'usr-officer-001',
      status: 'OPEN',
    },
  ];

  for (const c of cases) {
    const existing = queryOne('SELECT id FROM cases WHERE id = ?', [c.id]);
    if (!existing) {
      runSql(
        `INSERT INTO cases (id, case_number, title, description, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [c.id, c.case_number, c.title, c.description, c.created_by, c.status]
      );
      console.log(`[SEED] Created case: ${c.case_number}`);
    } else {
      console.log(`[SEED] Case already exists: ${c.case_number} — skipped`);
    }
  }

  // --- Seed Evidence ---
  const evidenceItems = [
    {
      id: 'evd-001',
      case_id: 'case-001',
      uploaded_by: 'usr-officer-001',
      original_filename: 'transaction_log_jan2024.csv',
      content: 'date,amount,from_account,to_account,description\n2024-01-05,15000.00,ACC-001,ACC-099,Wire Transfer\n2024-01-12,27500.00,ACC-001,ACC-099,Service Payment\n2024-01-18,43000.00,ACC-002,ACC-099,Consulting Fee\n',
      mime_type: 'text/csv',
    },
    {
      id: 'evd-002',
      case_id: 'case-001',
      uploaded_by: 'usr-officer-001',
      original_filename: 'email_evidence_feb2024.txt',
      content: 'From: j.smith@meridian-corp.com\nTo: r.jones@external-accounts.com\nDate: 2024-02-03\nSubject: Urgent - Transfer Confirmation\n\nPlease confirm the transfer of $43,000 to account ACC-099.\nThis must be processed before end of business today.\n',
      mime_type: 'text/plain',
    },
    {
      id: 'evd-003',
      case_id: 'case-002',
      uploaded_by: 'usr-officer-001',
      original_filename: 'access_log_nova_systems.log',
      content: '2024-02-15 02:14:33 [WARN] Unauthorized access attempt - User: ext_contractor_7 - Resource: /repos/nova-core/src\n2024-02-15 02:14:45 [ERROR] Bulk download initiated - 2.3GB - User: ext_contractor_7\n2024-02-15 02:15:01 [ALERT] Data exfiltration detected - Destination: 185.203.xx.xx\n',
      mime_type: 'text/plain',
    },
    {
      id: 'evd-004',
      case_id: 'case-002',
      uploaded_by: 'usr-officer-001',
      original_filename: 'network_capture_summary.txt',
      content: 'Network Forensics Report - Nova Systems Incident\n\nCapture Period: 2024-02-15 02:00 - 03:00 UTC\nTotal Packets: 847,293\nSuspicious Connections: 14\nData Transferred: 2.31 GB\nDestination IPs: 185.203.xx.xx (3 connections), 91.142.xx.xx (11 connections)\nProtocol: HTTPS/TLS 1.3\nNote: Traffic patterns consistent with automated exfiltration tool\n',
      mime_type: 'text/plain',
    },
  ];

  for (const evd of evidenceItems) {
    const existing = queryOne('SELECT id FROM evidence WHERE id = ?', [evd.id]);
    if (!existing) {
      const contentBuffer = Buffer.from(evd.content, 'utf-8');
      
      // Hash BEFORE encryption
      const hash = crypto.createHash('sha256').update(contentBuffer).digest('hex');
      
      // Encrypt
      const { encrypted, iv, authTag } = encryptBuffer(contentBuffer);
      
      // Write encrypted file
      const storedFilename = `${uuidv4()}.enc`;
      const filePath = path.join(UPLOADS_DIR, storedFilename);
      fs.writeFileSync(filePath, encrypted);
      
      runSql(
        `INSERT INTO evidence (id, case_id, uploaded_by, original_filename, stored_filename, file_size, mime_type, sha256_hash, encryption_iv, encryption_auth_tag, encryption_status, uploaded_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ENCRYPTED', datetime('now'), 'ACTIVE')`,
        [evd.id, evd.case_id, evd.uploaded_by, evd.original_filename, storedFilename, contentBuffer.length, evd.mime_type, hash, iv, authTag]
      );
      console.log(`[SEED] Created evidence: ${evd.original_filename} (SHA-256: ${hash.substring(0, 16)}...)`);
    } else {
      console.log(`[SEED] Evidence already exists: ${evd.original_filename} — skipped`);
    }
  }

  // --- Seed Audit Logs ---
  const auditLogs = [
    { id: 'aud-001', user_id: 'usr-admin-001', action: 'LOGIN', entity_type: null, entity_id: null, details: 'Admin login successful' },
    { id: 'aud-002', user_id: 'usr-officer-001', action: 'OFFICER_REGISTERED', entity_type: 'USER', entity_id: 'usr-officer-001', details: 'Legal Officer Sarah Chen registered' },
    { id: 'aud-003', user_id: 'usr-admin-001', action: 'OFFICER_APPROVED', entity_type: 'USER', entity_id: 'usr-officer-001', details: 'Admin approved Legal Officer Sarah Chen' },
    { id: 'aud-004', user_id: 'usr-officer-001', action: 'LOGIN', entity_type: null, entity_id: null, details: 'Officer Sarah Chen login successful' },
    { id: 'aud-005', user_id: 'usr-officer-001', action: 'CASE_CREATED', entity_type: 'CASE', entity_id: 'case-001', details: 'Created case DP-2024-0001: Digital Fraud Investigation' },
    { id: 'aud-006', user_id: 'usr-officer-001', action: 'CASE_CREATED', entity_type: 'CASE', entity_id: 'case-002', details: 'Created case DP-2024-0002: IP Theft Investigation' },
    { id: 'aud-007', user_id: 'usr-officer-001', action: 'EVIDENCE_UPLOADED', entity_type: 'EVIDENCE', entity_id: 'evd-001', details: 'Uploaded transaction_log_jan2024.csv to case DP-2024-0001' },
    { id: 'aud-008', user_id: 'usr-officer-001', action: 'EVIDENCE_UPLOADED', entity_type: 'EVIDENCE', entity_id: 'evd-002', details: 'Uploaded email_evidence_feb2024.txt to case DP-2024-0001' },
    { id: 'aud-009', user_id: 'usr-officer-001', action: 'EVIDENCE_UPLOADED', entity_type: 'EVIDENCE', entity_id: 'evd-003', details: 'Uploaded access_log_nova_systems.log to case DP-2024-0002' },
    { id: 'aud-010', user_id: 'usr-officer-001', action: 'EVIDENCE_UPLOADED', entity_type: 'EVIDENCE', entity_id: 'evd-004', details: 'Uploaded network_capture_summary.txt to case DP-2024-0002' },
    { id: 'aud-011', user_id: 'usr-officer-001', action: 'EVIDENCE_VERIFIED', entity_type: 'EVIDENCE', entity_id: 'evd-001', details: 'Evidence integrity verified: VERIFIED' },
    { id: 'aud-012', user_id: 'usr-officer-002', action: 'OFFICER_REGISTERED', entity_type: 'USER', entity_id: 'usr-officer-002', details: 'Legal Officer James Wright registered (PENDING)' },
  ];

  for (const log of auditLogs) {
    const existing = queryOne('SELECT id FROM audit_logs WHERE id = ?', [log.id]);
    if (!existing) {
      runSql(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [log.id, log.user_id, log.action, log.entity_type, log.entity_id, log.details]
      );
      console.log(`[SEED] Created audit log: ${log.action}`);
    } else {
      console.log(`[SEED] Audit log already exists: ${log.action} — skipped`);
    }
  }

  saveDb();
  console.log('[SEED] Seed process completed successfully');
}

// Run if called directly
if (require.main === module) {
  const dotenvPath = path.join(__dirname, '..', '..', '.env');
  require('dotenv').config({ path: dotenvPath });
  const { initDatabase } = require('./schema');
  
  initDatabase().then(() => {
    return seed();
  }).then(() => {
    const { closeDb } = require('./schema');
    closeDb();
    process.exit(0);
  }).catch(err => {
    console.error('[SEED] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
