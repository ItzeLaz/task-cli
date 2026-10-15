# Quickstart: validar task-cli

**Feature**: `001-task-management-cli` | **Fecha**: 2026-10-01 | **Plan**: [plan.md](./plan.md)

Guía para comprobar de punta a punta que la feature funciona. Los mensajes exactos y códigos de
salida esperados están en [contracts/cli-commands.md](./contracts/cli-commands.md); las reglas
de datos en [data-model.md](./data-model.md).

## Requisitos

- Node.js ≥ 22.13 (LTS) y npm.
- Windows, macOS o Linux con binarios precompilados de better-sqlite3 (caso normal).

## 1. Puertas de calidad

```bash
npm install
npx tsc --noEmit        # compila sin errores de TypeScript
npx vitest run          # todos los tests pasan
```

## 2. Instalar globalmente con datos aislados

Para no tocar tus tareas reales, apunta el directorio home a una carpeta temporal (la BD irá a
`<home temporal>/.task-cli/tasks.db`).

```bash
npm run build && npm install -g .
# bash / macOS / Linux
export HOME="$(mktemp -d)"
# PowerShell (Windows)
# $env:USERPROFILE = (New-Item -ItemType Directory "$env:TEMP\task-cli-qs").FullName
```

## 3. Escenarios

Tras cada comando, comprueba el código de salida (`echo $?` en bash, `$LASTEXITCODE` en
PowerShell).

| # | Comando | Resultado esperado | Salida |
|---|---------|--------------------|:------:|
| 1 | `task-cli list` | Mensaje "No hay tareas…"; se crea `~/.task-cli/tasks.db` | 0 |
| 2 | `task-cli add "Comprar pan"` | `Tarea 1 creada…` | 0 |
| 3 | `task-cli add "Pagar luz" -p HIGH -d "Antes del viernes"` | `Tarea 2 creada…` (prioridad en mayúsculas aceptada) | 0 |
| 4 | `task-cli add "   "` | Error: título obligatorio | 1 |
| 5 | `task-cli add "X" -p urgent` | Error con prioridades válidas | 1 |
| 6 | `task-cli list` | Tabla con la tarea 2 primero; fechas `AAAA-MM-DD HH:mm`; colores en estado/prioridad | 0 |
| 7 | `task-cli list -r` | Tarea 1 primero | 0 |
| 8 | `task-cli show 2` | Detalle con "Antes del viernes" | 0 |
| 9 | `task-cli status 1 done` | Error: primero a in-progress; tarea sin cambios | 1 |
| 10 | `task-cli status 1 in-progress` → `status 1 done` → `status 1 in-progress` | ok, ok, error (desde done solo `todo`) | 0, 0, 1 |
| 11 | `task-cli status 1 todo` → `status 1 todo` | ok; luego error "ya está en todo" | 0, 1 |
| 12 | `task-cli list -s todo -p high` | Solo la tarea 2 | 0 |
| 13 | `task-cli list -s done` | "No hay tareas que coincidan…" | 0 |
| 14 | `task-cli update 2 -p low` → `show 2` | Solo cambia la prioridad | 0 |
| 15 | `task-cli update 2` | Error: indica al menos un campo | 1 |
| 16 | `task-cli update 2 --clear-description` → `show 2` | "(sin descripción)" | 0 |
| 17 | `task-cli status abc todo`, `show 0`, `show -1` | Error: ID entero positivo | 1 |
| 18 | `task-cli delete 99` | Error: no existe; no pregunta | 1 |
| 19 | `task-cli delete 1` → responder Enter | "Operación cancelada…"; la tarea sigue | 0 |
| 20 | `task-cli delete 1` → responder `Sí` | `Tarea 1 eliminada.` | 0 |
| 21 | `echo s \| task-cli delete 2` | Error: entorno no interactivo, sugiere `--force`; la tarea sigue | 1 |
| 22 | `task-cli delete 2 --force` | Eliminada sin preguntar | 0 |
| 23 | `task-cli add "Nueva"` | Recibe ID 3 (los IDs no se reutilizan) | 0 |
| 24 | `task-cli list > out.txt`; `NO_COLOR=1 task-cli list` | Sin códigos de color en ninguno de los dos | 0 |
| 25 | `task-cli foo`, `task-cli add` | Errores de Commander en español, sin stack trace | 1 |
| 26 | Sobrescribir `~/.task-cli/tasks.db` con texto y ejecutar `task-cli list` | Error claro con la ruta del archivo, sin stack trace | 1 |
| 27 | `task-cli --help` | Ayuda en español con los 6 comandos | 0 |

## 4. Rendimiento (SC-002)

Crea 1.000 tareas (p. ej. con un bucle en la shell) y mide `task-cli list`: debe responder en
menos de 1 segundo.

## 5. Limpieza

```bash
npm uninstall -g task-cli
```

Y restaura `HOME`/`USERPROFILE` cerrando la terminal.
