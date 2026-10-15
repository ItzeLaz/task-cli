---

description: "Task list for task-cli (001-task-management-cli)"
---

# Tasks: Gestión de tareas personales desde la terminal (task-cli)

**Input**: Design documents from `/specs/001-task-management-cli/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-commands.md, quickstart.md

**Tests**: INCLUIDOS. La constitución (Principio VI) exige tests Vitest para toda lógica de
negocio; en cada historia los tests se escriben primero y deben fallar antes de implementar.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Paths are relative to the repository root (`src/`, `tests/`)

## Convenciones para todas las tareas

- ESM + TypeScript (`NodeNext`): los imports relativos llevan extensión `.js`
  (p. ej. `import { parseId } from '../utils/validation.js'`).
- Solo funciones (sin clases propias), `camelCase` para funciones/variables, `PascalCase` solo
  para tipos (constitución, Principio II).
- Textos para el usuario en español; comandos, opciones y valores en inglés (FR-028). Los
  mensajes exactos están en `specs/001-task-management-cli/contracts/cli-commands.md`; copiarlos
  literalmente.
- Errores de usuario: lanzar `userError(message)` (de `src/utils/errors.ts`); nunca
  `process.exit` ni `console.error` dentro de handlers.
- Cada handler de comando tiene la forma `runX(deps: CommandDeps, ...args)`; recibe la conexión y
  la función de salida por parámetro para poder probarse sin lanzar procesos (research R10).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar el proyecto Node/TypeScript con el stack de la constitución

- [X] T001 Create `package.json` at repo root: `"name": "task-cli"`, `"version": "0.1.0"`, `"type": "module"`, `"bin": { "task-cli": "dist/index.js" }`, `"files": ["dist"]`, `"engines": { "node": ">=22.13" }` (mínimo para `styleText` con opción `stream`, research R4), scripts `build` = `tsc -p tsconfig.build.json`, `dev` = `tsx src/index.ts`, `test` = `vitest run`, `typecheck` = `tsc --noEmit`, `prepack` = `npm run build`; then run `npm install commander better-sqlite3 cli-table3` and `npm install -D typescript tsx vitest @types/node @types/better-sqlite3` (no other dependencies — Principle III)
- [X] T002 [P] Create `tsconfig.json` (strict, `target` ES2023, `module`/`moduleResolution` `NodeNext`, `rootDir` `.`, `noEmit`-friendly, includes `src` and `tests`) and `tsconfig.build.json` extending it with `rootDir` `src`, `outDir` `dist`, `include` `["src"]`, `noEmit: false`
- [X] T003 [P] Create `vitest.config.ts` with `test.include: ['tests/**/*.test.ts']` and `environment: 'node'`
- [X] T004 [P] Create `.gitignore` with `node_modules/`, `dist/`, `*.db`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, errores, validaciones base, conexión a SQLite y programa Commander que todas las historias usan

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create `src/utils/types.ts` exporting: `type TaskStatus = 'todo' | 'in-progress' | 'done'`; `type TaskPriority = 'high' | 'medium' | 'low'`; `const taskStatuses = ['todo','in-progress','done'] as const`; `const taskPriorities = ['high','medium','low'] as const`; `interface Task { id: number; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; createdAt: string }` (createdAt = ISO 8601 UTC con ms); `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`; `interface CommandDeps { db: Database.Database; print: (text: string) => void; colorStream?: NodeJS.WriteStream }` (type import from `better-sqlite3`)
- [X] T006 [P] Write `tests/utils/errors.test.ts`: `userError` creates an `Error` with the given message and `isUserError(err) === true`; `isUserError` is false for plain `Error`, strings and `undefined`; `translateCommanderError` returns Spanish text for codes `commander.unknownCommand` (`Error: comando desconocido "<x>". Usa task-cli --help para ver los comandos disponibles.`), `commander.unknownOption`, `commander.missingArgument`, `commander.optionMissingArgument`, `commander.excessArguments`, and a generic Spanish fallback for any other code; `dbErrorMessage(path, err)` includes the path and never the raw SQLite message/stack for codes `SQLITE_NOTADB`, `SQLITE_CORRUPT`, `SQLITE_CANTOPEN`, `SQLITE_READONLY`, `EACCES`, `EPERM`
- [X] T007 [P] Write `tests/utils/validation.test.ts` (base rules): `parseId` accepts `'1'`, `'42'` and rejects `'abc'`, `'-1'`, `'0'`, `'1.5'`, `'1e3'`, `''`, `' '` with `el ID debe ser un entero positivo (recibido: "<valor>")`; `parseTitle` trims and rejects `''`/`'   '` with `el título es obligatorio y no puede estar vacío`; `parsePriority` accepts `HIGH`/`Medium`/`low` returning lowercase and rejects `urgent` with `prioridad inválida "urgent". Valores válidos: high, medium, low`; `parseStatus` accepts `TODO`/`In-Progress`/`done` lowercase and rejects `doing` with `estado inválido "doing". Valores válidos: todo, in-progress, done`; `parseDescription` returns trimmed text, or `null` if empty after trim. All return `Result<T>`
- [X] T008 [P] Implement `src/utils/errors.ts`: `userError(message: string): Error` (adds property `isUserError: true`, no custom class), `isUserError(err: unknown): boolean`, `translateCommanderError(code: string, message: string): string` (extract the offending token from Commander's English `message` to build the Spanish text), `dbErrorMessage(path: string, err: unknown): string` (e.g. `no se pudo abrir la base de datos en <ruta>. El archivo está dañado o no es una base de datos de task-cli.` / `…no hay permisos para leer o escribir.`), and `unexpectedErrorMessage = 'Ocurrió un error inesperado. Vuelve a intentarlo; si persiste, revisa el archivo ~/.task-cli/tasks.db.'` — make T006 pass
- [X] T009 [P] Implement `src/utils/validation.ts` with pure functions `parseId`, `parseTitle`, `parsePriority`, `parseStatus`, `parseDescription` returning `Result<T>` using `taskStatuses`/`taskPriorities` from `src/utils/types.ts` and comparing case-insensitively (FR-025) — make T007 pass
- [X] T010 Write `tests/db/connection.test.ts`: `initSchema(db)` on `new Database(':memory:')` creates table `tasks` and sets `PRAGMA user_version` to `1`, and calling it twice is harmless; `getDbPath('/x')` returns `join('/x', '.task-cli', 'tasks.db')`; `openDatabase(path)` inside a temp dir (`fs.mkdtempSync(join(os.tmpdir(), 'task-cli-'))`) creates the missing `.task-cli` directory and the file; `openDatabase` on a file containing plain text throws a user error whose message contains the file path; `insert` with `status = 'doing'` violates the CHECK constraint
- [X] T011 Implement `src/db/connection.ts`: `getDbPath(home = os.homedir())`; `initSchema(db)` running exactly the schema in `specs/001-task-management-cli/data-model.md` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `title TEXT NOT NULL CHECK (length(trim(title)) > 0)`, `description TEXT`, `status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done'))`, `priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'))`, `created_at TEXT NOT NULL`) only when `user_version = 0`, then `PRAGMA user_version = 1`; `openDatabase(path = getDbPath())` does `mkdirSync(dirname(path), { recursive: true })`, opens with better-sqlite3, sets `journal_mode = WAL` and `busy_timeout = 2000`, calls `initSchema`, and wraps any failure (including a probe query like `SELECT count(*) FROM tasks` to detect corrupt files) in `userError(dbErrorMessage(path, err))` — make T010 pass
- [X] T012 Create `tests/helpers.ts`: `createTestDb()` → `new Database(':memory:')` with `initSchema` applied; `captureOutput()` → `{ print, lines, text() }` collecting printed text; `makeDeps(db)` → `CommandDeps` using the captured `print` and a non-TTY `colorStream` (so no ANSI codes in assertions)
- [X] T013 Implement in `src/db/tasks.ts` the row mapping and `findTask(db, id): Task | undefined` using `SELECT id, title, description, status, priority, created_at AS createdAt FROM tasks WHERE id = ?` (explicit SQL, prepared statement); export a shared `selectColumns` constant for the other queries, and `requireTask(db, id): Task` that throws `userError('no existe la tarea <id>.')` (FR-023)
- [X] T014 Write `tests/program.test.ts` for `main(argv, io)` from `src/program.ts`, with `io = { stdout, stderr }` string collectors and a fake `getDeps`: `--help` returns exit `0` and the help text contains `Uso:` and `Opciones:`; with a stub command `noop` registered on the program built for the test (Commander only reports unknown commands when subcommands exist), unknown command `foo` returns `1` with `comando desconocido "foo"` on stderr; a handler that throws `userError('x')` returns `1` and stderr is `Error: x`; a handler that throws a plain `Error('boom')` returns `1`, stderr contains `Ocurrió un error inesperado` and does NOT contain `boom` nor `at ` (no stack trace)
- [X] T015 Implement `src/program.ts`: `buildProgram(io, getDeps)` creates the Commander program (`name('task-cli')`, Spanish `description`, `version` read from `package.json` via `createRequire(import.meta.url)` with flag `-V, --version` and description `Muestra la versión`, `helpOption('-h, --help', 'Muestra la ayuda')`, `helpCommand('help [comando]', 'Muestra la ayuda de un comando')`), `configureHelp` overriding `formatHelp` to replace section titles `Usage:`→`Uso:`, `Options:`→`Opciones:`, `Commands:`→`Comandos:`, `Arguments:`→`Argumentos:`, `exitOverride()`, `configureOutput({ writeOut: io.stdout, writeErr: () => {} })`; `getDeps` is lazy so `--help` never opens the DB; accept the list of command registrars as a parameter (`buildProgram(io, getDeps, registrars = commandRegistrars)`) so tests can pass a stub; export a `commandRegistrars` array that later phases append `registerX` functions to; `main(argv, io, getDeps)` awaits `parseAsync(argv)` and returns `0`, maps `CommanderError` codes `commander.helpDisplayed`/`commander.version` to `0` and others to `translateCommanderError` + `1`, user errors to `Error: <message>` on stderr + `1`, anything else to `unexpectedErrorMessage` + `1` — make T014 pass
- [X] T016 Create `src/index.ts`: first line `#!/usr/bin/env node`; builds real `io` (`process.stdout.write`/`process.stderr.write` with trailing newline), real `getDeps` (`openDatabase()` once, `print` = stdout writer, `colorStream: process.stdout`), and sets `process.exitCode = await main(process.argv, io, getDeps)`; closes the DB if opened

