<!--
Sync Impact Report
- Version change: 1.0.0 → 1.0.1 (PATCH)
- Modified principles:
  - IV. Errores Claros y Accionables: redacción del código de salida corregida
    ("Ningún comando MUST..." → "Un comando MUST NOT..."); sin cambio semántico
- Added sections: none
- Removed sections: none
- Re-validated against reglas.md: rules 1–10 all covered, no gaps
- Templates: not modified (dependent templates read the constitution at runtime)
- Deferred TODOs: none
- Source: reglas.md (rules 1–10)
-->

# Task CLI Constitution

## Core Principles

### I. Simplicidad y Estructura Plana

- La estructura del proyecto MUST ser simple y plana, organizada por funcionalidad en
  `commands/`, `db/` y `utils/`.
- MUST NOT usarse clean architecture, capas de repositorio/servicio ni abstracciones
  adicionales que no resuelvan un problema concreto del CLI.
- Cualquier nuevo directorio de nivel superior MUST justificarse en el plan de la feature.

**Razón**: un CLI de este tamaño gana más con código directo y fácil de navegar que con
capas pensadas para sistemas grandes.

### II. Estilo Funcional

- El código MUST preferir funciones sobre clases; las clases solo se permiten cuando una
  librería externa las exija.
- La lógica de negocio MUST implementarse como funciones puras siempre que sea posible,
  aislando los efectos (base de datos, terminal, sistema de archivos) en los bordes.
- Nomenclatura: `camelCase` para variables y funciones; `PascalCase` exclusivamente para
  tipos e interfaces.

**Razón**: las funciones puras son más fáciles de probar y razonar, y aíslan los efectos.

### III. Dependencias Mínimas

- MUST NOT agregarse librerías para resolver lo que se puede implementar en pocas líneas de
  código propio.
- MUST NOT usarse ORMs; el acceso a datos MUST hacerse con SQL explícito vía
  `better-sqlite3`.
- Toda nueva dependencia de runtime MUST justificarse en el plan de la feature.

**Razón**: menos dependencias reduce superficie de fallos, peso de instalación global y
mantenimiento.

### IV. Errores Claros y Accionables

- MUST NOT mostrarse stack traces al usuario final.
- Todo error MUST producir un mensaje claro que indique qué falló y qué puede hacer el
  usuario al respecto.
- Códigos de salida: `0` en éxito, `1` en error. Un comando MUST NOT terminar con `0` tras
  un fallo.

**Razón**: el usuario de un CLI necesita saber qué hacer, no depurar la implementación; los
códigos de salida permiten usar el CLI en scripts.

### V. Salida Legible en Terminal

- Toda salida al terminal MUST ser legible para humanos.
- Los listados MUST presentarse en tablas (`cli-table3` o equivalente).
- Los colores MUST usarse solo para indicar estados y prioridades, nunca como decoración.

**Razón**: una salida consistente y sobria facilita escanear tareas rápidamente.

### VI. Lógica de Negocio Probada

- Toda lógica de negocio MUST tener tests unitarios con Vitest.
- No se exige un porcentaje mínimo de cobertura; el criterio es que ninguna regla de negocio
  quede sin test.
- Una feature MUST NOT considerarse completa si introduce lógica de negocio sin tests.

**Razón**: los tests protegen el comportamiento importante sin imponer métricas de
cobertura artificiales.

## Stack Tecnológico y Distribución

- **Lenguaje y runtime**: TypeScript sobre Node.js en versión LTS. La ejecución directa
  durante el desarrollo MUST hacerse con `tsx` o una herramienta equivalente.
- **Base de datos**: SQLite mediante `better-sqlite3`. El archivo de datos MUST ubicarse en
  `~/.task-cli/tasks.db`; el CLI MUST crear el directorio si no existe.
- **Framework CLI**: Commander.js para el parseo de argumentos y la definición de comandos.
- **Testing**: Vitest.
- **Distribución**: el CLI MUST ser instalable globalmente con `npm install -g` y exponer su
  ejecutable mediante el campo `bin` de `package.json`.

Cambiar cualquier elemento de este stack constituye una enmienda a esta constitución.

## Flujo de Desarrollo y Puertas de Calidad

- Cada feature MUST pasar por especificación, plan y tareas (Spec Kit) antes de implementarse.
- El plan de cada feature MUST incluir una verificación explícita de cumplimiento contra los
  principios I–VI y el stack definido.
- Antes de dar una feature por terminada MUST cumplirse:
  - Los tests de Vitest pasan.
  - El código compila sin errores de TypeScript.
  - Los errores nuevos muestran mensajes accionables sin stack traces y salen con código `1`.
  - No se agregaron dependencias sin justificación.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica o convención del proyecto.
- **Enmiendas**: toda modificación MUST hacerse con `/speckit-constitution`, documentarse en
  el Sync Impact Report y actualizar la versión y la fecha de última enmienda.
- **Versionado** (semántico):
  - MAJOR: eliminación o redefinición incompatible de principios o del stack.
  - MINOR: nuevo principio o sección, o ampliación material de una guía existente.
  - PATCH: aclaraciones, redacción o correcciones sin cambio semántico.
- **Cumplimiento**: cada plan y cada revisión de código MUST verificar el cumplimiento de
  esta constitución; cualquier desviación MUST justificarse por escrito en el plan.

**Version**: 1.0.1 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-10-01
