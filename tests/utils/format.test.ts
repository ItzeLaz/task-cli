import { describe, expect, it } from 'vitest';
import { formatDate, renderTaskDetail, renderTaskTable, truncate } from '../../src/utils/format.js';
import type { Task } from '../../src/utils/types.js';
import { plainStream } from '../helpers.js';

const pad = (n: number) => String(n).padStart(2, '0');

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Comprar pan',
  description: null,
  status: 'todo',
  priority: 'medium',
  createdAt: '2026-10-01T14:30:00.000Z',
  ...overrides,
});

describe('formatDate', () => {
  it('muestra la fecha en hora local como AAAA-MM-DD HH:mm', () => {
    const iso = '2026-01-05T09:07:00.000Z';
    const d = new Date(iso);
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(formatDate(iso)).toBe(expected);
    expect(formatDate(iso)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('truncate', () => {
  it('no cambia textos de hasta 50 caracteres', () => {
    const text = 'a'.repeat(50);
    expect(truncate(text)).toBe(text);
  });

  it('recorta textos más largos a 49 caracteres + …', () => {
    const result = truncate('a'.repeat(60));
    expect(result).toBe(`${'a'.repeat(49)}…`);
    expect([...result]).toHaveLength(50);
  });

  it('no parte caracteres compuestos por pares sustitutos', () => {
    const result = truncate('🚀'.repeat(60));
    expect(result).toBe(`${'🚀'.repeat(49)}…`);
  });
});

describe('renderTaskTable', () => {
  const tasks = [task({ id: 2, title: 'Pagar luz', priority: 'high' }), task()];

  it('incluye cabeceras y una fila por tarea en el orden recibido', () => {
    const out = renderTaskTable(tasks, plainStream);
    for (const header of ['ID', 'Título', 'Estado', 'Prioridad', 'Creada']) {
      expect(out).toContain(header);
    }
    expect(out.indexOf('Pagar luz')).toBeLessThan(out.indexOf('Comprar pan'));
    expect(out).toContain(formatDate(tasks[0]!.createdAt));
  });

  it('no incluye códigos de color si el stream no es una terminal', () => {
    expect(renderTaskTable(tasks, plainStream)).not.toContain('\x1b[');
  });

  it('recorta títulos largos en la tabla', () => {
    const out = renderTaskTable([task({ title: 'x'.repeat(80) })], plainStream);
    expect(out).toContain(`${'x'.repeat(49)}…`);
    expect(out).not.toContain('x'.repeat(50));
  });
});

describe('renderTaskDetail', () => {
  it('muestra todos los campos con el título completo', () => {
    const long = 'y'.repeat(80);
    const out = renderTaskDetail(task({ title: long, description: 'Antes del viernes' }), plainStream);
    for (const label of ['ID:', 'Título:', 'Descripción:', 'Estado:', 'Prioridad:', 'Creada:']) {
      expect(out).toContain(label);
    }
    expect(out).toContain(long);
    expect(out).toContain('Antes del viernes');
  });

  it('indica cuando no hay descripción', () => {
    expect(renderTaskDetail(task(), plainStream)).toContain('Descripción: (sin descripción)');
  });
});