**Checkpoint**: `npm run typecheck` y `npm test` pasan; `npx tsx src/index.ts --help` muestra ayuda en español sin comandos y sale con `0`.

---

## Phase 3: User Story 1 - Crear y listar tareas (Priority: P1) 🎯 MVP

**Goal**: crear tareas (`add`), verlas en tabla (`list`, más reciente primero) y ver el detalle (`show`) con descripción

**Independent Test**: crear varias tareas con distintas prioridades y verificar que aparecen en el listado con ID, título, estado `todo`, prioridad y fecha, de la más reciente a la más antigua; `show` muestra la descripción

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US1] Write `tests/db/tasks.test.ts` (create file) for `insertTask` and `listTasks`: first insert gets `id` 1, `status` `'todo'`, `priority` `'medium'` when omitted, `description` `null` when omitted, `createdAt` equal to the injected `now`; after `DELETE FROM tasks WHERE id = 2` (raw SQL) the next insert gets `id` 3 (IDs never reused, FR-004); `listTasks(db)` returns newest first and, with equal `createdAt`, higher `id` first (`ORDER BY created_at DESC, id DESC`); titles with accents/emoji/500 chars are stored intact
- [X] T018 [P] [US1] Write `tests/utils/format.test.ts`: `formatDate('2026-10-01T14:30:00.000Z')` equals the local-time `AAAA-MM-DD HH:mm` built from `new Date(iso)` getters with zero padding (and e.g. `2026-01-05 09:07` pattern check via regex `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$`); `truncate(s, 50)` keeps strings ≤ 50 chars and cuts longer ones to 49 chars + `…`; `renderTaskTable(tasks, stream)` contains headers `ID`, `Título`, `Estado`, `Prioridad`, `Creada` and one row per task in given order; with a non-TTY stream output contains no `\x1b[`; `renderTaskDetail(task, stream)` prints labels `ID:`, `Título:`, `Descripción:`, `Estado:`, `Prioridad:`, `Creada:` and `(sin descripción)` when `description` is `null`, and the full untruncated title
- [X] T019 [P] [US1] Write `tests/commands/add.test.ts` (US1 scenarios 1–4): `runAdd(deps, 'Comprar pan', {})` stores task 1 `todo`/`medium` and prints `Tarea 1 creada: "Comprar pan".`; `runAdd(deps, 'Pagar luz', { priority: 'HIGH', description: 'Antes del viernes' })` stores task 2 with `high` and the description; title `''` or `'   '` throws user error `el título es obligatorio y no puede estar vacío.` and no row is inserted; priority `urgent` throws the invalid-priority message listing `high, medium, low` and no row is inserted
- [X] T020 [P] [US1] Write `tests/commands/list.test.ts` (US1 scenarios 5–6): with tasks 1 and 2, `runList(deps, {})` prints a table where task 2 appears before task 1; with no tasks prints exactly `No hay tareas. Crea una con: task-cli add "<título>"` and no table
- [X] T021 [P] [US1] Write `tests/commands/show.test.ts` (US1 scenarios 7–8): `runShow(deps, '2')` prints the detail including `Antes del viernes`; a task without description shows `(sin descripción)`; `runShow(deps, '99')` throws `no existe la tarea 99.`; `runShow(deps, 'abc')` throws the invalid-ID message

