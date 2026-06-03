require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./server/db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'self'"],
    },
  },
}));

// CORS — only allow same origin in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : `http://localhost:${PORT}`,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/entries', require('./server/routes/entries'));

// All other routes serve the frontend (SPA fallback)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB then start
getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  Life OS running at http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  DB path: ${process.env.DB_PATH || './server/db/lifeos.db'}\n`);
  });
}).catch(err => {
  console.error('[server] failed to initialize database:', err);
  process.exit(1);
});
