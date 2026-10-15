import { describe, expect, it } from 'vitest';
import { runUpdate } from '../../src/commands/update.js';
import { findTask, insertTask } from '../../src/db/tasks.js';
import { makeDeps } from '../helpers.js';

function setup() {
  const ctx = makeDeps();
  const task = insertTask(ctx.db, { title: 'Comprar pan', description: 'Integral', priority: 'medium' });
  return { ...ctx, task, current: () => findTask(ctx.db, 1) };
}

describe('update', () => {
  it('cambia solo la prioridad (escenario 1)', () => {
    const { deps, output, task, current } = setup();
    runUpdate(deps, '1', { priority: 'low' });
    expect(current()).toEqual({ ...task, priority: 'low' });
    expect(output.text()).toBe('Tarea 1 actualizada (prioridad).');
  });

  it('cambia título y descripción a la vez (escenario 2)', () => {
    const { deps, output, task, current } = setup();
    runUpdate(deps, '1', { title: 'Comprar leche', description: 'Desnatada' });
    expect(current()).toEqual({ ...task, title: 'Comprar leche', description: 'Desnatada' });
    expect(output.text()).toBe('Tarea 1 actualizada (título, descripción).');
  });

  it('rechaza la actualización sin campos (escenario 3)', () => {
    const { deps, task, current } = setup();
    expect(() => runUpdate(deps, '1', {})).toThrow(
      'indica al menos un campo a modificar: --title, --description, --clear-description o --priority.',
    );
    expect(current()).toEqual(task);
  });

  it('rechaza un título vacío sin cambiar la tarea (escenario 4)', () => {
    const { deps, task, current } = setup();
    expect(() => runUpdate(deps, '1', { title: '   ', priority: 'high' })).toThrow(
      'el título es obligatorio y no puede estar vacío.',
    );
    expect(current()).toEqual(task);
  });

  it('informa si la tarea no existe (escenario 5)', () => {
    const { deps } = setup();
    expect(() => runUpdate(deps, '99', { priority: 'low' })).toThrow('no existe la tarea 99.');
  });

  it('vacía la descripción con --clear-description', () => {
    const { deps, output, current } = setup();
    runUpdate(deps, '1', { clearDescription: true });
    expect(current()?.description).toBeNull();
    expect(output.text()).toBe('Tarea 1 actualizada (descripción).');
  });
});
