import type { Command } from 'commander';
import { requireTask } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { unwrap } from '../utils/errors.js';
import { renderTaskDetail } from '../utils/format.js';
import type { CommandDeps } from '../utils/types.js';
import { parseId } from '../utils/validation.js';

export function runShow(deps: CommandDeps, idText: string): void {
  const task = requireTask(deps.db, unwrap(parseId(idText)));
  deps.print(renderTaskDetail(task, deps.colorStream ?? process.stdout));
}

export function registerShow(program: Command, getDeps: GetDeps): void {
  program
    .command('show')
    .description('Muestra el detalle de una tarea, incluida su descripción')
    .argument('<id>', 'ID de la tarea')
    .action((id: string) => runShow(getDeps(), id));
}
