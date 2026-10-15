import { describe, expect, it } from 'vitest';
import { checkTransition } from '../../src/utils/transitions.js';
import type { TaskStatus } from '../../src/utils/types.js';

describe('checkTransition', () => {
  it.each<[TaskStatus, TaskStatus]>([
    ['todo', 'in-progress'],
    ['in-progress', 'done'],
    ['in-progress', 'todo'],
    ['done', 'todo'],
  ])('permite %s → %s', (from, to) => {
    expect(checkTransition(1, from, to)).toEqual({ ok: true, value: to });
  });

  it.each<[TaskStatus, string]>([
    ['todo', 'la tarea 1 ya está en todo. Desde todo solo se permite: in-progress.'],
    ['in-progress', 'la tarea 1 ya está en in-progress. Desde in-progress solo se permite: done, todo.'],
    ['done', 'la tarea 1 ya está en done. Desde done solo se permite: todo.'],
  ])('rechaza cambiar al mismo estado (%s) indicando las transiciones permitidas', (status, error) => {
    expect(checkTransition(1, status, status)).toEqual({ ok: false, error });
  });

  it('rechaza todo → done explicando que primero debe pasar a in-progress', () => {
    expect(checkTransition(1, 'todo', 'done')).toEqual({
      ok: false,
      error: 'no se puede pasar de todo a done. Primero cambia la tarea a in-progress.',
    });
  });

  it('rechaza done → in-progress indicando las transiciones permitidas', () => {
    expect(checkTransition(1, 'done', 'in-progress')).toEqual({
      ok: false,
      error: 'no se puede pasar de done a in-progress. Desde done solo se permite: todo.',
    });
  });
});
