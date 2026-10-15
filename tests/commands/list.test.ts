import { describe, expect, it } from 'vitest';
import { runList } from '../../src/commands/list.js';
import { insertTask, updateTaskStatus } from '../../src/db/tasks.js';
import { makeDeps } from '../helpers.js';

describe('list', () => {
  it('muestra una tabla con la tarea más reciente primero (escenario 5)', () => {
    const { deps, output, db } = makeDeps();
    insertTask(db, { title: 'Comprar pan', description: null, priority: 'medium' }, new Date('2026-10-01T10:00:00Z'));
    insertTask(db, { title: 'Pagar luz', description: null, priority: 'high' }, new Date('2026-10-01T11:00:00Z'));
    runList(deps, {});
    const text = output.text();
    expect(text).toContain('Título');
    expect(text.indexOf('Pagar luz')).toBeLessThan(text.indexOf('Comprar pan'));
  });

  it('sin tareas muestra un mensaje en lugar de una tabla vacía (escenario 6)', () => {
    const { deps, output } = makeDeps();
    runList(deps, {});
    expect(output.text()).toBe('No hay tareas. Crea una con: task-cli add "<título>"');
  });
});

describe('list con filtros y orden (US3)', () => {
  function seed() {
    const ctx = makeDeps();
    const add = (title: string, priority: 'high' | 'medium' | 'low', iso: string) =>
      insertTask(ctx.db, { title, description: null, priority }, new Date(iso));
    add('Alfa todo high', 'high', '2026-01-01T00:00:00Z');
    add('Beta todo low', 'low', '2026-01-02T00:00:00Z');
    add('Gamma progreso high', 'high', '2026-01-03T00:00:00Z');
    updateTaskStatus(ctx.db, 3, 'in-progress');
    return ctx;
  }

  it('filtra por estado (escenario 1)', () => {
    const { deps, output } = seed();
    runList(deps, { status: 'in-progress' });
    expect(output.text()).toContain('Gamma');
    expect(output.text()).not.toContain('Alfa');
    expect(output.text()).not.toContain('Beta');
  });

  it('filtra por prioridad (escenario 2)', () => {
    const { deps, output } = seed();
    runList(deps, { priority: 'high' });
    expect(output.text()).toContain('Alfa');
    expect(output.text()).toContain('Gamma');
    expect(output.text()).not.toContain('Beta');
  });

  it('combina estado y prioridad, sin distinguir mayúsculas (escenario 3)', () => {
    const { deps, output } = seed();
    runList(deps, { status: 'todo', priority: 'HIGH' });
    expect(output.text()).toContain('Alfa');
    expect(output.text()).not.toContain('Beta');
    expect(output.text()).not.toContain('Gamma');
  });

  it('sin coincidencias explica los filtros aplicados (escenario 4)', () => {
    const { deps, output } = seed();
    runList(deps, { status: 'done', priority: 'high' });
    expect(output.text()).toBe('No hay tareas que coincidan con los filtros (estado: done, prioridad: high).');
  });

  it('menciona solo los filtros indicados', () => {
    const { deps, output } = seed();
    runList(deps, { status: 'done' });
    expect(output.text()).toBe('No hay tareas que coincidan con los filtros (estado: done).');
  });

  it.each([
    [{ status: 'doing' }, 'estado inválido "doing". Valores válidos: todo, in-progress, done.'],
    [{ priority: 'x' }, 'prioridad inválida "x". Valores válidos: high, medium, low.'],
  ])('rechaza filtros inválidos (escenario 5)', (options, message) => {
    const { deps } = seed();
    expect(() => runList(deps, options)).toThrow(message);
  });

  it('con --reverse muestra primero la más antigua (escenario 6)', () => {
    const { deps, output } = seed();
    runList(deps, { reverse: true });
    const text = output.text();
    expect(text.indexOf('Alfa')).toBeLessThan(text.indexOf('Beta'));
    expect(text.indexOf('Beta')).toBeLessThan(text.indexOf('Gamma'));
  });
});
