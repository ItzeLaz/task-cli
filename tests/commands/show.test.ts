import { describe, expect, it } from 'vitest';
import { runShow } from '../../src/commands/show.js';
import { insertTask } from '../../src/db/tasks.js';
import { makeDeps } from '../helpers.js';

describe('show', () => {
  it('muestra el detalle con la descripción (escenario 7)', () => {
    const { deps, output, db } = makeDeps();
    insertTask(db, { title: 'Comprar pan', description: null, priority: 'medium' });
    insertTask(db, { title: 'Pagar luz', description: 'Antes del viernes', priority: 'high' });
    runShow(deps, '2');
    expect(output.text()).toContain('Pagar luz');
    expect(output.text()).toContain('Antes del viernes');
    expect(output.text()).toContain('high');
  });

  it('indica cuando la tarea no tiene descripción', () => {
    const { deps, output, db } = makeDeps();
    insertTask(db, { title: 'Comprar pan', description: null, priority: 'medium' });
    runShow(deps, '1');
    expect(output.text()).toContain('(sin descripción)');
  });

  it('informa si la tarea no existe (escenario 8)', () => {
    const { deps } = makeDeps();
    expect(() => runShow(deps, '99')).toThrow('no existe la tarea 99.');
  });

  it('rechaza IDs inválidos', () => {
    const { deps } = makeDeps();
    expect(() => runShow(deps, 'abc')).toThrow('el ID debe ser un entero positivo (recibido: "abc").');
  });
});
