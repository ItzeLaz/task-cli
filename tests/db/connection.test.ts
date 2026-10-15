import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getDbPath, initSchema, openDatabase } from '../../src/db/connection.js';
import { isUserError } from '../../src/utils/errors.js';

const tempDirs: string[] = [];
const makeTempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-cli-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('initSchema', () => {
  it('crea la tabla tasks y fija user_version = 1', () => {
    const db = new Database(':memory:');
    initSchema(db);
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get();
    expect(table).toBeDefined();
    expect(db.pragma('user_version', { simple: true })).toBe(1);
  });

  it('es idempotente', () => {
    const db = new Database(':memory:');
    initSchema(db);
    db.prepare("INSERT INTO tasks (title, created_at) VALUES ('a', '2026-01-01T00:00:00.000Z')").run();
    initSchema(db);
    expect(db.prepare('SELECT count(*) AS n FROM tasks').get()).toEqual({ n: 1 });
  });

  it('las restricciones CHECK rechazan estados y prioridades inválidos', () => {
    const db = new Database(':memory:');
    initSchema(db);
    const insert = (status: string, priority: string) =>
      db
        .prepare("INSERT INTO tasks (title, status, priority, created_at) VALUES ('a', ?, ?, 'x')")
        .run(status, priority);
    expect(() => insert('doing', 'high')).toThrow();
    expect(() => insert('todo', 'urgent')).toThrow();
    expect(() => insert('todo', 'high')).not.toThrow();
  });
});

describe('getDbPath', () => {
  it('usa ~/.task-cli/tasks.db', () => {
    expect(getDbPath('/x')).toBe(join('/x', '.task-cli', 'tasks.db'));
  });
});

describe('openDatabase', () => {
  it('crea el directorio y el archivo si no existen', () => {
    const path = getDbPath(makeTempDir());
    const db = openDatabase(path);
    db.close();
    expect(existsSync(path)).toBe(true);
  });

  it('lanza un error de usuario con la ruta si el archivo está dañado', () => {
    const home = makeTempDir();
    const path = getDbPath(home);
    mkdirSync(join(home, '.task-cli'));
    writeFileSync(path, 'esto no es una base de datos sqlite, solo texto plano '.repeat(50));
    let caught: unknown;
    try {
      openDatabase(path);
    } catch (err) {
      caught = err;
    }
    expect(isUserError(caught)).toBe(true);
    expect((caught as Error).message).toContain(path);
  });
});
