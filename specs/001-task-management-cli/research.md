# Research: task-cli (Fase 0)

**Feature**: `001-task-management-cli` | **Fecha**: 2026-10-01 | **Plan**: [plan.md](./plan.md)

El stack base (TypeScript, Node.js LTS, better-sqlite3, Commander.js, cli-table3, Vitest) está
fijado por la constitución, así que esta investigación resuelve únicamente las decisiones
abiertas dentro de ese stack. No quedan `NEEDS CLARIFICATION`.

---

## R1. Versión de Node.js y formato de módulos

- **Decision**: Node.js ≥ 22.13 (LTS), desarrollo en Node 24 LTS. Paquete ESM (`"type": "module"`),
  TypeScript 5.x con `module`/`moduleResolution` = `NodeNext`. `tsx` para ejecutar en desarrollo,
  `tsc` para compilar a `dist/` (lo que se publica e instala con `npm install -g`).
- **Rationale**: Node 22 y 24 son las LTS activas; Node 22 trae `util.styleText` estable (ver R4)
  y `readline/promises`. Compilar a JS evita depender de `tsx` en tiempo de ejecución en la
  instalación global (arranque más rápido, menos dependencias de runtime).
- **Alternatives considered**: ejecutar el bin con `tsx` en producción (añade dependencia de
  runtime y ~150 ms de arranque); CommonJS (sin ventaja, y ESM es el estándar actual).

## R2. Esquema SQLite e IDs no reutilizables

- **Decision**: tabla única `tasks` con `id INTEGER PRIMARY KEY AUTOINCREMENT`, restricciones
  `CHECK` para `status` y `priority`, y `created_at` como texto ISO 8601 en UTC con milisegundos.
  Versión de esquema con `PRAGMA user_version` (inicial = 1). SQL explícito con sentencias
  preparadas de better-sqlite3; sin ORM.
- **Rationale**: `AUTOINCREMENT` garantiza que SQLite nunca reutiliza un ID, incluso tras borrar
  la fila con el ID más alto (FR-004, edge case "IDs tras eliminar"). ISO 8601 UTC ordena
  lexicográficamente y se convierte a hora local solo al mostrarla. `user_version` permite
  migraciones futuras sin tabla extra.
- **Alternatives considered**: `INTEGER PRIMARY KEY` sin `AUTOINCREMENT` (puede reutilizar el
  máximo ID tras borrarlo → incumple FR-004); epoch en milisegundos como `INTEGER` (igual de
  válido, menos legible al inspeccionar la BD a mano).

## R3. Orden del listado y empates

- **Decision**: `ORDER BY created_at DESC, id DESC` por defecto; `ASC, ASC` con `--reverse`.
- **Rationale**: resuelve el empate que quedó pendiente en `/speckit-clarify` (tareas creadas en
  el mismo milisegundo, p. ej. desde un script): el ID autoincremental refleja el orden real de
  creación. Con 1.000 tareas no hace falta índice (SC-002).
- **Alternatives considered**: ordenar solo por `id` (equivalente en la práctica, pero el
  requisito habla de fecha de creación y conviene que el SQL lo exprese).

## R4. Colores sin dependencias extra

- **Decision**: usar `styleText` de `node:util`; la opción `stream` existe desde Node 22.13, de ahí el mínimo de `engines`. Se pasa el stream de
  salida (`{ stream: process.stdout }`) para que Node decida si colorear: desactiva el color si
  el stream no es TTY o si existe `NO_COLOR` (y respeta `FORCE_COLOR`). Paleta: estado `todo`
  gris, `in-progress` amarillo, `done` verde; prioridad `high` rojo, `medium` amarillo,
  `low` gris/azul tenue. El texto siempre está presente, el color solo lo refuerza.
- **Rationale**: cumple FR-011 y la aclaración sobre `NO_COLOR` sin añadir `chalk`/`picocolors`
  (Principio III). cli-table3 calcula el ancho de columna ignorando secuencias ANSI.
- **Alternatives considered**: `chalk` o `picocolors` (dependencia evitable); detectar
  TTY/`NO_COLOR` a mano (duplica lógica que Node ya trae).

## R5. Confirmación interactiva y entorno no interactivo

- **Decision**: `node:readline/promises` con `rl.question('¿Eliminar la tarea 3 "Pagar luz"?
  [s/N] ')`. Antes de preguntar se comprueba `process.stdin.isTTY`; si no es TTY y no hay
  `--force`, se cancela con un mensaje que sugiere `--force` (FR-021). La interpretación de la
  respuesta es una función pura: `isAffirmative(answer)` → `true` solo para `s`, `si`, `sí`, `y`,
  `yes` tras `trim()` y `toLowerCase()`.
- **Rationale**: sin dependencias (Principio III); la función pura cubre por completo la regla de
  FR-019 con tests unitarios (Principio VI).
- **Alternatives considered**: `inquirer`/`prompts` (dependencias pesadas para una pregunta s/N).

## R6. Errores, códigos de salida y mensajes en español con Commander

