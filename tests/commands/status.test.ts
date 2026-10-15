import { describe, expect, it } from 'vitest';
import { runStatus } from '../../src/commands/status.js';
import { findTask, insertTask, updateTaskStatus } from '../../src/db/tasks.js';
import type { TaskStatus } from '../../src/utils/types.js';
import { makeDeps } from '../helpers.js';

function setup(status: TaskStatus = 'todo') {
  const ctx = makeDeps();
  insertTask(ctx.db, { title: 'Comprar pan', description: null, priority: 'medium' });
  updateTaskStatus(ctx.db, 1, status);
  const statusOf = () => findTask(ctx.db, 1)?.status;
  return { ...ctx, statusOf };
}

describe('status', () => {
  it.each<[TaskStatus, TaskStatus]>([
    ['todo', 'in-progress'], // escenario 1
    ['in-progress', 'done'], // escenario 2
    ['in-progress', 'todo'], // escenario 3
    ['done', 'todo'], // escenario 4
  ])('aplica la transición válida %s → %s', (from, to) => {
    const { deps, output, statusOf } = setup(from);
    runStatus(deps, '1', to);
    expect(statusOf()).toBe(to);
    expect(output.text()).toBe(`Tarea 1: ${from} → ${to}.`);
  });

  it('rechaza todo → done sin modificar la tarea (escenario 5)', () => {
    const { deps, statusOf } = setup('todo');
    expect(() => runStatus(deps, '1', 'done')).toThrow(
      'no se puede pasar de todo a done. Primero cambia la tarea a in-progress.',
    );
    expect(statusOf()).toBe('todo');
  });

  it('rechaza done → in-progress indicando lo permitido (escenario 6)', () => {
    const { deps, statusOf } = setup('done');
    expect(() => runStatus(deps, '1', 'in-progress')).toThrow('Desde done solo se permite: todo.');
    expect(statusOf()).toBe('done');
  });

  it('rechaza cambiar al mismo estado', () => {
    const { deps, statusOf } = setup('todo');
    expect(() => runStatus(deps, '1', 'todo')).toThrow(
      'la tarea 1 ya está en todo. Desde todo solo se permite: in-progress.',
    );
    expect(statusOf()).toBe('todo');
  });

  it('informa si la tarea no existe (escenario 7)', () => {
    const { deps } = setup();
    expect(() => runStatus(deps, '99', 'done')).toThrow('no existe la tarea 99.');
  });

  it('rechaza estados inválidos listando los válidos (escenario 8)', () => {
    const { deps, statusOf } = setup();
    expect(() => runStatus(deps, '1', 'doing')).toThrow(
      'estado inválido "doing". Valores válidos: todo, in-progress, done.',
    );
    expect(statusOf()).toBe('todo');
  });

  it('acepta el estado sin distinguir mayúsculas', () => {
    const { deps, statusOf } = setup('in-progress');
    runStatus(deps, '1', 'DONE');
    expect(statusOf()).toBe('done');
  });
});
