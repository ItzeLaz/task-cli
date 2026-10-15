# Feature Specification: Gestión de tareas personales desde la terminal (task-cli)

**Feature Branch**: `001-task-management-cli`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Construir un CLI llamado task-cli para gestión de tareas personales
desde la terminal: crear, listar (con filtros y orden), cambiar estado con transiciones
controladas, actualizar y eliminar tareas con confirmación." (ver `spec-input.md`)

## Clarifications

### Session 2026-10-01

- Q: ¿Cómo ve el usuario la descripción de una tarea si el listado no la muestra? → A: Se añade un comando de detalle (`show <id>`) que muestra todos los campos, incluida la descripción.
- Q: ¿En qué idioma están los mensajes de la herramienta? → A: Mensajes (ayuda, confirmaciones, errores) en español; comandos, opciones y valores de estado/prioridad en inglés.
- Q: ¿Qué respuestas cuentan como "sí" en la confirmación de eliminación? → A: `s`, `si`, `sí`, `y`, `yes` (sin distinguir mayúsculas); cualquier otra respuesta, incluido Enter, cancela.
- Q: ¿Qué pasa con los colores si la salida no es una terminal o existe `NO_COLOR`? → A: Se desactivan automáticamente; el estado y la prioridad siguen visibles como texto.
- Q: ¿Con qué formato se muestra la fecha de creación? → A: `AAAA-MM-DD HH:mm` en hora local (p. ej. `2026-10-01 14:30`), en el listado y en el detalle.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y listar tareas (Priority: P1)

Como persona que trabaja en la terminal, quiero anotar una tarea rápidamente con un título (y
opcionalmente prioridad y descripción) y luego ver todas mis tareas en una tabla, para tener mis
pendientes a la vista sin salir de la terminal.

**Why this priority**: crear y ver tareas es el núcleo mínimo de valor; sin esto no existe
producto. Por sí solo ya funciona como una lista de pendientes persistente.

**Independent Test**: crear varias tareas con distintas prioridades y verificar que aparecen en
el listado con su ID, título, estado `todo`, prioridad y fecha de creación, de la más reciente a
la más antigua.

**Acceptance Scenarios**:

1. **Given** no existen tareas, **When** el usuario crea una tarea con título "Comprar pan",
   **Then** la tarea se guarda con ID 1, estado `todo`, prioridad `medium` y se confirma su
   creación mostrando el ID asignado.
2. **Given** existe la tarea 1, **When** el usuario crea otra con título "Pagar luz", prioridad
   `high` y descripción "Antes del viernes", **Then** se guarda con ID 2, estado `todo`,
   prioridad `high` y la descripción indicada.
3. **Given** el usuario intenta crear una tarea sin título (o con título vacío o solo espacios),
   **When** ejecuta el comando de creación, **Then** no se crea ninguna tarea y se muestra un
   mensaje indicando que el título es obligatorio.
4. **Given** el usuario indica una prioridad distinta de `high`, `medium` o `low`, **When**
   ejecuta la creación, **Then** no se crea la tarea y el mensaje lista las prioridades válidas.
5. **Given** existen las tareas 1 y 2, **When** el usuario lista las tareas, **Then** ve una
   tabla con columnas ID, título, estado, prioridad y fecha de creación, con la tarea 2 primero.
6. **Given** no existen tareas, **When** el usuario lista, **Then** ve un mensaje indicando que
   no hay tareas (no una tabla vacía sin explicación).
7. **Given** existe la tarea 2 con descripción "Antes del viernes", **When** el usuario pide su
   detalle, **Then** ve ID, título, descripción, estado, prioridad y fecha de creación.
8. **Given** no existe la tarea 99, **When** el usuario pide su detalle, **Then** se informa que
   la tarea 99 no existe.

---

### User Story 2 - Avanzar el estado de una tarea (Priority: P1)

Como usuario, quiero mover una tarea entre `todo`, `in-progress` y `done` siguiendo un flujo
definido, para reflejar en qué estoy trabajando y qué terminé, sin poder marcar como hecha una
tarea que nunca empecé.

**Why this priority**: el seguimiento del progreso es la razón de usar un gestor de tareas en
lugar de un archivo de texto; comparte prioridad con P1 porque completa el ciclo de vida mínimo.

**Independent Test**: crear una tarea y recorrer todas las transiciones válidas e inválidas,
verificando que las válidas actualizan el estado y las inválidas se rechazan sin modificar nada.

**Acceptance Scenarios**:

1. **Given** una tarea en `todo`, **When** el usuario la cambia a `in-progress`, **Then** su
   estado pasa a `in-progress` y se confirma el cambio.
2. **Given** una tarea en `in-progress`, **When** la cambia a `done`, **Then** su estado pasa a
   `done`.
