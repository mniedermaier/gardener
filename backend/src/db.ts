import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "./data/gardener.db";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gardens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      garden_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS state_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
