import type { Command } from 'commander';
import { requireTask, updateTaskStatus } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { unwrap } from '../utils/errors.js';
import { checkTransition } from '../utils/transitions.js';
import type { CommandDeps } from '../utils/types.js';
import { parseId, parseStatus } from '../utils/validation.js';

export function runStatus(deps: CommandDeps, idText: string, statusText: string): void {
  const id = unwrap(parseId(idText));
  const target = unwrap(parseStatus(statusText));
  const task = requireTask(deps.db, id);
  const status = unwrap(checkTransition(id, task.status, target));
  updateTaskStatus(deps.db, id, status);
  deps.print(`Tarea ${id}: ${task.status} → ${status}.`);
}

export function registerStatus(program: Command, getDeps: GetDeps): void {
  program
    .command('status')
    .description('Cambia el estado de una tarea: todo, in-progress o done')
    .argument('<id>', 'ID de la tarea')
    .argument('<status>', 'Nuevo estado: todo, in-progress o done')
    .action((id: string, status: string) => runStatus(getDeps(), id, status));
}
