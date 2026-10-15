import type { Command } from 'commander';
import { insertTask } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { unwrap } from '../utils/errors.js';
import type { CommandDeps } from '../utils/types.js';
import { parseDescription, parsePriority, parseTitle } from '../utils/validation.js';

export interface AddOptions {
  priority?: string;
  description?: string;
}

export function runAdd(deps: CommandDeps, titleText: string, options: AddOptions): void {
  const title = unwrap(parseTitle(titleText));
  const priority = unwrap(parsePriority(options.priority ?? 'medium'));
  const description = unwrap(parseDescription(options.description ?? ''));
  const task = insertTask(deps.db, { title, description, priority });
  deps.print(`Tarea ${task.id} creada: "${task.title}".`);
}

export function registerAdd(program: Command, getDeps: GetDeps): void {
  program
    .command('add')
    .description('Crea una tarea')
    .argument('<title>', 'Título de la tarea (entre comillas si tiene espacios)')
    .option('-p, --priority <priority>', 'Prioridad: high, medium o low (por defecto: medium)')
    .option('-d, --description <text>', 'Descripción opcional')
    .action((title: string, options: AddOptions) => runAdd(getDeps(), title, options));
}
