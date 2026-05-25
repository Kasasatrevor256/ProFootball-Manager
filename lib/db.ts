import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.APP_DB_PATH || path.join(process.cwd(), 'munyonyo.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      annual REAL NOT NULL DEFAULT 150000,
      monthly REAL NOT NULL DEFAULT 10000,
      pitch REAL NOT NULL DEFAULT 5000,
      match_day INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_days (
      id TEXT PRIMARY KEY,
      match_date TEXT NOT NULL,
      opponent TEXT,
      venue TEXT,
      match_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      match_day_id TEXT REFERENCES match_days(id) ON DELETE SET NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status   ON users(status);

    CREATE INDEX IF NOT EXISTS idx_players_name   ON players(name);
    CREATE INDEX IF NOT EXISTS idx_players_phone  ON players(phone);

    CREATE INDEX IF NOT EXISTS idx_match_days_date ON match_days(match_date);
    CREATE INDEX IF NOT EXISTS idx_match_days_type ON match_days(match_type);

    CREATE INDEX IF NOT EXISTS idx_payments_player_id   ON payments(player_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date        ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_payments_type        ON payments(payment_type);
    CREATE INDEX IF NOT EXISTS idx_payments_player_type ON payments(player_id, payment_type);
    CREATE INDEX IF NOT EXISTS idx_payments_created_by  ON payments(created_by);

    CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category  ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_match_day ON expenses(match_day_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
  `);

  // Seed default admin user if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, email, role, status, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), 'Admin', 'admin@munyonyo.com', 'admin', 'active', passwordHash, now, now);
    console.log('[db] Default admin user created: admin@munyonyo.com / admin123');
  }

  console.log('[db] Database initialized at:', dbPath);
}

export { db };
export default db;
