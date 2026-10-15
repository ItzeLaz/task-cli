import { Command, CommanderError, Help } from 'commander';
import { createRequire } from 'node:module';
import { registerAdd } from './commands/add.js';
import { registerDelete } from './commands/delete.js';
import { registerList } from './commands/list.js';
import { registerShow } from './commands/show.js';
import { registerStatus } from './commands/status.js';
import { registerUpdate } from './commands/update.js';
import {
  isUserError,
  translateCommanderError,
  unexpectedErrorMessage,
} from './utils/errors.js';
import type { CommandDeps } from './utils/types.js';

export interface Io {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export type GetDeps = () => CommandDeps;
export type CommandRegistrar = (program: Command, getDeps: GetDeps) => void;

/** Comandos de la herramienta, en el orden en que aparecen en la ayuda. */
export const commandRegistrars: readonly CommandRegistrar[] = [
  registerAdd,
  registerList,
  registerShow,
  registerStatus,
  registerUpdate,
  registerDelete,
];

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

// Se traduce con los hooks style* de Commander (y no sobre el texto final) para que el ancho
// de las columnas de la ayuda se calcule ya con el texto en español.
const helpWords: Readonly<Record<string, string>> = {
  'Usage:': 'Uso:',
  'Options:': 'Opciones:',
  'Commands:': 'Comandos:',
  'Arguments:': 'Argumentos:',
  'Global Options:': 'Opciones globales:',
  '[options]': '[opciones]',
  '[command]': '[comando]',
};
const translateHelpWord = (word: string) => helpWords[word] ?? word;

const spanishHelp: Partial<Help> = {
  styleTitle: translateHelpWord,
  styleOptionText: translateHelpWord,
  styleSubcommandText: translateHelpWord,
};

export function buildProgram(
  io: Io,
  getDeps: GetDeps,
  registrars: readonly CommandRegistrar[] = commandRegistrars,
): Command {
  const program = new Command()
    .name('task-cli')
    .description('Gestión de tareas personales desde la terminal')
    .version(version, '-V, --version', 'Muestra la versión')
    .helpOption('-h, --help', 'Muestra la ayuda')
    .helpCommand('help [comando]', 'Muestra la ayuda de un comando')
    .configureHelp(spanishHelp)
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr, outputError: () => {} })
    .exitOverride();
  for (const register of registrars) register(program, getDeps);
  return program;
}

/** Ejecuta la herramienta y devuelve el código de salida: 0 en éxito, 1 en error. */
export async function main(
  argv: readonly string[],
  io: Io,
  getDeps: GetDeps,
  registrars: readonly CommandRegistrar[] = commandRegistrars,
): Promise<number> {
  try {
    await buildProgram(io, getDeps, registrars).parseAsync(argv);
    return 0;
  } catch (err) {
    if (err instanceof CommanderError) {
      // Ayuda o versión ya impresas (o ayuda por falta de comando, ya escrita en stderr).
      if (err.exitCode === 0 || err.code === 'commander.help') return err.exitCode;
      io.stderr(`Error: ${translateCommanderError(err.code, err.message)}\n`);
      return 1;
    }
    io.stderr(`Error: ${isUserError(err) ? err.message : unexpectedErrorMessage}\n`);
    return 1;
  }
}
