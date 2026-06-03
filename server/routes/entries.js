const express = require('express');
const { get, all, run } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All entry routes require authentication
router.use(requireAuth);

// GET /api/entries/:pageKey — get all entries for a page, newest first
router.get('/:pageKey', (req, res) => {
  try {
    const { pageKey } = req.params;
    const entries = all(
      'SELECT id, page_key, content, created_at, updated_at FROM entries WHERE page_key = ? ORDER BY created_at DESC',
      [pageKey]
    );
    res.json({ ok: true, entries });
  } catch (err) {
    console.error('[entries] get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST /api/entries/:pageKey — create new entry
router.post('/:pageKey', (req, res) => {
  try {
    const { pageKey } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    run(
      'INSERT INTO entries (page_key, content) VALUES (?, ?)',
      [pageKey, content.trim()]
    );

    const entry = get(
      'SELECT id, page_key, content, created_at, updated_at FROM entries WHERE page_key = ? ORDER BY id DESC LIMIT 1',
      [pageKey]
    );

    res.status(201).json({ ok: true, entry });
  } catch (err) {
    console.error('[entries] create error:', err.message);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// PUT /api/entries/:pageKey/:id — update an entry
router.put('/:pageKey/:id', (req, res) => {
  try {
    const { pageKey, id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const existing = get('SELECT id FROM entries WHERE id = ? AND page_key = ?', [id, pageKey]);
    if (!existing) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    run(
      'UPDATE entries SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND page_key = ?',
      [content.trim(), id, pageKey]
    );

    const updated = get(
      'SELECT id, page_key, content, created_at, updated_at FROM entries WHERE id = ?',
      [id]
    );

    res.json({ ok: true, entry: updated });
  } catch (err) {
    console.error('[entries] update error:', err.message);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/entries/:pageKey/:id — delete an entry
router.delete('/:pageKey/:id', (req, res) => {
  try {
    const { pageKey, id } = req.params;

    const existing = get('SELECT id FROM entries WHERE id = ? AND page_key = ?', [id, pageKey]);
    if (!existing) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    run('DELETE FROM entries WHERE id = ? AND page_key = ?', [id, pageKey]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[entries] delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