- **Decision**:
  - Errores de usuario: una función `userError(message)` crea un `Error` marcado
    (`isUserError: true`) — sin clases propias (Principio II). Las validaciones puras devuelven
    un resultado `{ ok: true, value } | { ok: false, error }`; los comandos convierten los fallos
    en `userError`.
  - Un único manejador en `main()` de `src/program.ts` (llamado desde `src/index.ts`) (`try/catch` alrededor de `program.parseAsync`):
    error de usuario → mensaje en stderr, salida `1`; cualquier otro error → mensaje genérico en
    español ("Ocurrió un error inesperado…") sin stack trace, salida `1`. Cancelación por el
    usuario → mensaje en stdout, salida `0` (FR-024).
  - Commander: `program.exitOverride()` + `configureOutput({ writeErr })` para capturar sus
    errores de parseo y traducirlos por `err.code` (`commander.unknownCommand`,
    `commander.unknownOption`, `commander.missingArgument`, `commander.optionMissingArgument`,
    `commander.excessArguments`) a mensajes en español; `commander.helpDisplayed` y
    `commander.version` salen con `0`. Descripciones de comandos/opciones en español, y
    `helpOption`/`helpCommand`/`version` con textos en español; los títulos de sección de la
    ayuda ("Usage:", "Options:", "Commands:") se traducen con `configureHelp` (override de
    `formatHelp` reutilizando los métodos del `Help` por defecto, sin subclasear).
- **Rationale**: cumple Principio IV (sin stack traces, códigos 0/1), FR-024 y FR-028.
- **Alternatives considered**: dejar los mensajes de Commander en inglés (incumple FR-028);
  `process.exit` disperso por los comandos (difícil de probar).

## R7. Ubicación y apertura de la base de datos

- **Decision**: ruta `join(os.homedir(), '.task-cli', 'tasks.db')`; `mkdirSync(dir,
  { recursive: true })` antes de abrir; al abrir: `PRAGMA journal_mode = WAL`,
  `PRAGMA busy_timeout = 2000`, y creación del esquema si `user_version = 0`. Los errores de
  SQLite al abrir/consultar (`SQLITE_NOTADB`, `SQLITE_CORRUPT`, `SQLITE_CANTOPEN`,
  `SQLITE_READONLY`, `EACCES`/`EPERM` al crear el directorio) se traducen a un mensaje en español
  que incluye la ruta del archivo (edge case "almacenamiento inaccesible o corrupto").
  Las funciones de datos reciben la conexión como parámetro, así los tests usan `':memory:'`.
- **Rationale**: ruta fijada por la constitución; `busy_timeout` evita fallos si se ejecutan dos
  comandos a la vez (gap de concurrencia anotado en clarify). Para la validación manual
  (quickstart) basta con apuntar `HOME`/`USERPROFILE` a un directorio temporal, porque
  `os.homedir()` los respeta, sin añadir una variable de entorno propia.
- **Alternatives considered**: variable `TASK_CLI_DB` para cambiar la ruta (contradice la ruta
  fija de la constitución y no hace falta).

## R8. Formato de fecha y recorte de títulos

- **Decision**: `formatDate(iso)` → `AAAA-MM-DD HH:mm` en hora local, con `getFullYear()`,
  `getMonth()`… y relleno con ceros (función pura). En la tabla, el título se recorta a 50
  caracteres visibles con `…` (función pura `truncate`); en `show` se muestra completo.
- **Rationale**: formato fijado en clarify; implementarlo a mano son pocas líneas
  (Principio III). Recortar por código (y no con `wordWrap` de cli-table3) mantiene una fila por
  tarea, más fácil de escanear.
- **Alternatives considered**: `Intl.DateTimeFormat` (formato dependiente del locale, no
  garantiza `AAAA-MM-DD`); `date-fns`/`dayjs` (dependencia innecesaria).

## R9. Distribución global y módulo nativo

- **Decision**: `package.json` con `"bin": { "task-cli": "dist/index.js" }`, shebang
  `#!/usr/bin/env node` en `src/index.ts` (tsc lo conserva), `"files": ["dist"]`,
  `"engines": { "node": ">=22.13" }`, script `prepare`/`build` = `tsc`.
- **Rationale**: FR-026 y la constitución. better-sqlite3 publica binarios precompilados para
  Windows/macOS/Linux en las versiones LTS de Node, así que `npm install -g` no necesita
  compilador en el caso normal.
- **Riesgo**: en plataformas sin binario precompilado, la instalación requiere herramientas de
  compilación (node-gyp). Se documenta en el README; no requiere cambios de diseño.

## R10. Estrategia de tests

- **Decision**: Vitest con tres grupos, todos en `tests/`:
  - Unitarios de lógica pura (`utils/`): validaciones, transiciones, `isAffirmative`,
    `formatDate`, `truncate`, construcción de filtros.
  - De datos (`db/`): consultas contra SQLite `':memory:'` (IDs no reutilizados, orden con
    empates, filtros combinados, update parcial).
  - De comandos: cada handler recibe sus dependencias (conexión, salida, función de
    confirmación, `isInteractive`) como parámetros, así se prueban los escenarios de aceptación
    sin lanzar procesos.
- **Rationale**: Principio VI (toda regla de negocio con test) sin mocks complejos; inyectar
  dependencias por parámetro es coherente con el estilo funcional (Principio II).
- **Alternatives considered**: tests end-to-end lanzando el binario (lentos; se cubren con la
  validación manual de `quickstart.md`).