### Implementation for User Story 1

- [X] T022 [US1] Add to `src/db/tasks.ts`: `insertTask(db, input: { title: string; description: string | null; priority: TaskPriority }, now = new Date()): Task` using `INSERT INTO tasks (title, description, priority, created_at) VALUES (?, ?, ?, ?) RETURNING <selectColumns>` with `now.toISOString()`; `listTasks(db): Task[]` using `SELECT <selectColumns> FROM tasks ORDER BY created_at DESC, id DESC` — make T017 pass
- [X] T023 [P] [US1] Implement `src/utils/format.ts`: `formatDate(iso)` (local time, `AAAA-MM-DD HH:mm`, manual zero padding, no Intl/date libs); `truncate(text, max = 50)`; `colorStatus(status, stream)` and `colorPriority(priority, stream)` using `styleText` from `node:util` with `{ stream }` (todo → `gray`, in-progress → `yellow`, done → `green`; high → `red`, medium → `yellow`, low → `blue`) so color is dropped automatically for non-TTY streams and `NO_COLOR` (FR-011, research R4); `renderTaskTable(tasks, stream)` with `cli-table3` headers `ID`, `Título`, `Estado`, `Prioridad`, `Creada` (header text not colored, `style: { head: [] }`); `renderTaskDetail(task, stream)` aligned `Label:` lines — make T018 pass
- [X] T024 [US1] Implement `src/commands/add.ts`: `runAdd(deps, title, options: { priority?: string; description?: string })` validating with `parseTitle`, `parsePriority` (default `medium`), `parseDescription`, calling `insertTask` and printing `Tarea <id> creada: "<título>".`; `registerAdd(program, getDeps)` defining `add <title>` with `-p, --priority <priority>` and `-d, --description <text>` and Spanish descriptions (`Crea una tarea`, `Prioridad: high, medium o low (por defecto: medium)`, `Descripción opcional`) — make T019 pass
- [X] T025 [US1] Implement `src/commands/list.ts`: `runList(deps, options)` calling `listTasks` and printing `renderTaskTable(tasks, deps.colorStream ?? process.stdout)` or the empty message; `registerList(program, getDeps)` defining `list` (`Lista las tareas`) — make T020 pass
- [X] T026 [US1] Implement `src/commands/show.ts`: `runShow(deps, idText)` with `parseId` → `requireTask` → `renderTaskDetail`; `registerShow` defining `show <id>` (`Muestra el detalle de una tarea`) — make T021 pass
- [X] T027 [US1] Register `registerAdd`, `registerList`, `registerShow` in `commandRegistrars` in `src/program.ts`; verify manually with `npx tsx src/index.ts add "Prueba" -p high`, `list`, `show 1`

