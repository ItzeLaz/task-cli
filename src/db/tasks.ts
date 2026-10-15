import type Database from 'better-sqlite3';
import { userError } from '../utils/errors.js';
import type { Task, TaskPriority, TaskStatus } from '../utils/types.js';
import type { TaskUpdate } from '../utils/validation.js';

export const selectColumns = 'id, title, description, status, priority, created_at AS createdAt';

export interface NewTask {
  title: string;
  description: string | null;
  priority: TaskPriority;
}

export function insertTask(db: Database.Database, input: NewTask, now: Date = new Date()): Task {
  return db
    .prepare(
      `INSERT INTO tasks (title, description, priority, created_at) VALUES (?, ?, ?, ?)
       RETURNING ${selectColumns}`,
    )
    .get(input.title, input.description, input.priority, now.toISOString()) as Task;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
}

export function listTasks(
  db: Database.Database,
  filters: TaskFilters = {},
  order: 'asc' | 'desc' = 'desc',
): Task[] {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push('priority = ?');
    params.push(filters.priority);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  return db
    .prepare(`SELECT ${selectColumns} FROM tasks ${where} ORDER BY created_at ${direction}, id ${direction}`)
    .all(...params) as Task[];
}

// Únicas columnas que `update` puede tocar: estado, ID y fecha de creación quedan fuera (FR-017).
const updatableColumns = { title: 'title', description: 'description', priority: 'priority' } as const;

export function updateTaskFields(db: Database.Database, id: number, fields: TaskUpdate): void {
  const entries = Object.entries(fields).filter(
    (entry): entry is [keyof typeof updatableColumns, string | null] =>
      Object.hasOwn(updatableColumns, entry[0]) && entry[1] !== undefined,
  );
  if (entries.length === 0) return;
  const assignments = entries.map(([key]) => `${updatableColumns[key]} = ?`).join(', ');
  db.prepare(`UPDATE tasks SET ${assignments} WHERE id = ?`).run(...entries.map(([, value]) => value), id);
}

export function updateTaskStatus(db: Database.Database, id: number, status: TaskStatus): void {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
}

export function deleteTask(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

export function findTask(db: Database.Database, id: number): Task | undefined {
  return db.prepare(`SELECT ${selectColumns} FROM tasks WHERE id = ?`).get(id) as Task | undefined;
}

export function requireTask(db: Database.Database, id: number): Task {
  const task = findTask(db, id);
  if (!task) throw userError(`no existe la tarea ${id}.`);
  return task;
}
