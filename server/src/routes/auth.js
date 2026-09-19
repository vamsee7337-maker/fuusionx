const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, runSql } = require('../db/schema');
const { authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Register a new Legal Officer (status = PENDING).
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    runSql(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, 'LEGAL_OFFICER', 'PENDING', datetime('now'))`,
      [id, name, email, passwordHash]
    );

    createAuditLog({
      userId: id,
      action: 'OFFICER_REGISTERED',
      entityType: 'USER',
      entityId: id,
      details: `Legal Officer ${name} registered (PENDING approval)`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Registration successful. Your account is pending admin approval.',
      user: { id, name, email, role: 'LEGAL_OFFICER', status: 'PENDING' },
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password. Returns JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      createAuditLog({
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS',
        details: `Failed login attempt for ${email}: invalid password`,
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check approval status
    if (user.status === 'PENDING') {
      return res.status(403).json({ 
        error: 'Account pending approval',
        message: 'Your account is awaiting admin approval. Please check back later.',
        status: 'PENDING'
      });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ 
        error: 'Account rejected',
        message: 'Your account has been rejected. Contact the administrator.',
        status: 'REJECTED'
      });
    }

    // Generate JWT — only put id in token, fetch fresh role/status from DB on each request
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      details: `${user.role === 'ADMIN' ? 'Admin' : 'Officer'} ${user.name} logged in`,
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info.
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