**Checkpoint**: `add`, `list` y `show` funcionan y sus tests pasan — MVP utilizable.

---

## Phase 4: User Story 2 - Avanzar el estado de una tarea (Priority: P1)

**Goal**: `status <id> <status>` con solo las transiciones `todo → in-progress`, `in-progress → done`, `in-progress → todo`, `done → todo`

**Independent Test**: crear una tarea y recorrer todas las transiciones válidas e inválidas; las válidas actualizan el estado y las inválidas se rechazan sin modificar nada

### Tests for User Story 2 ⚠️

- [X] T028 [P] [US2] Write `tests/utils/transitions.test.ts` covering the full 3×3 matrix from `data-model.md`: allowed = `todo→in-progress`, `in-progress→done`, `in-progress→todo`, `done→todo`; same state → `la tarea <id> ya está en <estado>. Desde <estado> solo se permite: <permitidos>.` (e.g. `la tarea 1 ya está en todo. Desde todo solo se permite: in-progress.`; id passed in); `todo→done` → `no se puede pasar de todo a done. Primero cambia la tarea a in-progress.`; `done→in-progress` → `no se puede pasar de done a in-progress. Desde done solo se permite: todo.`; message for other rejections lists allowed targets from the current state
- [X] T029 [P] [US2] Add to `tests/db/tasks.test.ts` a `describe('updateTaskStatus')`: changes only `status` of the given id; other fields and other rows unchanged
- [X] T030 [P] [US2] Write `tests/commands/status.test.ts` (US2 scenarios 1–8 + same-state edge case): each valid transition prints `Tarea <id>: <from> → <to>.` and persists; `todo→done`, `done→in-progress`, `todo→todo` throw the messages above and the stored status is unchanged; `runStatus(deps, '99', 'done')` throws `no existe la tarea 99.`; status `doing` throws the invalid-status message; `'DONE'` is accepted case-insensitively

