import type { Command } from 'commander';
import { deleteTask, requireTask } from '../db/tasks.js';
import type { GetDeps } from '../program.js';
import { askConfirmation, isAffirmative } from '../utils/confirm.js';
import { unwrap, userError } from '../utils/errors.js';
import type { CommandDeps } from '../utils/types.js';
import { parseId } from '../utils/validation.js';

export interface DeleteDeps extends CommandDeps {
  confirm: (question: string) => Promise<string>;
  isInteractive: boolean;
}

export interface DeleteOptions {
  force?: boolean;
}

export async function runDelete(deps: DeleteDeps, idText: string, options: DeleteOptions): Promise<void> {
  const id = unwrap(parseId(idText));
  const task = requireTask(deps.db, id);
  if (!options.force) {
    // Sin terminal no se puede confirmar: es un fallo (salida 1), no una cancelación del usuario.
    if (!deps.isInteractive) {
      throw userError(
        'no se puede pedir confirmación en un entorno no interactivo. Usa --force para eliminar sin confirmar.',
      );
    }
    const answer = await deps.confirm(`¿Eliminar la tarea ${id} "${task.title}"? [s/N] `);
    if (!isAffirmative(answer)) {
      deps.print(`Operación cancelada. La tarea ${id} no se eliminó.`);
      return;
    }
  }
  deleteTask(deps.db, id);
  deps.print(`Tarea ${id} eliminada.`);
}

export function registerDelete(program: Command, getDeps: GetDeps): void {
  program
    .command('delete')
    .description('Elimina una tarea (pide confirmación)')
    .argument('<id>', 'ID de la tarea')
    .option('-f, --force', 'Elimina sin pedir confirmación')
    .action((id: string, options: DeleteOptions) =>
      runDelete(
        { ...getDeps(), confirm: askConfirmation, isInteractive: Boolean(process.stdin.isTTY) },
        id,
        options,
      ),
    );
}
