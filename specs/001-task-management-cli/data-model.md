# Data Model: task-cli

**Feature**: `001-task-management-cli` | **Fecha**: 2026-10-01 | **Plan**: [plan.md](./plan.md)

## Entidad: Tarea (`Task`)

| Campo         | Tipo TS                                 | Columna SQLite                          | Reglas |
|---------------|-----------------------------------------|-----------------------------------------|--------|
| `id`          | `number`                                | `id INTEGER PRIMARY KEY AUTOINCREMENT`  | Asignado por SQLite; entero > 0; nunca se reutiliza (FR-004). Inmutable (FR-017). |
| `title`       | `string`                                | `title TEXT NOT NULL`                   | Se guarda tras `trim()`; no vacío (FR-001, FR-016). Sin límite de longitud; acentos y caracteres especiales íntegros. |
| `description` | `string \| null`                        | `description TEXT`                      | Opcional (FR-003). `null` = sin descripción; una actualización con `--clear-description` o con texto vacío la deja en `null`. |
| `status`      | `TaskStatus` = `'todo' \| 'in-progress' \| 'done'` | `status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done'))` | Siempre `todo` al crear (FR-005). Solo cambia vía transiciones válidas (FR-013). |
| `priority`    | `TaskPriority` = `'high' \| 'medium' \| 'low'`     | `priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low'))` | Por defecto `medium` (FR-002). Entrada sin distinguir mayúsculas; se guarda en minúsculas (FR-025). |
| `createdAt`   | `string` (ISO 8601 UTC, con ms)         | `created_at TEXT NOT NULL`              | Fijado al crear (FR-005); inmutable (FR-017). Se muestra en hora local como `AAAA-MM-DD HH:mm`. |

El mapeo `snake_case` (SQL) → `camelCase` (TS) se hace en `db/tasks.ts` con alias en el `SELECT`
(`created_at AS createdAt`).

### Esquema (versión 1)

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo', 'in-progress', 'done')),
  priority    TEXT    NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('high', 'medium', 'low')),
  created_at  TEXT    NOT NULL
);
PRAGMA user_version = 1;
```

Los `CHECK` son una red de seguridad; la validación con mensajes para el usuario ocurre antes,
en funciones puras de `utils/validation.ts`.

## Regla: Transición de estado (no se almacena)

```text
        ┌──────────────► in-progress ──────────────┐
        │                  │                        ▼
      todo ◄───────────────┘                       done
        ▲                                           │
        └───────────────────────────────────────────┘
```

| Desde \ Hacia  | `todo` | `in-progress` | `done` |
|----------------|:------:|:-------------:|:------:|
| `todo`         | ✗ (mismo estado) | ✓ | ✗ |
| `in-progress`  | ✓ | ✗ (mismo estado) | ✓ |
| `done`         | ✓ | ✗ | ✗ (mismo estado) |

Representación: constante `allowedTransitions: Record<TaskStatus, readonly TaskStatus[]>` y
función pura `checkTransition(from, to)` que devuelve `ok` o un error con el motivo:

- mismo estado → "La tarea `<id>` ya está en `<estado>`. Desde `<estado>` solo se permite: …"
- `todo` → `done` → mensaje específico: primero debe pasar a `in-progress` (US2 escenario 5).
- resto de inválidas → "No se puede pasar de `<from>` a `<to>`. Desde `<from>` se permite: …"
  (FR-014, US2 escenario 6).

## Validaciones de entrada (funciones puras, `utils/validation.ts`)

| Función              | Entrada            | Éxito                         | Error (mensaje, en español) |
|----------------------|--------------------|-------------------------------|-----------------------------|
| `parseId`            | `string`           | entero > 0                    | El ID debe ser un entero positivo (recibido: `<valor>`). Rechaza `abc`, `-1`, `0`, `1.5`, `1e3`, `''`. |
| `parseTitle`         | `string`           | título con `trim()`           | El título es obligatorio y no puede estar vacío. |
| `parsePriority`      | `string`           | `TaskPriority` en minúsculas  | Prioridad inválida `<valor>`. Valores válidos: high, medium, low. |
| `parseStatus`        | `string`           | `TaskStatus` en minúsculas    | Estado inválido `<valor>`. Valores válidos: todo, in-progress, done. |
| `parseDescription`   | `string`           | texto, o `null` si queda vacío tras `trim()` | — |
| `buildUpdate`        | opciones de `update` (`title`, `description`, `clearDescription`, `priority`) | objeto con ≥ 1 campo; `clearDescription` → `description: null` | Indica al menos un campo a modificar: --title, --description, --clear-description o --priority. / Usa --description o --clear-description, no ambas. |
| `isAffirmative`      | respuesta de confirmación | `true` para `s`, `si`, `sí`, `y`, `yes` (trim + minúsculas) | — (todo lo demás → `false`) |

## Operaciones de datos (`db/tasks.ts`, SQL explícito)

| Función                          | SQL (resumen)                                                         | Notas |
|----------------------------------|-----------------------------------------------------------------------|-------|
| `insertTask(db, input)`          | `INSERT INTO tasks (title, description, priority, created_at) VALUES (?, ?, ?, ?) RETURNING *` | `createdAt = new Date().toISOString()` (inyectable para tests). |
| `findTask(db, id)`               | `SELECT … WHERE id = ?`                                               | `undefined` si no existe. |
| `listTasks(db, filters, order)`  | `SELECT … [WHERE status = ? AND priority = ?] ORDER BY created_at DESC, id DESC` | Filtros opcionales combinados con `AND` (FR-009); `order = 'asc'` invierte ambos criterios. |
| `updateTaskFields(db, id, fields)` | `UPDATE tasks SET <solo campos indicados> WHERE id = ?`            | Nunca toca `status`, `id` ni `created_at` (FR-017). |
| `updateTaskStatus(db, id, status)` | `UPDATE tasks SET status = ? WHERE id = ?`                         | Solo tras `checkTransition` ok. |
| `deleteTask(db, id)`             | `DELETE FROM tasks WHERE id = ?`                                       | |

## Volumen

Diseñado y verificado para ≤ 1.000 tareas con respuesta < 1 s por comando (SC-002); con ese
volumen no se necesitan índices adicionales.
