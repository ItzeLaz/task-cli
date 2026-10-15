# task-cli

Gestión de tareas personales desde la terminal: crea, lista, filtra, cambia de estado, corrige y
elimina tareas. Los datos se guardan en local, en `~/.task-cli/tasks.db` (SQLite), y se crean
automáticamente la primera vez.

## Requisitos

- Node.js ≥ 22.13 (LTS) y npm.
- `better-sqlite3` trae binarios precompilados para Windows, macOS y Linux. Si tu plataforma no
  tiene uno, la instalación lo compilará y necesitará las herramientas de compilación de
  [node-gyp](https://github.com/nodejs/node-gyp#installation) (Python y un compilador de C++).

## Instalación

Desde el directorio del proyecto:

```bash
npm install
npm run build
npm install -g .
```

Después, `task-cli` está disponible desde cualquier directorio. Para desinstalar:
`npm uninstall -g task-cli`.

## Uso

```bash
task-cli add "Comprar pan"
task-cli add "Pagar luz" -p high -d "Antes del viernes"

task-cli list                       # más reciente primero
task-cli list -s todo -p high       # filtra por estado y prioridad
task-cli list -r                    # más antigua primero

task-cli show 2                     # detalle, con la descripción

task-cli status 2 in-progress
task-cli status 2 done

task-cli update 2 -p low
task-cli update 2 -t "Pagar la luz" -d "Antes del lunes"
task-cli update 2 --clear-description

task-cli delete 2                   # pide confirmación: s/sí/y/yes elimina; Enter cancela
task-cli delete 2 --force           # sin confirmación (necesario en scripts)
```

`task-cli --help` y `task-cli <comando> --help` muestran la ayuda de cada comando.

### Estados y transiciones

| Desde         | Puede pasar a     |
|---------------|-------------------|
| `todo`        | `in-progress`     |
| `in-progress` | `done`, `todo`    |
| `done`        | `todo`            |

Estados (`todo`, `in-progress`, `done`) y prioridades (`high`, `medium`, `low`) se aceptan sin
distinguir mayúsculas.

### Colores y scripts

- El estado y la prioridad se colorean en la terminal. Los colores se desactivan solos al
  redirigir la salida (`task-cli list > tareas.txt`) o si defines la variable `NO_COLOR`.
- Código de salida `0` en éxito (y al cancelar una eliminación), `1` en cualquier error.
- `delete` sin `--force` fuera de una terminal interactiva no elimina nada y sale con `1`.
- En Windows PowerShell 5.1 los argumentos vacíos (`""`) se pierden: para borrar la descripción
  usa `--clear-description`.

## Desarrollo

```bash
npm run dev -- list       # ejecuta desde el código fuente con tsx
npm test                  # tests con Vitest
npm run typecheck         # comprobación de tipos
npm run build             # compila a dist/
```

Estructura: `src/commands/` (un archivo por comando), `src/db/` (SQLite con SQL explícito),
`src/utils/` (lógica pura: validación, transiciones, formato, confirmación, errores).
Especificación y diseño en `specs/001-task-management-cli/`.
