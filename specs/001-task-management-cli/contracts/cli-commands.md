# Contrato CLI: task-cli

**Feature**: `001-task-management-cli` | **Fecha**: 2026-10-01 | **Plan**: [../plan.md](../plan.md)

Interfaz pública de la herramienta: comandos, argumentos, opciones, salidas y códigos de salida.
Comandos, opciones y valores (`todo`, `high`…) en inglés; todos los textos en español (FR-028).
Los valores de estado y prioridad se aceptan sin distinguir mayúsculas (FR-025).

## Convenciones globales

| Aspecto            | Contrato |
|--------------------|----------|
| Ejecutable         | `task-cli` (instalación global, FR-026) |
| Ayuda              | `task-cli --help`, `task-cli <comando> --help`, `-h` → stdout, salida `0` |
| Versión            | `task-cli --version`, `-V` → stdout, salida `0` |
| Éxito              | mensaje en **stdout**, salida `0` |
| Cancelación del usuario | mensaje en **stdout**, salida `0` (FR-024) |
| Error              | `Error: <qué falló>. <qué hacer>` en **stderr**, salida `1`, nunca stack trace |
| Comando desconocido | `Error: comando desconocido "<x>". Usa task-cli --help para ver los comandos disponibles.` → `1` |
| Opción desconocida / falta argumento | mensaje en español equivalente → `1` |
| `<id>`             | entero positivo; si no: `Error: el ID debe ser un entero positivo (recibido: "<valor>").` → `1` |
| ID inexistente     | `Error: no existe la tarea <id>.` → `1` (FR-023) |
| Colores            | solo estado y prioridad; desactivados si stdout no es TTY o existe `NO_COLOR` (FR-011) |
| Fechas             | hora local, `AAAA-MM-DD HH:mm` |
| BD inaccesible/corrupta | `Error: no se pudo abrir la base de datos en <ruta>. <causa en lenguaje claro>.` → `1` |

---

## `task-cli add <title>`

Crea una tarea (US1, FR-001…FR-006).

| Argumento / opción          | Obligatorio | Valores | Defecto |
|-----------------------------|:-----------:|---------|---------|
| `<title>`                   | sí | texto no vacío (se aplica `trim`) | — |
| `-p, --priority <priority>` | no | `high` \| `medium` \| `low` | `medium` |
| `-d, --description <text>`  | no | texto libre | sin descripción |

- Éxito → `Tarea 3 creada: "Pagar luz".` → `0`
- Título vacío/solo espacios → `Error: el título es obligatorio y no puede estar vacío.` → `1`
- Prioridad inválida → `Error: prioridad inválida "urgent". Valores válidos: high, medium, low.` → `1`

## `task-cli list`

Lista tareas en tabla (US1, US3, FR-007…FR-011).

| Opción                      | Valores | Efecto |
|-----------------------------|---------|--------|
| `-s, --status <status>`     | `todo` \| `in-progress` \| `done` | filtra por estado |
| `-p, --priority <priority>` | `high` \| `medium` \| `low` | filtra por prioridad |
| `-r, --reverse`             | — | más antigua primero (por defecto: más reciente primero) |

Salida (stdout, `0`):

```text
┌────┬──────────────────────────┬─────────────┬───────────┬──────────────────┐
│ ID │ Título                   │ Estado      │ Prioridad │ Creada           │
│ 2  │ Pagar luz                │ todo        │ high      │ 2026-10-01 14:30 │
│ 1  │ Comprar pan              │ in-progress │ medium    │ 2026-10-01 14:28 │
└────┴──────────────────────────┴─────────────┴───────────┴──────────────────┘
```

- Títulos de más de 50 caracteres se recortan con `…` (solo visualmente).
- Sin tareas → `No hay tareas. Crea una con: task-cli add "<título>"` → `0`
- Filtros sin coincidencias → `No hay tareas que coincidan con los filtros (estado: todo, prioridad: high).` → `0`
- Filtro inválido → mismo mensaje que en `add`/`status` con los valores válidos → `1`

## `task-cli show <id>`

Muestra el detalle completo de una tarea (FR-027).

```text
ID:          2
Título:      Pagar luz
Descripción: Antes del viernes
Estado:      todo
Prioridad:   high
Creada:      2026-10-01 14:30
```

- Sin descripción → `Descripción: (sin descripción)`
- ID inexistente/inválido → errores globales → `1`

## `task-cli status <id> <status>`

Cambia el estado según las transiciones permitidas (US2, FR-012…FR-014).

- Éxito → `Tarea 1: todo → in-progress.` → `0`
- `todo` → `done` → `Error: no se puede pasar de todo a done. Primero cambia la tarea a in-progress.` → `1`
- Otra transición inválida → `Error: no se puede pasar de done a in-progress. Desde done solo se permite: todo.` → `1`
- Mismo estado → `Error: la tarea 1 ya está en todo. Desde todo solo se permite: in-progress.` → `1`
- Estado inválido → `Error: estado inválido "doing". Valores válidos: todo, in-progress, done.` → `1`
- En todos los errores la tarea no se modifica.

## `task-cli update <id>`

Modifica título, descripción y/o prioridad (US4, FR-015…FR-017).

| Opción                      | Valores | Notas |
|-----------------------------|---------|-------|
| `-t, --title <title>`       | texto no vacío | |
| `-d, --description <text>`  | texto libre | un texto vacío también la elimina, si la shell lo permite |
| `--clear-description`       | — | elimina la descripción (funciona en cualquier shell, incluida Windows PowerShell 5.1, que descarta los argumentos `""`) |
| `-p, --priority <priority>` | `high` \| `medium` \| `low` | |

- Éxito → `Tarea 1 actualizada (prioridad).` / `(título, descripción)` → `0`
- Sin opciones → `Error: indica al menos un campo a modificar: --title, --description, --clear-description o --priority.` → `1`
- `--description` y `--clear-description` a la vez → `Error: usa --description o --clear-description, no ambas.` → `1`
- Título vacío → error de título de `add` → `1`; la tarea no cambia.
- Nunca modifica estado, ID ni fecha de creación.

## `task-cli delete <id>`

Elimina una tarea con confirmación (US5, FR-018…FR-021).

| Opción        | Efecto |
|---------------|--------|
| `-f, --force` | elimina sin pedir confirmación |

- Sin `--force`, terminal interactiva → pregunta `¿Eliminar la tarea 1 "Comprar pan"? [s/N] `
  - `s`, `si`, `sí`, `y`, `yes` (sin distinguir mayúsculas) → `Tarea 1 eliminada.` → `0`
  - cualquier otra respuesta o Enter → `Operación cancelada. La tarea 1 no se eliminó.` → `0`
- Sin `--force`, entrada no interactiva → `Error: no se puede pedir confirmación en un entorno no interactivo. Usa --force para eliminar sin confirmar.` en stderr → `1`
  (nada se elimina; es un fallo y no una cancelación pedida por el usuario, así un script
  detecta que la tarea sigue existiendo — FR-021, FR-024)
- Con `--force` → `Tarea 1 eliminada.` → `0`
- ID inexistente → `Error: no existe la tarea 99.` → `1`, sin preguntar.
