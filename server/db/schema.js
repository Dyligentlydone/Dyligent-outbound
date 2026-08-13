const Database = require('better-sqlite3');
const path = require('path');

// DB_PATH can be overridden via env var — point to a Railway Volume mount for persistence
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/dyligent.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    company   TEXT,
    phone     TEXT NOT NULL,
    email     TEXT,
    tags      TEXT,
    notes     TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    twilio_sid  TEXT UNIQUE,
    direction   TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    from_number TEXT NOT NULL,
    to_number   TEXT NOT NULL,
    status      TEXT DEFAULT 'initiated',
    duration    INTEGER DEFAULT 0,
    notes       TEXT,
    contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    recording_url TEXT,
    started_at  TEXT DEFAULT (datetime('now')),
    ended_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid ON calls(twilio_sid);
  CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);
`);

module.exports = db;
