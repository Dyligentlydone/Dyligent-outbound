const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const twilio = require('twilio');

// GET call history
router.get('/', (req, res) => {
  const { limit = 100, offset = 0, direction, disposition } = req.query;
  let query = `
    SELECT c.*, co.name as contact_name, co.company as contact_company
    FROM calls c
    LEFT JOIN contacts co ON c.contact_id = co.id
  `;
  const wheres = [], params = [];
  if (direction)   { wheres.push('c.direction = ?');    params.push(direction); }
  if (disposition === 'untagged') {
    wheres.push('(c.disposition IS NULL OR c.disposition = \'\')');
  } else if (disposition) {
    wheres.push('c.disposition = ?'); params.push(disposition);
  }
  if (wheres.length) query += ' WHERE ' + wheres.join(' AND ');
  query += ' ORDER BY c.started_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/calls/stats — must be before /:id or Express matches 'stats' as an id
router.get('/stats', (req, res) => {
  const { period = 'today', from, to } = req.query;

  let fromDt, toDt;
  const now = new Date();
  if (period === 'today') {
    fromDt = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    toDt   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  } else if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    fromDt = new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
    toDt   = new Date(now.getFullYear(), now.getMonth(), diff + 7).toISOString();
  } else {
    fromDt = from ? new Date(from).toISOString() : new Date(0).toISOString();
    toDt   = to   ? new Date(new Date(to).getTime() + 86400000).toISOString() : new Date().toISOString();
  }

  const where = `WHERE c.started_at >= ? AND c.started_at < ?`;
  const p = [fromDt, toDt];

  const totals = db.prepare(`
    SELECT
      COUNT(*)                                              AS total,
      SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) AS outbound,
      SUM(CASE WHEN direction='inbound'  THEN 1 ELSE 0 END) AS inbound,
      SUM(CASE WHEN status='completed'   THEN 1 ELSE 0 END) AS connected,
      SUM(CASE WHEN status IN ('busy','no-answer','failed') THEN 1 ELSE 0 END) AS missed,
      COALESCE(SUM(duration), 0)                            AS total_duration,
      COALESCE(AVG(CASE WHEN duration > 0 THEN duration END), 0) AS avg_duration,
      COUNT(DISTINCT CASE WHEN direction='outbound' THEN to_number END) AS unique_numbers
    FROM calls c ${where}
  `).get(...p);

  const byDisposition = db.prepare(`
    SELECT COALESCE(disposition, 'untagged') AS disposition, COUNT(*) AS count
    FROM calls c ${where}
    GROUP BY disposition ORDER BY count DESC
  `).all(...p);

  const byHour = db.prepare(`
    SELECT CAST(strftime('%H', started_at) AS INTEGER) AS hour, COUNT(*) AS count
    FROM calls c ${where}
    GROUP BY hour ORDER BY hour
  `).all(...p);

  const byDay = db.prepare(`
    SELECT date(started_at) AS day, COUNT(*) AS count,
           SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS connected
    FROM calls c ${where}
    GROUP BY day ORDER BY day
  `).all(...p);

  res.json({ totals, byDisposition, byHour, byDay, fromDt, toDt });
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

// PATCH update call notes / status / disposition
router.patch('/:id', (req, res) => {
  const { notes, status, contact_id, disposition } = req.body;
  const existing = db.prepare('SELECT id FROM calls WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Call not found' });

  const updates = [];
  const params = [];
  if (notes !== undefined)       { updates.push('notes = ?');       params.push(notes); }
  if (status !== undefined)      { updates.push('status = ?');      params.push(status); }
  if (contact_id !== undefined)  { updates.push('contact_id = ?'); params.push(contact_id); }
  if (disposition !== undefined) { updates.push('disposition = ?'); params.push(disposition); }

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

// POST recording status callback — Twilio calls this when a recording is ready
router.post('/recording-status', (req, res) => {
  const { CallSid, RecordingUrl, RecordingStatus } = req.body;
  if (!CallSid || RecordingStatus !== 'completed') return res.sendStatus(200);

  db.prepare(`
    UPDATE calls SET recording_url = ? WHERE twilio_sid = ?
  `).run(RecordingUrl + '.mp3', CallSid);

  res.sendStatus(200);
});

// GET recording proxy — streams the Twilio recording through our server so
// the browser doesn't need Twilio credentials
router.get('/:id/recording', (req, res) => {
  const call = db.prepare('SELECT recording_url FROM calls WHERE id = ?').get(req.params.id);
  if (!call?.recording_url) return res.status(404).json({ error: 'No recording for this call' });

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const https = require('https');
  const url = new URL(call.recording_url);

  const proxyReq = https.request(
    { hostname: url.hostname, path: url.pathname, headers: { Authorization: `Basic ${auth}` } },
    (proxyRes) => {
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', () => res.status(502).json({ error: 'Failed to fetch recording' }));
  proxyReq.end();
});

module.exports = router;