### Implementation for User Story 2

- [X] T031 [P] [US2] Implement `src/utils/transitions.ts`: `allowedTransitions: Record<TaskStatus, readonly TaskStatus[]>` = `{ todo: ['in-progress'], 'in-progress': ['done', 'todo'], done: ['todo'] }` and pure `checkTransition(id, from, to): Result<TaskStatus>` returning the exact messages from T028 — make T028 pass
- [X] T032 [US2] Add `updateTaskStatus(db, id, status)` to `src/db/tasks.ts` using `UPDATE tasks SET status = ? WHERE id = ?` — make T029 pass
- [X] T033 [US2] Implement `src/commands/status.ts`: `runStatus(deps, idText, statusText)` = `parseId` → `parseStatus` → `requireTask` → `checkTransition` → `updateTaskStatus` → print; `registerStatus` defining `status <id> <status>` (`Cambia el estado de una tarea: todo, in-progress o done`); add to `commandRegistrars` in `src/program.ts` — make T030 pass

**Checkpoint**: US1 y US2 funcionan; ciclo de vida completo de una tarea.

---

## Phase 5: User Story 3 - Filtrar y ordenar el listado (Priority: P2)

**Goal**: `list` con `-s/--status`, `-p/--priority` (combinables con AND) y `-r/--reverse`

**Independent Test**: crear tareas con combinaciones de estado y prioridad y verificar que cada filtro, solo o combinado, devuelve exactamente las que cumplen; `--reverse` muestra primero la más antigua

### Tests for User Story 3 ⚠️

