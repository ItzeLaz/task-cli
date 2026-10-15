import type { Result } from './types.js';

type UserError = Error & { isUserError: true };

/** Error causado por el usuario: su mensaje se muestra tal cual y la salida es 1. */
export function userError(message: string): UserError {
  return Object.assign(new Error(message), { isUserError: true as const });
}

export function isUserError(err: unknown): err is UserError {
  return err instanceof Error && (err as Partial<UserError>).isUserError === true;
}

/** Devuelve el valor de un resultado válido o lanza su error como error de usuario. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw userError(result.error);
  return result.value;
}

export const unexpectedErrorMessage =
  'Ocurrió un error inesperado. Vuelve a intentarlo; si persiste, revisa el archivo ~/.task-cli/tasks.db.';

/** Primer texto entre comillas simples del mensaje de Commander (p. ej. el comando u opción). */
function quotedToken(message: string): string {
  return /'([^']*)'/.exec(message)?.[1] ?? '';
}

/** Traduce al español los errores de parseo de Commander (sin el prefijo "Error:"). */
export function translateCommanderError(code: string, message: string): string {
  switch (code) {
    case 'commander.unknownCommand':
      return `comando desconocido "${quotedToken(message)}". Usa task-cli --help para ver los comandos disponibles.`;
    case 'commander.unknownOption':
      return `opción desconocida "${quotedToken(message)}". Usa task-cli <comando> --help para ver las opciones disponibles.`;
    case 'commander.missingArgument':
      return `falta el argumento obligatorio <${quotedToken(message)}>. Usa task-cli <comando> --help para ver cómo usarlo.`;
    case 'commander.optionMissingArgument':
      return `falta el valor de la opción ${quotedToken(message)}.`;
    case 'commander.excessArguments': {
      const received = /got \d+: (.*)\.$/s.exec(message)?.[1] ?? '';
      return `demasiados argumentos (recibidos: ${received}). Si un texto tiene espacios, ponlo entre comillas.`;
    }
    default:
      return 'argumentos no válidos. Usa task-cli --help para ver cómo usar la herramienta.';
  }
}

/** Mensaje claro, con la ruta del archivo, para errores al abrir o leer la base de datos. */
export function dbErrorMessage(path: string, err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  const prefix = `no se pudo abrir la base de datos en ${path}.`;
  switch (code) {
    case 'SQLITE_NOTADB':
    case 'SQLITE_CORRUPT':
      return `${prefix} El archivo está dañado o no es una base de datos de task-cli; muévelo o renómbralo para empezar con una nueva.`;
    case 'SQLITE_CANTOPEN':
    case 'SQLITE_READONLY':
    case 'EACCES':
    case 'EPERM':
      return `${prefix} No hay permisos para leer o escribir en esa ubicación; revisa los permisos del archivo y de su carpeta.`;
    default:
      return `${prefix} Comprueba que el archivo y su carpeta existen y son accesibles.`;
  }
}
