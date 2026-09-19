const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', '..', 'digiprotect.db');

let db = null;
let saveTimeout = null;
const SAVE_DELAY_MS = 2000; // 2 seconds delay

/**
 * Initialize the sql.js database. Must be called once at startup (async).
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database file if it exists, otherwise create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database from disk');
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * Get the database instance (synchronous after init).
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Initialize the schema (create tables if not exist).
 */
function initSchema() {
  const d = getDb();

  d.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'LEGAL_OFFICER')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      encryption_iv TEXT NOT NULL,
      encryption_auth_tag TEXT NOT NULL,
      encryption_status TEXT NOT NULL DEFAULT 'ENCRYPTED',
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DELETED')),
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  d.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes (IF NOT EXISTS)
  d.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  d.run('CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by)');
  d.run('CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id)');
  d.run('CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by)');
  d.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
  d.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');

  console.log('[DB] Schema initialized successfully');
}

/**
 * Save the database to disk. Call after write operations.
 * Debounced to prevent thrashing the disk on concurrent writes.
 */
function saveDb(force = false) {
  if (!db) return;
  
  if (force) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    _performSave();
    return;
  }

  if (!saveTimeout) {
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      _performSave();
    }, SAVE_DELAY_MS);
  }
}

function _performSave() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Close and save the database.
 */
function closeDb() {
  if (db) {
    saveDb(true);
    db.close();
    db = null;
  }
}

/**
 * Helper: Run a SELECT query and return all rows as objects.
 */
function queryAll(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: Run a SELECT query and return the first row as an object, or null.
 */
function queryOne(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/**
 * Helper: Run an INSERT/UPDATE/DELETE and save to disk.
 */
function runSql(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  saveDb();
}

module.exports = { initDatabase, getDb, initSchema, saveDb, closeDb, queryAll, queryOne, runSql };
