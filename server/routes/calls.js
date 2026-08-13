const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const twilio = require('twilio');

// GET call history
router.get('/', (req, res) => {
  const { limit = 50, offset = 0, direction } = req.query;
  let query = `
    SELECT c.*, co.name as contact_name, co.company as contact_company
    FROM calls c
    LEFT JOIN contacts co ON c.contact_id = co.id
  `;
  const params = [];
  if (direction) {
    query += ' WHERE c.direction = ?';
    params.push(direction);
  }
  query += ' ORDER BY c.started_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET single call
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT c.*, co.name as contact_name, co.company as contact_company
    FROM calls c LEFT JOIN contacts co ON c.contact_id = co.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Call not found' });
  res.json(row);
});

// PATCH update call notes / status
router.patch('/:id', (req, res) => {
  const { notes, status, contact_id } = req.body;
  const existing = db.prepare('SELECT id FROM calls WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Call not found' });

  const updates = [];
  const params = [];
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (contact_id !== undefined) { updates.push('contact_id = ?'); params.push(contact_id); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE calls SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  res.json(row);
});

// POST Twilio status callback — Twilio will hit this endpoint
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
  if (!CallSid) return res.sendStatus(200);

  const existing = db.prepare('SELECT id FROM calls WHERE twilio_sid = ?').get(CallSid);
  if (existing) {
    db.prepare(`
      UPDATE calls
      SET status = ?, duration = ?, recording_url = ?,
          ended_at = CASE WHEN ? IN ('completed','failed','busy','no-answer','canceled')
                         THEN datetime('now') ELSE ended_at END
      WHERE twilio_sid = ?
    `).run(
      CallStatus,
      CallDuration ? parseInt(CallDuration) : 0,
      RecordingUrl || null,
      CallStatus,
      CallSid
    );
  }
  res.sendStatus(200);
});

module.exports = router;
