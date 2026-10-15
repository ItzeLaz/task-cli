import Table from 'cli-table3';
import { styleText } from 'node:util';
import type { Task, TaskPriority, TaskStatus } from './types.js';

type Stream = NodeJS.WritableStream;
type Color = Parameters<typeof styleText>[0];

const statusColors: Record<TaskStatus, Color> = { todo: 'gray', 'in-progress': 'yellow', done: 'green' };
const priorityColors: Record<TaskPriority, Color> = { high: 'red', medium: 'yellow', low: 'blue' };

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha ISO → `AAAA-MM-DD HH:mm` en hora local. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Recorta a `max` caracteres visibles (contando puntos de código), terminando en `…`. */
export function truncate(text: string, max = 50): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

// styleText decide con el stream si colorear: sin TTY o con NO_COLOR devuelve el texto tal cual.
export function colorStatus(status: TaskStatus, stream: Stream): string {
  return styleText(statusColors[status], status, { stream });
}

export function colorPriority(priority: TaskPriority, stream: Stream): string {
  return styleText(priorityColors[priority], priority, { stream });
}

export function renderTaskTable(tasks: readonly Task[], stream: Stream): string {
  const table = new Table({
    head: ['ID', 'Título', 'Estado', 'Prioridad', 'Creada'],
    style: { head: [], border: [] },
    // Sin líneas separadoras entre filas: una fila por tarea, más fácil de escanear.
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });
  for (const task of tasks) {
    table.push([
      String(task.id),
      truncate(task.title),
      colorStatus(task.status, stream),
      colorPriority(task.priority, stream),
      formatDate(task.createdAt),
    ]);
  }
  return table.toString();
}

export function renderTaskDetail(task: Task, stream: Stream): string {
  return [
    `ID:          ${task.id}`,
    `Título:      ${task.title}`,
    `Descripción: ${task.description ?? '(sin descripción)'}`,
    `Estado:      ${colorStatus(task.status, stream)}`,
    `Prioridad:   ${colorPriority(task.priority, stream)}`,
    `Creada:      ${formatDate(task.createdAt)}`,
  ].join('\n');
}
