import {
  taskPriorities,
  taskStatuses,
  type Result,
  type TaskPriority,
  type TaskStatus,
} from './types.js';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

export function parseId(text: string): Result<number> {
  const id = /^\d+$/.test(text) ? Number(text) : NaN;
  return Number.isSafeInteger(id) && id > 0
    ? ok(id)
    : fail(`el ID debe ser un entero positivo (recibido: "${text}").`);
}

export function parseTitle(text: string): Result<string> {
  const title = text.trim();
  return title ? ok(title) : fail('el título es obligatorio y no puede estar vacío.');
}

function parseEnum<T extends string>(values: readonly T[], invalidLabel: string, text: string): Result<T> {
  const value = text.trim().toLowerCase();
  return (values as readonly string[]).includes(value)
    ? ok(value as T)
    : fail(`${invalidLabel} "${text}". Valores válidos: ${values.join(', ')}.`);
}

export function parsePriority(text: string): Result<TaskPriority> {
  return parseEnum(taskPriorities, 'prioridad inválida', text);
}

export function parseStatus(text: string): Result<TaskStatus> {
  return parseEnum(taskStatuses, 'estado inválido', text);
}

export function parseDescription(text: string): Result<string | null> {
  return ok(text.trim() || null);
}

export interface UpdateOptions {
  title?: string;
  description?: string;
  clearDescription?: boolean;
  priority?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
}

/** Valida las opciones de `update` y devuelve solo los campos a modificar. */
export function buildUpdate(options: UpdateOptions): Result<TaskUpdate> {
  if (options.description !== undefined && options.clearDescription) {
    return fail('usa --description o --clear-description, no ambas.');
  }
  const update: TaskUpdate = {};
  if (options.title !== undefined) {
    const title = parseTitle(options.title);
    if (!title.ok) return title;
    update.title = title.value;
  }
  if (options.clearDescription) {
    update.description = null;
  } else if (options.description !== undefined) {
    const description = parseDescription(options.description);
    if (!description.ok) return description;
    update.description = description.value;
  }
  if (options.priority !== undefined) {
    const priority = parsePriority(options.priority);
    if (!priority.ok) return priority;
    update.priority = priority.value;
  }
  return Object.keys(update).length > 0
    ? ok(update)
    : fail('indica al menos un campo a modificar: --title, --description, --clear-description o --priority.');
}
