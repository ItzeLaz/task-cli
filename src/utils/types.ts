import type Database from 'better-sqlite3';

export const taskStatuses = ['todo', 'in-progress', 'done'] as const;
export const taskPriorities = ['high', 'medium', 'low'] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO 8601 en UTC, con milisegundos. */
  createdAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CommandDeps {
  db: Database.Database;
  print: (text: string) => void;
  /** Stream que decide si se colorea la salida (TTY / NO_COLOR). */
  colorStream?: NodeJS.WritableStream;
}