3. **Given** una tarea en `in-progress`, **When** la cambia a `todo`, **Then** vuelve a `todo`.
4. **Given** una tarea en `done`, **When** la cambia a `todo`, **Then** se reabre en `todo`.
5. **Given** una tarea en `todo`, **When** intenta cambiarla a `done`, **Then** el cambio se
   rechaza, el estado no se modifica y el mensaje explica que primero debe pasar a
   `in-progress`.
6. **Given** una tarea en `done`, **When** intenta cambiarla a `in-progress`, **Then** el cambio
   se rechaza y el mensaje indica las transiciones permitidas desde `done`.
7. **Given** no existe la tarea 99, **When** intenta cambiar su estado, **Then** se muestra un
   mensaje indicando que la tarea 99 no existe.
8. **Given** el usuario indica un estado que no es `todo`, `in-progress` ni `done`, **When**
   ejecuta el cambio, **Then** se rechaza y el mensaje lista los estados válidos.

---

### User Story 3 - Filtrar y ordenar el listado (Priority: P2)

Como usuario con muchas tareas, quiero filtrar el listado por estado y/o prioridad, para
concentrarme en lo que importa ahora (por ejemplo, solo las `high` pendientes).

**Why this priority**: aporta mucho valor cuando la lista crece, pero el listado completo ya es
utilizable sin filtros.

**Independent Test**: crear tareas con combinaciones de estado y prioridad y verificar que cada
filtro, solo o combinado, devuelve exactamente las tareas que cumplen.

**Acceptance Scenarios**:

1. **Given** tareas en distintos estados, **When** el usuario lista con filtro de estado
   `in-progress`, **Then** solo ve las tareas en `in-progress`.
2. **Given** tareas con distintas prioridades, **When** lista con filtro de prioridad `high`,
   **Then** solo ve las tareas `high`.
3. **Given** tareas variadas, **When** combina filtro de estado `todo` y prioridad `high`,
   **Then** solo ve las tareas que cumplen ambas condiciones.
4. **Given** ninguna tarea cumple el filtro, **When** lista, **Then** ve un mensaje indicando que
   no hay tareas que coincidan con los filtros aplicados.
5. **Given** el usuario pasa un valor de filtro inválido, **When** lista, **Then** se rechaza y
   el mensaje indica los valores válidos.
6. **Given** varias tareas creadas en momentos distintos, **When** el usuario pide el orden
   inverso, **Then** ve primero la tarea más antigua.

---

### User Story 4 - Corregir una tarea (Priority: P2)

Como usuario, quiero modificar el título, la descripción o la prioridad de una tarea existente,
para corregir errores o ajustar su importancia sin borrarla y recrearla.

**Why this priority**: evita perder el ID y el historial de estado; útil pero no bloqueante.

**Independent Test**: crear una tarea, modificar cada campo por separado y en conjunto, y
verificar en el listado que solo cambiaron los campos indicados.

**Acceptance Scenarios**:

1. **Given** la tarea 1 con prioridad `medium`, **When** el usuario actualiza solo su prioridad a
   `low`, **Then** la prioridad cambia y título, descripción, estado y fecha no cambian.
2. **Given** la tarea 1, **When** actualiza título y descripción a la vez, **Then** ambos campos
   cambian.
3. **Given** la tarea 1, **When** ejecuta la actualización sin indicar ningún campo, **Then** se
   rechaza con un mensaje indicando qué campos pueden modificarse.
4. **Given** la tarea 1, **When** intenta dejar el título vacío, **Then** se rechaza y la tarea no
   cambia.
5. **Given** no existe la tarea 99, **When** intenta actualizarla, **Then** se informa que no
   existe.

---

### User Story 5 - Eliminar una tarea (Priority: P3)

Como usuario, quiero eliminar tareas que ya no son relevantes, con una confirmación previa para
no borrar algo por error, y poder saltar esa confirmación cuando estoy seguro.

**Why this priority**: mantiene la lista limpia, pero el usuario puede convivir con tareas
`done` mientras tanto.

**Independent Test**: crear una tarea, intentar eliminarla respondiendo "no" y luego "sí", y
verificar el listado en cada caso; repetir con la opción de forzar.

**Acceptance Scenarios**:

1. **Given** la tarea 1 existe, **When** el usuario pide eliminarla, **Then** se le pide
   confirmación mostrando el título de la tarea.
2. **Given** se pidió confirmación, **When** el usuario responde afirmativamente (`s`, `si`,
   `sí`, `y` o `yes`, sin distinguir mayúsculas), **Then** la tarea se elimina y se confirma la
   eliminación.
3. **Given** se pidió confirmación, **When** responde cualquier otra cosa o solo pulsa Enter, **Then**
   la tarea no se elimina y se informa que la operación se canceló.
