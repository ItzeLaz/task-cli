import type { Command } from 'commander';
import { listTasks, type TaskFilters } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { unwrap } from '../utils/errors.js';
import { renderTaskTable } from '../utils/format.js';
import type { CommandDeps } from '../utils/types.js';
import { parsePriority, parseStatus } from '../utils/validation.js';

export interface ListOptions {
  status?: string;
  priority?: string;
  reverse?: boolean;
}

function describeFilters(filters: TaskFilters): string {
  return [
    filters.status && `estado: ${filters.status}`,
    filters.priority && `prioridad: ${filters.priority}`,
  ]
    .filter(Boolean)
    .join(', ');
}

export function runList(deps: CommandDeps, options: ListOptions): void {
  const filters: TaskFilters = {
    status: options.status === undefined ? undefined : unwrap(parseStatus(options.status)),
    priority: options.priority === undefined ? undefined : unwrap(parsePriority(options.priority)),
  };
  const tasks = listTasks(deps.db, filters, options.reverse ? 'asc' : 'desc');
  if (tasks.length > 0) {
    deps.print(renderTaskTable(tasks, deps.colorStream ?? process.stdout));
  } else if (filters.status || filters.priority) {
    deps.print(`No hay tareas que coincidan con los filtros (${describeFilters(filters)}).`);
  } else {
    deps.print('No hay tareas. Crea una con: task-cli add "<título>"');
  }
}

export function registerList(program: Command, getDeps: GetDeps): void {
  program
    .command('list')
    .description('Lista las tareas, de la más reciente a la más antigua')
    .option('-s, --status <status>', 'Filtra por estado: todo, in-progress o done')
    .option('-p, --priority <priority>', 'Filtra por prioridad: high, medium o low')
    .option('-r, --reverse', 'Muestra primero las más antiguas')
    .action((options: ListOptions) => runList(getDeps(), options));
}
