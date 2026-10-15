import type { Command } from 'commander';
import { requireTask, updateTaskFields } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { unwrap } from '../utils/errors.js';
import type { CommandDeps } from '../utils/types.js';
import { buildUpdate, parseId, type TaskUpdate, type UpdateOptions } from '../utils/validation.js';

const fieldNames: ReadonlyArray<[keyof TaskUpdate, string]> = [
  ['title', 'título'],
  ['description', 'descripción'],
  ['priority', 'prioridad'],
];

export function runUpdate(deps: CommandDeps, idText: string, options: UpdateOptions): void {
  const id = unwrap(parseId(idText));
  requireTask(deps.db, id);
  const update = unwrap(buildUpdate(options));
  updateTaskFields(deps.db, id, update);
  const changed = fieldNames.filter(([key]) => key in update).map(([, name]) => name);
  deps.print(`Tarea ${id} actualizada (${changed.join(', ')}).`);
}

export function registerUpdate(program: Command, getDeps: GetDeps): void {
  program
    .command('update')
    .description('Modifica el título, la descripción o la prioridad de una tarea')
    .argument('<id>', 'ID de la tarea')
    .option('-t, --title <title>', 'Nuevo título')
    .option('-d, --description <text>', 'Nueva descripción')
    .option('--clear-description', 'Elimina la descripción')
    .option('-p, --priority <priority>', 'Nueva prioridad: high, medium o low')
    .action((id: string, options: UpdateOptions) => runUpdate(getDeps(), id, options));
}
