import { describe, expect, it } from 'vitest';
import { findTask, insertTask, listTasks } from '../../src/db/tasks.js';
import { createTestDb } from '../helpers.js';

// SC-002: cada comando < 1 s con 1.000 tareas. Las consultas deben quedar muy por debajo
// para dejar margen al arranque de Node.
describe('rendimiento con 1.000 tareas', () => {
  const db = createTestDb();
  db.transaction(() => {
    for (let i = 1; i <= 1000; i++) {
      insertTask(db, { title: `Tarea ${i}`, description: null, priority: 'medium' }, new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
    }
  })();

  const time = (fn: () => unknown) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };

  it('listTasks tarda menos de 100 ms', () => {
    let tasks: unknown[] = [];
    expect(time(() => (tasks = listTasks(db)))).toBeLessThan(100);
    expect(tasks).toHaveLength(1000);
  });

  it('listTasks con filtros y orden inverso tarda menos de 100 ms', () => {
    expect(time(() => listTasks(db, { status: 'todo', priority: 'medium' }, 'asc'))).toBeLessThan(100);
  });

  it('findTask tarda menos de 100 ms', () => {
    expect(time(() => findTask(db, 500))).toBeLessThan(100);
  });
});
