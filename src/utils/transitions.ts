import type { Result, TaskStatus } from './types.js';

export const allowedTransitions: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  todo: ['in-progress'],
  'in-progress': ['done', 'todo'],
  done: ['todo'],
};

export function checkTransition(id: number, from: TaskStatus, to: TaskStatus): Result<TaskStatus> {
  const allowed = allowedTransitions[from];
  if (allowed.includes(to)) return { ok: true, value: to };
  const allowedText = `Desde ${from} solo se permite: ${allowed.join(', ')}.`;
  if (from === to) return { ok: false, error: `la tarea ${id} ya está en ${from}. ${allowedText}` };
  if (from === 'todo' && to === 'done') {
    return { ok: false, error: 'no se puede pasar de todo a done. Primero cambia la tarea a in-progress.' };
  }
  return { ok: false, error: `no se puede pasar de ${from} a ${to}. ${allowedText}` };
}
