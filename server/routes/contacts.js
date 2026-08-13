const express = require('express');
const router = express.Router();
const db = require('../db/schema');

// GET all contacts
router.get('/', (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    rows = db.prepare(`
      SELECT * FROM contacts
      WHERE name LIKE ? OR company LIKE ? OR phone LIKE ?
      ORDER BY name ASC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    rows = db.prepare('SELECT * FROM contacts ORDER BY name ASC').all();
  }
  res.json(rows);
});

// GET single contact
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Contact not found' });
  res.json(row);
});

// POST create contact
router.post('/', (req, res) => {
  const { name, company, phone, email, tags, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });
  const result = db.prepare(`
    INSERT INTO contacts (name, company, phone, email, tags, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, company || null, phone, email || null, tags || null, notes || null);
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// PUT update contact
router.put('/:id', (req, res) => {
  const { name, company, phone, email, tags, notes } = req.body;
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare(`
    UPDATE contacts SET name=?, company=?, phone=?, email=?, tags=?, notes=?
    WHERE id=?
  `).run(name, company || null, phone, email || null, tags || null, notes || null, req.params.id);
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE contact
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
