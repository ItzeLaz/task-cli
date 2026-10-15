import { describe, expect, it } from 'vitest';
import {
  deleteTask,
  findTask,
  insertTask,
  listTasks,
  updateTaskFields,
  updateTaskStatus,
} from '../../src/db/tasks.js';
import { createTestDb } from '../helpers.js';

const at = (iso: string) => new Date(iso);
const input = (title: string, extra: Partial<Parameters<typeof insertTask>[1]> = {}) => ({
  title,
  description: null,
  priority: 'medium' as const,
  ...extra,
});

describe('insertTask', () => {
  it('crea la tarea con ID 1, estado todo y la fecha indicada', () => {
    const db = createTestDb();
    const task = insertTask(db, input('Comprar pan'), at('2026-10-01T12:00:00.000Z'));
    expect(task).toEqual({
      id: 1,
      title: 'Comprar pan',
      description: null,
      status: 'todo',
      priority: 'medium',
      createdAt: '2026-10-01T12:00:00.000Z',
    });
    expect(findTask(db, 1)).toEqual(task);
  });

  it('guarda prioridad y descripción', () => {
    const db = createTestDb();
    insertTask(db, input('a'));
    const task = insertTask(db, input('Pagar luz', { priority: 'high', description: 'Antes del viernes' }));
    expect(task).toMatchObject({ id: 2, priority: 'high', description: 'Antes del viernes' });
  });

  it('no reutiliza IDs tras eliminar la tarea con el ID más alto', () => {
    const db = createTestDb();
    insertTask(db, input('a'));
    insertTask(db, input('b'));
    db.prepare('DELETE FROM tasks WHERE id = 2').run();
    expect(insertTask(db, input('c')).id).toBe(3);
  });

  it('guarda íntegros títulos largos, con acentos y emoji', () => {
    const db = createTestDb();
    const title = `Revisión de año 🚀 ñandú ${'x'.repeat(500)}`;
    expect(insertTask(db, input(title)).title).toBe(title);
  });
});

describe('updateTaskStatus', () => {
  it('cambia solo el estado de la tarea indicada', () => {
    const db = createTestDb();
    const a = insertTask(db, input('a', { description: 'd', priority: 'high' }));
    const b = insertTask(db, input('b'));
    updateTaskStatus(db, a.id, 'in-progress');
    expect(findTask(db, a.id)).toEqual({ ...a, status: 'in-progress' });
    expect(findTask(db, b.id)).toEqual(b);
  });
});

describe('updateTaskFields', () => {
  const setup = () => {
    const db = createTestDb();
    const task = insertTask(db, input('Comprar pan', { description: 'Integral' }));
    updateTaskStatus(db, task.id, 'in-progress');
    return { db, task: { ...task, status: 'in-progress' as const } };
  };

  it('cambia solo la prioridad sin tocar el resto', () => {
    const { db, task } = setup();
    updateTaskFields(db, task.id, { priority: 'low' });
    expect(findTask(db, task.id)).toEqual({ ...task, priority: 'low' });
  });

  it('cambia título y descripción a la vez', () => {
    const { db, task } = setup();
    updateTaskFields(db, task.id, { title: 'Comprar leche', description: 'Desnatada' });
    expect(findTask(db, task.id)).toEqual({ ...task, title: 'Comprar leche', description: 'Desnatada' });
  });

  it('vacía la descripción con null', () => {
    const { db, task } = setup();
    updateTaskFields(db, task.id, { description: null });
    expect(findTask(db, task.id)?.description).toBeNull();
  });

  it('nunca modifica estado, ID ni fecha de creación', () => {
    const { db, task } = setup();
    // Campos no permitidos colados a la fuerza: se ignoran.
    updateTaskFields(db, task.id, { title: 'x', status: 'done', id: 9, createdAt: 'z' } as never);
    expect(findTask(db, task.id)).toEqual({ ...task, title: 'x' });
  });
});

describe('deleteTask', () => {
  it('elimina solo la tarea indicada', () => {
    const db = createTestDb();
    insertTask(db, input('a'));
    insertTask(db, input('b'));
    deleteTask(db, 1);
    expect(findTask(db, 1)).toBeUndefined();
    expect(findTask(db, 2)).toBeDefined();
  });

  it('tras eliminar la tarea con el ID más alto, la siguiente recibe un ID nuevo', () => {
    const db = createTestDb();
    insertTask(db, input('a'));
    insertTask(db, input('b'));
    deleteTask(db, 2);
    expect(insertTask(db, input('c')).id).toBe(3);
  });
});

describe('listTasks', () => {
  it('devuelve primero la más reciente', () => {
    const db = createTestDb();
    insertTask(db, input('vieja'), at('2026-01-01T00:00:00.000Z'));
    insertTask(db, input('nueva'), at('2026-02-01T00:00:00.000Z'));
    expect(listTasks(db).map((t) => t.title)).toEqual(['nueva', 'vieja']);
  });

  it('con la misma fecha, desempata por ID descendente', () => {
    const db = createTestDb();
    const same = at('2026-01-01T00:00:00.000Z');
    insertTask(db, input('a'), same);
    insertTask(db, input('b'), same);
    insertTask(db, input('c'), same);
    expect(listTasks(db).map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it('devuelve una lista vacía si no hay tareas', () => {
    expect(listTasks(createTestDb())).toEqual([]);
  });
});

describe('listTasks filters and order', () => {
  function seed() {
    const db = createTestDb();
    const add = (title: string, priority: 'high' | 'medium' | 'low', iso: string) =>
      insertTask(db, input(title, { priority }), at(iso));
    add('todo-high', 'high', '2026-01-01T00:00:00.000Z');
    add('todo-low', 'low', '2026-01-02T00:00:00.000Z');
    add('prog-high', 'high', '2026-01-03T00:00:00.000Z');
    add('done-high', 'high', '2026-01-04T00:00:00.000Z');
    updateTaskStatus(db, 3, 'in-progress');
    updateTaskStatus(db, 4, 'in-progress');
    updateTaskStatus(db, 4, 'done');
    return db;
  }
  const titles = (tasks: { title: string }[]) => tasks.map((t) => t.title);

  it('filtra por estado', () => {
    expect(titles(listTasks(seed(), { status: 'in-progress' }))).toEqual(['prog-high']);
  });

  it('filtra por prioridad', () => {
    expect(titles(listTasks(seed(), { priority: 'high' }))).toEqual(['done-high', 'prog-high', 'todo-high']);
  });

  it('combina filtros con AND', () => {
    expect(titles(listTasks(seed(), { status: 'todo', priority: 'high' }))).toEqual(['todo-high']);
  });

  it('devuelve [] si nada coincide', () => {
    expect(listTasks(seed(), { status: 'done', priority: 'low' })).toEqual([]);
  });

  it('en orden ascendente devuelve primero la más antigua, desempatando por ID menor', () => {
    expect(titles(listTasks(seed(), {}, 'asc'))).toEqual(['todo-high', 'todo-low', 'prog-high', 'done-high']);
    const db = createTestDb();
    const same = at('2026-01-01T00:00:00.000Z');
    insertTask(db, input('a'), same);
    insertTask(db, input('b'), same);
    expect(listTasks(db, {}, 'asc').map((t) => t.id)).toEqual([1, 2]);
  });
});
