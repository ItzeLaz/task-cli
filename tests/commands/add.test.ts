import { describe, expect, it } from 'vitest';
import { runAdd } from '../../src/commands/add.js';
import { findTask } from '../../src/db/tasks.js';
import { makeDeps } from '../helpers.js';

const count = (db: ReturnType<typeof makeDeps>['db']) =>
  (db.prepare('SELECT count(*) AS n FROM tasks').get() as { n: number }).n;

describe('add', () => {
  it('crea la tarea con ID 1, estado todo y prioridad medium (escenario 1)', () => {
    const { deps, output, db } = makeDeps();
    runAdd(deps, 'Comprar pan', {});
    expect(findTask(db, 1)).toMatchObject({ title: 'Comprar pan', status: 'todo', priority: 'medium' });
    expect(output.text()).toBe('Tarea 1 creada: "Comprar pan".');
  });

  it('acepta prioridad (sin distinguir mayúsculas) y descripción (escenario 2)', () => {
    const { deps, output, db } = makeDeps();
    runAdd(deps, 'Comprar pan', {});
    runAdd(deps, 'Pagar luz', { priority: 'HIGH', description: 'Antes del viernes' });
    expect(findTask(db, 2)).toMatchObject({
      status: 'todo',
      priority: 'high',
      description: 'Antes del viernes',
    });
    expect(output.lines[1]).toBe('Tarea 2 creada: "Pagar luz".');
  });

  it.each(['', '   '])('rechaza título vacío %j sin crear nada (escenario 3)', (title) => {
    const { deps, db } = makeDeps();
    expect(() => runAdd(deps, title, {})).toThrow('el título es obligatorio y no puede estar vacío.');
    expect(count(db)).toBe(0);
  });

  it('rechaza prioridad inválida listando las válidas (escenario 4)', () => {
    const { deps, db } = makeDeps();
    expect(() => runAdd(deps, 'X', { priority: 'urgent' })).toThrow(
      'prioridad inválida "urgent". Valores válidos: high, medium, low.',
    );
    expect(count(db)).toBe(0);
  });
});
