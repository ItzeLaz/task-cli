import Database from 'better-sqlite3';
import { PassThrough } from 'node:stream';
import { initSchema } from '../src/db/connection.js';
import type { CommandDeps } from '../src/utils/types.js';

// FORCE_COLOR tendría prioridad sobre el stream no-TTY y metería códigos ANSI en las aserciones.
delete process.env.FORCE_COLOR;
delete process.env.NO_COLOR;

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initSchema(db);
  return db;
}

export function captureOutput() {
  const lines: string[] = [];
  return {
    lines,
    print: (text: string) => {
      lines.push(text);
    },
    text: () => lines.join('\n'),
  };
}

/** Stream que no es TTY: styleText no colorea al escribir para él. */
export const plainStream = new PassThrough();

export function makeDeps(db: Database.Database = createTestDb()) {
  const output = captureOutput();
  const deps: CommandDeps = { db, print: output.print, colorStream: plainStream };
  return { deps, output, db };
}