- [X] T034 [P] [US3] Add to `tests/db/tasks.test.ts` a `describe('listTasks filters and order')`: filter by status only, by priority only, both combined (AND), no matches → `[]`; `order: 'asc'` returns oldest first with ties broken by lower `id` first
- [X] T035 [P] [US3] Add to `tests/commands/list.test.ts` (US3 scenarios 1–6): `{ status: 'in-progress' }`, `{ priority: 'high' }`, `{ status: 'todo', priority: 'HIGH' }` show only matching rows; no matches prints `No hay tareas que coincidan con los filtros (estado: todo, prioridad: high).` (only mention the filters actually given); invalid `{ status: 'doing' }` / `{ priority: 'x' }` throw the invalid-value messages; `{ reverse: true }` shows the oldest task first

### Implementation for User Story 3

- [X] T036 [US3] Extend `listTasks(db, filters: { status?: TaskStatus; priority?: TaskPriority } = {}, order: 'asc' | 'desc' = 'desc')` in `src/db/tasks.ts`, building the `WHERE` clause only from present filters with `?` placeholders (never string-interpolate values) and `ORDER BY created_at <ASC|DESC>, id <ASC|DESC>` from a fixed whitelist — make T034 pass and keep T017 green
- [X] T037 [US3] Extend `src/commands/list.ts`: options `-s, --status <status>`, `-p, --priority <priority>`, `-r, --reverse` (`Filtra por estado`, `Filtra por prioridad`, `Muestra primero las más antiguas`); validate with `parseStatus`/`parsePriority`; choose between the no-tasks message and the no-matches message — make T035 pass

**Checkpoint**: US1–US3 funcionan; listado filtrable y ordenable.

---

## Phase 6: User Story 4 - Corregir una tarea (Priority: P2)

**Goal**: `update <id>` con `-t/--title`, `-d/--description`, `-p/--priority`; solo cambian los campos indicados

**Independent Test**: crear una tarea, modificar cada campo por separado y en conjunto, y verificar que solo cambiaron los campos indicados

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Add to `tests/utils/validation.test.ts` a `describe('buildUpdate')`: `{}` → error `indica al menos un campo a modificar: --title, --description, --clear-description o --priority.`; `{ clearDescription: true }` → `{ description: null }`; `{ description: 'x', clearDescription: true }` → error `usa --description o --clear-description, no ambas.`; `{ priority: 'LOW' }` → `{ priority: 'low' }` only; `{ title: '  Nuevo  ', description: 'x' }` → trimmed title + description; `{ title: '  ' }` → title error; `{ description: '' }` → `{ description: null }` (clears it); invalid priority → priority error
- [X] T039 [P] [US4] Add to `tests/db/tasks.test.ts` a `describe('updateTaskFields')`: updating only `priority` leaves `title`, `description`, `status`, `createdAt` unchanged; updating `title` + `description` changes both; `description: null` clears it; `status`, `id`, `created_at` are never written (FR-017)
- [X] T040 [P] [US4] Write `tests/commands/update.test.ts` (US4 scenarios 1–5): priority-only update prints `Tarea 1 actualizada (prioridad).` and other fields unchanged; title + description prints `Tarea 1 actualizada (título, descripción).`; no options throws the at-least-one-field message; `{ clearDescription: true }` clears the description and prints `Tarea 1 actualizada (descripción).`; empty title throws and the task is unchanged; id 99 throws `no existe la tarea 99.`

### Implementation for User Story 4

- [X] T041 [US4] Add pure `buildUpdate(options: { title?: string; description?: string; clearDescription?: boolean; priority?: string }): Result<{ title?: string; description?: string | null; priority?: TaskPriority }>` to `src/utils/validation.ts`, reusing `parseTitle`/`parseDescription`/`parsePriority` and treating `undefined` as "not given", `''` for description or `clearDescription: true` as "clear" (`null`), and rejecting `description` + `clearDescription` together — make T038 pass
- [X] T042 [US4] Add `updateTaskFields(db, id, fields)` to `src/db/tasks.ts` building `UPDATE tasks SET <col = ?, …> WHERE id = ?` only from the keys present, mapped through a fixed whitelist `{ title: 'title', description: 'description', priority: 'priority' }` — make T039 pass
- [X] T043 [US4] Implement `src/commands/update.ts`: `runUpdate(deps, idText, options)` = `parseId` → `requireTask` → `buildUpdate` → `updateTaskFields` → print with the Spanish names of the changed fields (`título`, `descripción`, `prioridad`, in that order); `registerUpdate` defining `update <id>` (`Modifica el título, la descripción o la prioridad de una tarea`) with `-t, --title <title>`, `-d, --description <text>` (`Nueva descripción`), `--clear-description` (`Elimina la descripción`), `-p, --priority <priority>`; add to `commandRegistrars` in `src/program.ts` — make T040 pass

