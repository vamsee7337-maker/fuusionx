require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase, initSchema, getDb, queryOne } = require('./db/schema');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
  try {
    const result = queryOne('SELECT 1 as ok');
    res.json({
      status: 'healthy',
      server: 'running',
      database: result && result.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      server: 'running',
      database: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/officers', require('./routes/officers'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/dashboard', require('./routes/dashboard'));

// --- Static Frontend Serving ---
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- Error handling ---
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Startup ---
async function start() {
  try {
    // Validate required env vars
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    console.log('[SERVER] Initializing database...');
    await initDatabase();
    
    console.log('[SERVER] Running seed process...');
    await seed();

    app.listen(PORT, () => {
      console.log(`[SERVER] DigiProtect backend running on http://localhost:${PORT}`);
      console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

start();
