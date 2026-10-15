import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { dbErrorMessage, userError } from '../utils/errors.js';

const schemaV1 = `
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in-progress', 'done')),
    priority    TEXT    NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high', 'medium', 'low')),
    created_at  TEXT    NOT NULL
  );
  PRAGMA user_version = 1;
`;

export function getDbPath(home: string = homedir()): string {
  return join(home, '.task-cli', 'tasks.db');
}

export function initSchema(db: Database.Database): void {
  if (db.pragma('user_version', { simple: true }) === 0) db.exec(schemaV1);
}

/** Abre (y crea si hace falta) la base de datos; cualquier fallo se convierte en error de usuario. */
export function openDatabase(path: string = getDbPath()): Database.Database {
  let db: Database.Database | undefined;
  try {
    mkdirSync(dirname(path), { recursive: true });
    db = new Database(path);
    db.pragma('busy_timeout = 2000');
    db.pragma('journal_mode = WAL');
    initSchema(db);
    db.prepare('SELECT count(*) FROM tasks').get();
    return db;
  } catch (err) {
    db?.close();
    throw userError(dbErrorMessage(path, err));
  }
}