4. **Given** la tarea 1 existe, **When** pide eliminarla con la opción de forzar, **Then** se
   elimina sin pedir confirmación.
5. **Given** no existe la tarea 99, **When** intenta eliminarla, **Then** se informa que no
   existe y no se pide confirmación.

---

### Edge Cases

- **ID no numérico o negativo** (p. ej. `abc`, `-1`, `0`): se rechaza con un mensaje indicando
  que el ID debe ser un entero positivo.
- **Cambio al mismo estado** (p. ej. `todo` → `todo`): se rechaza informando que la tarea ya
  está en ese estado y qué transiciones se permiten desde él; no es un error silencioso.
- **IDs tras eliminar**: los IDs de tareas eliminadas no se reutilizan; una tarea nueva siempre
  recibe un ID mayor que cualquiera asignado antes.
- **Eliminación sin terminal interactiva** (p. ej. dentro de un script) y sin opción de forzar:
  no se elimina nada y la herramienta termina con código de fallo y un mensaje que sugiere usar
  la opción de forzar (no cuenta como cancelación solicitada por el usuario).
- **Primera ejecución**: si aún no existe el almacenamiento de datos, se crea automáticamente sin
  intervención del usuario.
- **Almacenamiento inaccesible o corrupto**: se muestra un mensaje claro indicando el problema y
  la ubicación del archivo de datos, sin detalles técnicos internos.
- **Títulos largos o con caracteres especiales/acentos**: se guardan íntegros; en la tabla se
  pueden recortar visualmente sin perder el dato almacenado.
- **Valores en mayúsculas** (p. ej. `HIGH`, `Done`): se aceptan sin distinguir mayúsculas.
- **Salida redirigida o `NO_COLOR` definida**: la tabla se muestra sin códigos de color.

## Requirements *(mandatory)*

### Functional Requirements

**Creación**

- **FR-001**: Los usuarios MUST poder crear una tarea indicando un título obligatorio no vacío
  (se ignoran espacios al inicio y al final).
- **FR-002**: Los usuarios MUST poder indicar opcionalmente una prioridad (`high`, `medium`,
  `low`); si no se indica, la prioridad MUST ser `medium`.
- **FR-003**: Los usuarios MUST poder indicar opcionalmente una descripción de texto libre.
- **FR-004**: El sistema MUST asignar a cada tarea un ID numérico entero autoincremental que
  nunca se reutiliza.
- **FR-005**: Toda tarea nueva MUST crearse en estado `todo` y registrar su fecha y hora de
  creación.
- **FR-006**: Tras crear una tarea, el sistema MUST mostrar el ID asignado.

**Listado**

- **FR-007**: Los usuarios MUST poder listar las tareas en formato de tabla con las columnas ID,
  título, estado, prioridad y fecha de creación; la fecha MUST mostrarse en hora local con el
  formato `AAAA-MM-DD HH:mm`.
- **FR-008**: El listado MUST ordenarse por fecha de creación, de la más reciente a la más
  antigua, por defecto; los usuarios MUST poder solicitar el orden inverso.
- **FR-009**: Los usuarios MUST poder filtrar el listado por estado (`todo`, `in-progress`,
  `done`) y/o por prioridad (`high`, `medium`, `low`); al combinar filtros se muestran solo las
  tareas que cumplen todos.
- **FR-010**: Si no hay tareas que mostrar, el sistema MUST mostrar un mensaje explicativo en
  lugar de una tabla vacía.
- **FR-011**: El estado y la prioridad MUST distinguirse visualmente (p. ej. por color) en el
  listado. Los colores MUST desactivarse automáticamente cuando la salida no es una terminal
  interactiva (p. ej. redirigida a un archivo o a otro comando) o cuando la variable de entorno
  `NO_COLOR` está definida; en ese caso estado y prioridad siguen mostrándose como texto.
- **FR-027**: Los usuarios MUST poder ver el detalle de una tarea por su ID (`show <id>`), que
  muestra todos sus campos: ID, título, descripción completa, estado, prioridad y fecha de
  creación; si la tarea no tiene descripción, se indica explícitamente.

**Cambio de estado**

- **FR-012**: Los usuarios MUST poder cambiar el estado de una tarea indicando su ID y el estado
  destino.
- **FR-013**: El sistema MUST permitir únicamente estas transiciones: `todo` → `in-progress`,
  `in-progress` → `done`, `in-progress` → `todo`, `done` → `todo`.
- **FR-014**: Cualquier otra transición (incluidas `todo` → `done`, `done` → `in-progress` y
  cambiar al mismo estado) MUST rechazarse sin modificar la tarea, indicando las transiciones
  permitidas desde el estado actual.

**Actualización**

- **FR-015**: Los usuarios MUST poder modificar el título, la descripción y/o la prioridad de una
  tarea existente por su ID; los campos no indicados MUST permanecer sin cambios.
