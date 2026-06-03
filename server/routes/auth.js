const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { get, run } = require('../db/database');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

function issueToken(res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

// POST /api/auth/register
// Only works if no user exists yet (single-user app)
router.post('/register', async (req, res) => {
  try {
    const existing = get('SELECT id FROM users LIMIT 1');
    if (existing) {
      return res.status(403).json({ error: 'An account already exists' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    run('INSERT INTO users (username, password) VALUES (?, ?)', [username.trim(), hash]);

    const user = get('SELECT id, username FROM users WHERE username = ?', [username.trim()]);
    issueToken(res, user);

    res.status(201).json({ ok: true, username: user.username });
  } catch (err) {
    console.error('[auth] register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = get('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      await bcrypt.hash('dummy', 12); // timing-safe: prevent user enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    issueToken(res, user);
    res.json({ ok: true, username: user.username });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ authenticated: false });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, username: payload.username });
  } catch {
    res.clearCookie('token');
    res.json({ authenticated: false });
  }
});

module.exports = router;
