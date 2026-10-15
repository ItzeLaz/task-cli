import { describe, expect, it, vi } from 'vitest';
import { runDelete } from '../../src/commands/delete.js';
import { findTask, insertTask } from '../../src/db/tasks.js';
import { makeDeps } from '../helpers.js';

function setup({ answer = '', isInteractive = true } = {}) {
  const ctx = makeDeps();
  insertTask(ctx.db, { title: 'Comprar pan', description: null, priority: 'medium' });
  const confirm = vi.fn(async (_question: string) => answer);
  const deps = { ...ctx.deps, confirm, isInteractive };
  return { ...ctx, deps, confirm, exists: () => findTask(ctx.db, 1) !== undefined };
}

describe('delete', () => {
  it('pide confirmación mostrando el título (escenario 1)', async () => {
    const { deps, confirm } = setup({ answer: 'n' });
    await runDelete(deps, '1', {});
    expect(confirm).toHaveBeenCalledWith('¿Eliminar la tarea 1 "Comprar pan"? [s/N] ');
  });

  it.each(['sí', 'S', 'yes'])('elimina si la respuesta es afirmativa (%j, escenario 2)', async (answer) => {
    const { deps, output, exists } = setup({ answer });
    await runDelete(deps, '1', {});
    expect(exists()).toBe(false);
    expect(output.text()).toBe('Tarea 1 eliminada.');
  });

  it.each(['', 'n', 'no'])('cancela con %j sin lanzar error (escenario 3)', async (answer) => {
    const { deps, output, exists } = setup({ answer });
    await expect(runDelete(deps, '1', {})).resolves.toBeUndefined();
    expect(exists()).toBe(true);
    expect(output.text()).toBe('Operación cancelada. La tarea 1 no se eliminó.');
  });

  it('con --force elimina sin preguntar (escenario 4)', async () => {
    const { deps, confirm, output, exists } = setup();
    await runDelete(deps, '1', { force: true });
    expect(confirm).not.toHaveBeenCalled();
    expect(exists()).toBe(false);
    expect(output.text()).toBe('Tarea 1 eliminada.');
  });

  it('informa si la tarea no existe sin preguntar (escenario 5)', async () => {
    const { deps, confirm } = setup();
    await expect(runDelete(deps, '99', {})).rejects.toThrow('no existe la tarea 99.');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('sin terminal interactiva y sin --force falla sin eliminar ni preguntar', async () => {
    const { deps, confirm, exists } = setup({ isInteractive: false });
    await expect(runDelete(deps, '1', {})).rejects.toThrow(
      'no se puede pedir confirmación en un entorno no interactivo. Usa --force para eliminar sin confirmar.',
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(exists()).toBe(true);
  });

  it('sin terminal interactiva pero con --force elimina', async () => {
    const { deps, exists } = setup({ isInteractive: false });
    await runDelete(deps, '1', { force: true });
    expect(exists()).toBe(false);
  });
});
