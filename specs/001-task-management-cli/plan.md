# Implementation Plan: Gestión de tareas personales desde la terminal (task-cli)

**Branch**: `001-task-management-cli` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-task-management-cli/spec.md`

## Summary

CLI `task-cli`, instalable globalmente con npm, para gestionar tareas personales: crear,
listar (tabla con filtros por estado/prioridad y orden por fecha), ver detalle, cambiar de
estado con transiciones controladas (`todo` → `in-progress` → `done`, con vuelta a `todo`),
actualizar campos y eliminar con confirmación (`--force` para omitirla).

Enfoque técnico: TypeScript ESM sobre Node.js LTS, Commander.js para comandos, SQLite vía
better-sqlite3 con SQL explícito en `~/.task-cli/tasks.db`, cli-table3 para tablas y
`util.styleText` de Node para colores (respeta TTY/`NO_COLOR` sin dependencias extra). Las
reglas de negocio (validación, transiciones, confirmación, formato) son funciones puras en
`utils/`, probadas con Vitest; los efectos (BD, terminal) quedan en `db/` y en los handlers de
`commands/`, que reciben sus dependencias por parámetro. Detalle en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, `NodeNext`) sobre Node.js ≥ 22.13 LTS (desarrollo en 24 LTS; 22.13 es el mínimo con `styleText({ stream })`)

**Primary Dependencies**: runtime — `commander`, `better-sqlite3`, `cli-table3`; desarrollo —
`typescript`, `tsx`, `vitest`, `@types/node`, `@types/better-sqlite3`

**Storage**: SQLite en `~/.task-cli/tasks.db` (tabla única `tasks`, ver [data-model.md](./data-model.md))

**Testing**: Vitest (unitarios de funciones puras, de datos sobre SQLite `:memory:` y de handlers con dependencias inyectadas)

**Target Platform**: terminal en Windows, macOS y Linux con Node.js LTS

**Project Type**: CLI (single project)

**Performance Goals**: cada comando < 1 s con hasta 1.000 tareas (SC-002)

**Constraints**: offline, un solo usuario local, sin stack traces, salida `0`/`1`, textos en español, colores solo para estado/prioridad

**Scale/Scope**: ≤ 1.000 tareas por usuario; 6 comandos (`add`, `list`, `show`, `status`, `update`, `delete`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / regla | Cómo lo cumple el plan | Pre | Post |
|-------------------|------------------------|:---:|:----:|
| I. Simplicidad y estructura plana | `src/commands/`, `src/db/`, `src/utils/`; sin capas repositorio/servicio; handlers llaman directamente a funciones SQL | ✅ | ✅ |
| II. Estilo funcional | Solo funciones; errores con `userError()` (sin clases propias); resultados `{ ok, value \| error }`; efectos inyectados por parámetro; `camelCase`/`PascalCase` solo en tipos | ✅ | ✅ |
| III. Dependencias mínimas | 3 dependencias de runtime, todas exigidas por el stack constitucional; colores con `node:util`, confirmación con `node:readline`, fechas a mano; sin ORM | ✅ | ✅ |
| IV. Errores claros y accionables | Manejador único en `main()` de `program.ts`; mensajes "qué falló + qué hacer"; errores de Commander traducidos; errores inesperados con mensaje genérico; códigos `0`/`1` | ✅ | ✅ |
| V. Salida legible | Listado con cli-table3; colores solo para estado y prioridad; desactivados sin TTY / con `NO_COLOR` | ✅ | ✅ |
| VI. Lógica probada | Tests Vitest para cada función de `utils/`, cada consulta de `db/` y cada escenario de aceptación vía handlers | ✅ | ✅ |
| Stack | TS + Node LTS, `tsx` en desarrollo, better-sqlite3, ruta `~/.task-cli/tasks.db` con creación del directorio, Commander.js, Vitest, `bin` en `package.json` | ✅ | ✅ |
| Puertas de calidad | Verificadas en [quickstart.md](./quickstart.md) §1 y §3 | ✅ | ✅ |

**Resultado**: sin violaciones; Complexity Tracking vacío.

**Justificaciones requeridas por la constitución**:

- Directorios de nivel superior nuevos: `src/` (código; contiene `commands/`, `db/`, `utils/`
  exigidos por el Principio I) y `tests/` (Vitest). `dist/` es salida de compilación, ignorada en
  git y publicada vía `"files"`.
- Dependencias de runtime: `commander`, `better-sqlite3` y `cli-table3` están nombradas en la
  constitución. No se añade ninguna otra (ver research R4, R5, R8).

## Decisiones de diseño relevantes

- **Orden con empates**: `created_at DESC, id DESC` (resuelve el empate pendiente de clarify).
- **Delete sin TTY**: termina con código `1` y mensaje en stderr — no es una cancelación pedida
  por el usuario, y así los scripts detectan que la tarea no se eliminó. Las cancelaciones
  interactivas (respuesta negativa o Enter) salen con `0`.
- **Concurrencia**: `busy_timeout = 2000 ms` + WAL; suficiente para un único usuario.
- **Recorte de título**: 50 caracteres visibles + `…` en la tabla; completo en `show`.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-management-cli/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── cli-commands.md  # Fase 1: contrato de comandos, salidas y códigos
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
package.json             # bin: task-cli → dist/index.js; type: module; engines node >=22.13
tsconfig.json
vitest.config.ts
src/
├── index.ts             # punto de entrada: shebang, crea dependencias reales y fija process.exitCode
├── program.ts           # arma el programa Commander; main() con manejador único de errores y exit codes (testeable)
├── commands/            # un archivo por comando: registro en Commander + handler con dependencias inyectadas
│   ├── add.ts
│   ├── list.ts
│   ├── show.ts
│   ├── status.ts
│   ├── update.ts
│   └── delete.ts
├── db/
│   ├── connection.ts    # ruta ~/.task-cli/tasks.db, mkdir, PRAGMAs, esquema v1, traducción de errores SQLite
│   └── tasks.ts         # SQL explícito: insert, find, list (filtros/orden), updateFields, updateStatus, delete
└── utils/
    ├── types.ts         # Task, TaskStatus, TaskPriority, Result
    ├── validation.ts    # parseId, parseTitle, parsePriority, parseStatus, parseDescription, buildUpdate
    ├── transitions.ts   # allowedTransitions, checkTransition
    ├── confirm.ts       # isAffirmative (pura) + askConfirmation (readline)
    ├── format.ts        # formatDate, truncate, colorStatus, colorPriority, renderTaskTable, renderTaskDetail
    └── errors.ts        # userError, isUserError, translateCommanderError, mensajes de error de BD

tests/
├── helpers.ts           # BD ':memory:', captura de salida, deps de prueba
├── program.test.ts      # main(): ayuda, errores de Commander, exit codes
├── utils/               # errors, validation, transitions, confirm, format
├── db/                  # connection, tasks y performance sobre ':memory:'
└── commands/            # escenarios de aceptación US1–US5 por handler
```

**Structure Decision**: proyecto único con la estructura plana por funcionalidad que exige la
constitución (`commands/`, `db/`, `utils/`) dentro de `src/`, y `tests/` en espejo. No hay capas
de servicio: cada handler de `commands/` valida con `utils/`, llama a `db/tasks.ts` y escribe la
salida.

## Complexity Tracking

Sin violaciones de la constitución; no aplica.