- **FR-016**: La actualización MUST aplicar las mismas validaciones que la creación (título no
  vacío, prioridad válida) y MUST rechazarse si no se indica ningún campo a modificar.
- **FR-017**: La actualización MUST NOT modificar el estado, el ID ni la fecha de creación.

**Eliminación**

- **FR-018**: Los usuarios MUST poder eliminar una tarea por su ID.
- **FR-019**: Antes de eliminar, el sistema MUST pedir confirmación mostrando el título de la
  tarea; la respuesta por defecto (Enter) MUST ser "no". Solo MUST aceptarse como afirmativas
  `s`, `si`, `sí`, `y` y `yes` (sin distinguir mayúsculas ni espacios al inicio/final);
  cualquier otra respuesta MUST cancelar la eliminación.
- **FR-020**: Los usuarios MUST poder omitir la confirmación con una opción explícita de forzar.
- **FR-021**: Si la confirmación no puede solicitarse (entorno no interactivo) y no se indicó la
  opción de forzar, la eliminación MUST NOT realizarse y la herramienta MUST terminar con código
  de fallo y un mensaje que sugiera dicha opción.

**Transversales**

- **FR-022**: Las tareas MUST persistir entre ejecuciones en un almacenamiento local del usuario,
  creado automáticamente en el primer uso.
- **FR-023**: Toda operación sobre un ID inexistente o inválido MUST rechazarse con un mensaje que
  identifique el ID problemático.
- **FR-024**: Todos los mensajes de error MUST ser claros y accionables, sin mostrar detalles
  técnicos internos, y la herramienta MUST terminar con un código que indique fallo; las
  operaciones exitosas y las cancelaciones solicitadas por el usuario terminan con código de
  éxito.
- **FR-025**: Los valores de estado y prioridad MUST aceptarse sin distinguir mayúsculas y
  minúsculas.
- **FR-026**: La herramienta MUST poder instalarse globalmente y ejecutarse con el nombre
  `task-cli` desde cualquier directorio.
- **FR-028**: Todos los textos para el usuario (ayuda, confirmaciones, avisos y errores) MUST
  estar en español; los nombres de comandos, las opciones y los valores de estado
  (`todo`, `in-progress`, `done`) y prioridad (`high`, `medium`, `low`) MUST mantenerse en inglés.

### Key Entities *(include if feature involves data)*

- **Tarea**: unidad de trabajo personal. Atributos: ID (entero único, autoincremental, no
  reutilizable), título (obligatorio), descripción (opcional), estado (`todo` | `in-progress` |
  `done`), prioridad (`high` | `medium` | `low`), fecha y hora de creación.
- **Transición de estado**: regla que define a qué estados puede pasar una tarea desde su estado
  actual (ver FR-013); no se almacena, gobierna el cambio de estado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede crear su primera tarea y verla en el listado en menos de
  1 minuto, usando solo la ayuda integrada de la herramienta.
- **SC-002**: Cada comando (crear, listar, ver detalle, cambiar estado, actualizar, eliminar) responde en
  menos de 1 segundo con hasta 1.000 tareas almacenadas.
- **SC-003**: El 100 % de las transiciones de estado no permitidas se rechazan y dejan la tarea
  sin cambios.
- **SC-004**: El 100 % de los errores provocados por el usuario (ID inexistente, valor inválido,
  título vacío, transición inválida) muestran un mensaje que indica qué corregir, sin
  información técnica interna.
- **SC-005**: Ninguna tarea se elimina sin confirmación explícita del usuario o sin la opción de
  forzar.
- **SC-006**: Las tareas creadas siguen disponibles e intactas tras cerrar y volver a abrir la
  terminal.

## Assumptions

- Hay un único usuario por equipo/cuenta del sistema operativo; no hay usuarios, autenticación ni
  datos compartidos (fuera de alcance según la descripción).
- Solo están permitidas las transiciones enumeradas explícitamente; `done` → `in-progress` se
  considera no válida porque no aparece en la lista de transiciones válidas.
- El listado no muestra la descripción; la descripción completa se consulta con el comando de
  detalle (FR-027).
- La fecha de creación se muestra en la hora local del usuario con el formato
  `AAAA-MM-DD HH:mm` (p. ej. `2026-10-01 14:30`), tanto en el listado como en el detalle.
- La actualización permite vaciar la descripción (con una opción explícita para ello, que no
  depende de pasar un texto vacío), pero no el título.
- El título no tiene un límite de longitud funcional; la tabla puede recortarlo visualmente.
- Fuera de alcance en esta versión: usuarios/autenticación, sincronización externa, fechas de
  vencimiento, subtareas o dependencias, tags o categorías, interfaz web o API REST, deshacer
  eliminaciones y exportar/importar tareas.