**Checkpoint**: US1–US4 funcionan.

---

## Phase 7: User Story 5 - Eliminar una tarea (Priority: P3)

**Goal**: `delete <id>` con confirmación (por defecto "no") y `-f/--force`; en entorno no interactivo sin `--force` falla con código `1`

**Independent Test**: crear una tarea, intentar eliminarla respondiendo "no" y luego "sí", verificando el listado; repetir con `--force`

### Tests for User Story 5 ⚠️

- [X] T044 [P] [US5] Write `tests/utils/confirm.test.ts` for `isAffirmative`: `true` for `s`, `si`, `sí`, `y`, `yes`, `S`, `Sí`, `YES`, `'  si  '`; `false` for `''`, `n`, `no`, `nope`, `sip`, `yes please`, `1`
- [X] T045 [P] [US5] Add to `tests/db/tasks.test.ts` a `describe('deleteTask')`: removes only the given row; next insert after deleting the highest id still gets a new higher id
- [X] T046 [P] [US5] Write `tests/commands/delete.test.ts` (US5 scenarios 1–5 + non-interactive edge case) with deps extended by `confirm: (question) => Promise<string>` (fake recording the question) and `isInteractive: boolean`: question is `¿Eliminar la tarea 1 "Comprar pan"? [s/N] `; answer `sí` deletes and prints `Tarea 1 eliminada.`; answers `''` and `n` keep the task and print `Operación cancelada. La tarea 1 no se eliminó.` without throwing (exit `0`); `{ force: true }` deletes without calling `confirm`; id 99 throws `no existe la tarea 99.` without calling `confirm`; `isInteractive: false` without force throws user error `no se puede pedir confirmación en un entorno no interactivo. Usa --force para eliminar sin confirmar.`, does not call `confirm` and keeps the task; `isInteractive: false` with force deletes

### Implementation for User Story 5

- [X] T047 [P] [US5] Implement `src/utils/confirm.ts`: pure `isAffirmative(answer)` (`trim()` + `toLowerCase()`, member of `['s', 'si', 'sí', 'y', 'yes']`); `askConfirmation(question): Promise<string>` using `createInterface` from `node:readline/promises` on `process.stdin`/`process.stdout`, always closing the interface (`finally`) — make T044 pass
- [X] T048 [US5] Add `deleteTask(db, id)` to `src/db/tasks.ts` using `DELETE FROM tasks WHERE id = ?` — make T045 pass
- [X] T049 [US5] Implement `src/commands/delete.ts`: `runDelete(deps & { confirm; isInteractive }, idText, options: { force?: boolean })` = `parseId` → `requireTask` → if not force: non-interactive → user error; else ask, `isAffirmative` → delete or print cancel message → print result; `registerDelete` defining `delete <id>` (`Elimina una tarea (pide confirmación)`) with `-f, --force` (`Elimina sin pedir confirmación`), wiring `confirm = askConfirmation` and `isInteractive = Boolean(process.stdin.isTTY)`; add to `commandRegistrars` in `src/program.ts` — make T046 pass

**Checkpoint**: las 5 historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final contra la constitución, la spec y el quickstart

