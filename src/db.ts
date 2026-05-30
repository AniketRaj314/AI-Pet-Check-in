import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..");
const db = new Database(path.join(dataDir, "checkins.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id TEXT NOT NULL UNIQUE,
    guest_name TEXT,
    guest_email TEXT,
    event_type TEXT NOT NULL DEFAULT 'workshop',
    checked_in_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add event_type to existing tables that don't have it
try {
  db.exec(`ALTER TABLE checkins ADD COLUMN event_type TEXT NOT NULL DEFAULT 'workshop'`);
} catch {
  // Column already exists — ignore
}

export const insertCheckin = db.prepare<{
  guest_id: string;
  guest_name: string | null;
  guest_email: string | null;
  event_type: string;
}>(`INSERT INTO checkins (guest_id, guest_name, guest_email, event_type) VALUES (@guest_id, @guest_name, @guest_email, @event_type)`);

export const findCheckin = db.prepare<{ guest_id: string }>(
  `SELECT * FROM checkins WHERE guest_id = @guest_id`
);

export const countCheckins = db.prepare(`SELECT COUNT(*) as count FROM checkins`);

export const recentCheckins = db.prepare(
  `SELECT guest_name, guest_email, event_type, checked_in_at FROM checkins ORDER BY id DESC`
);

export const deleteCheckinByEmail = db.prepare<{ email: string }>(
  `DELETE FROM checkins WHERE guest_email = @email`
);

export const deleteAllCheckins = db.prepare(`DELETE FROM checkins`);

export default db;
