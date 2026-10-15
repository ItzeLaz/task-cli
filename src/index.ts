#!/usr/bin/env node
import type Database from 'better-sqlite3';
import { openDatabase } from './db/connection.js';
import { main } from './program.js';
import type { CommandDeps } from './utils/types.js';

let db: Database.Database | undefined;

const getDeps = (): CommandDeps => {
  db ??= openDatabase();
  return {
    db,
    print: (text) => process.stdout.write(`${text}\n`),
    colorStream: process.stdout,
  };
};

const io = {
  stdout: (text: string) => process.stdout.write(text),
  stderr: (text: string) => process.stderr.write(text),
};

process.exitCode = await main(process.argv, io, getDeps);
db?.close();