- [X] T050 [P] Write `README.md` at repo root in Spanish: requisitos (Node ≥ 22.13), instalación global (`npm install -g .` o desde npm), nota sobre herramientas de compilación si better-sqlite3 no tiene binario para la plataforma, ubicación de datos `~/.task-cli/tasks.db`, uso de los 6 comandos con ejemplos (copiados de `contracts/cli-commands.md`), `NO_COLOR`, desarrollo (`npm run dev`, `npm test`, `npm run typecheck`)
- [X] T051 [P] Add to `tests/program.test.ts`: `task-cli add` (missing argument) and `task-cli list --foo` (unknown option) return `1` with Spanish messages; `--version` returns `0`; `--help` lists the six commands `add`, `list`, `show`, `status`, `update`, `delete`
- [X] T052 Add `tests/db/performance.test.ts`: insert 1.000 tasks into `:memory:` and assert `listTasks` and `findTask` each complete in < 100 ms (well under SC-002's 1 s, leaving margin for Node startup)
- [X] T053 Run quality gates: `npm run typecheck`, `npm test`, `npm run build`; fix any failure
- [X] T054 Constitution review of `src/`: no `class` keyword, no ORM, only `commander`/`better-sqlite3`/`cli-table3` in `dependencies`, no `console.log` of stack traces, every `process.exit*` only in `src/index.ts`, colors only in `colorStatus`/`colorPriority`
- [X] T055 Run the 27 scenarios and the 1.000-task performance check in `specs/001-task-management-cli/quickstart.md` against a temporary `HOME`/`USERPROFILE`; record any mismatch with `contracts/cli-commands.md` and fix it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **US1–US5 (Phases 3–7)**: dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: solo Foundational. Aporta `insertTask` y `listTasks`, que los tests de las demás historias usan para preparar datos.
- **US2 (P1)**: Foundational + `insertTask` de US1 (para crear datos en tests). Independiente en funcionalidad.
- **US3 (P2)**: extiende `listTasks` y `src/commands/list.ts` de US1 → requiere US1.
- **US4 (P2)**: Foundational + `insertTask` de US1.
- **US5 (P3)**: Foundational + `insertTask` de US1.

```text
Setup → Foundational → US1 ─┬─► US2
                            ├─► US3
                            ├─► US4
                            └─► US5 ──► Polish
```

### Within Each User Story

- Tests primero (deben fallar), luego `db/` y `utils/`, luego `commands/`, luego registro en `src/program.ts`
- Archivos compartidos entre historias (`src/db/tasks.ts`, `tests/db/tasks.test.ts`, `src/program.ts`, `src/utils/validation.ts`) se editan de forma secuencial: no ejecutar en paralelo tareas de distintas historias que toquen el mismo archivo

### Parallel Opportunities

- Setup: T002, T003, T004
- Foundational: T005–T009 (archivos distintos); T010–T016 en orden
- US1: T017–T021 juntos; luego T022 y T023 en paralelo
- US2: T028–T030 juntos; T031 en paralelo con T032
- US4: T038–T040 juntos
- US5: T044–T046 juntos; T047 en paralelo con T048
- Tras US1, US2/US4/US5 pueden avanzar en paralelo salvo en los archivos compartidos indicados arriba

---

## Parallel Example: User Story 1

```bash
# Tests de US1 (archivos distintos):
Task: "Write tests/db/tasks.test.ts for insertTask and listTasks"
Task: "Write tests/utils/format.test.ts"
Task: "Write tests/commands/add.test.ts"
Task: "Write tests/commands/list.test.ts"
Task: "Write tests/commands/show.test.ts"

# Implementación base de US1:
Task: "Add insertTask/listTasks to src/db/tasks.ts"
Task: "Implement src/utils/format.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (`add`, `list`, `show`)
4. **STOP and VALIDATE**: escenarios 1–8 y 27 de `quickstart.md`
5. Ya sirve como lista de pendientes persistente

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → MVP
3. US2 → ciclo de vida de estados (completa las historias P1)
4. US3 → filtros y orden
5. US4 → corrección de tareas
6. US5 → eliminación con confirmación
7. Polish → README, puertas de calidad, quickstart completo

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes
- La etiqueta [USn] traza cada tarea con su historia en `spec.md`
- Verificar que los tests fallan antes de implementar
- Detenerse en cada checkpoint para validar la historia de forma independiente
- `src/program.ts` (construcción del programa y `main` testeable) y `src/index.ts` (solo punto de entrada con shebang) se separan para poder testear `main` sin ejecutar el CLI al importar; ambos están dentro de `src/`, sin nuevos directorios de nivel superior
