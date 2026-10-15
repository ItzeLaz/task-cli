import { describe, expect, it } from 'vitest';
import {
  dbErrorMessage,
  isUserError,
  translateCommanderError,
  userError,
} from '../../src/utils/errors.js';

describe('userError / isUserError', () => {
  it('crea un Error marcado como error de usuario', () => {
    const err = userError('algo falló');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('algo falló');
    expect(isUserError(err)).toBe(true);
  });

  it('no marca otros valores como error de usuario', () => {
    expect(isUserError(new Error('x'))).toBe(false);
    expect(isUserError('x')).toBe(false);
    expect(isUserError(undefined)).toBe(false);
    expect(isUserError(null)).toBe(false);
  });
});

describe('translateCommanderError', () => {
  it('traduce comando desconocido', () => {
    expect(translateCommanderError('commander.unknownCommand', "error: unknown command 'foo'")).toBe(
      'comando desconocido "foo". Usa task-cli --help para ver los comandos disponibles.',
    );
  });

  it('traduce comando desconocido aunque Commander añada una sugerencia', () => {
    const msg = "error: unknown command 'ad'\n(Did you mean add?)";
    expect(translateCommanderError('commander.unknownCommand', msg)).toContain('"ad"');
  });

  it('traduce opción desconocida', () => {
    expect(translateCommanderError('commander.unknownOption', "error: unknown option '--foo'")).toBe(
      'opción desconocida "--foo". Usa task-cli <comando> --help para ver las opciones disponibles.',
    );
  });

  it('traduce argumento obligatorio ausente', () => {
    expect(
      translateCommanderError('commander.missingArgument', "error: missing required argument 'title'"),
    ).toBe('falta el argumento obligatorio <title>. Usa task-cli <comando> --help para ver cómo usarlo.');
  });

  it('traduce opción sin valor', () => {
    expect(
      translateCommanderError(
        'commander.optionMissingArgument',
        "error: option '-p, --priority <priority>' argument missing",
      ),
    ).toBe('falta el valor de la opción -p, --priority <priority>.');
  });

  it('traduce exceso de argumentos sugiriendo comillas', () => {
    const msg = "error: too many arguments for 'add'. Expected 1 argument but got 2: Comprar, pan.";
    expect(translateCommanderError('commander.excessArguments', msg)).toBe(
      'demasiados argumentos (recibidos: Comprar, pan). Si un texto tiene espacios, ponlo entre comillas.',
    );
  });

  it('usa un mensaje genérico en español para otros códigos', () => {
    const text = translateCommanderError('commander.conflictingOption', 'error: something');
    expect(text).toBe('argumentos no válidos. Usa task-cli --help para ver cómo usar la herramienta.');
  });
});

describe('dbErrorMessage', () => {
  const path = '/home/ana/.task-cli/tasks.db';
  const sqliteError = (code: string) => Object.assign(new Error(`internal ${code} detail`), { code });

  it.each(['SQLITE_NOTADB', 'SQLITE_CORRUPT'])('explica archivo dañado (%s)', (code) => {
    const text = dbErrorMessage(path, sqliteError(code));
    expect(text).toContain(path);
    expect(text).toContain('dañado');
    expect(text).not.toContain('internal');
  });

  it.each(['SQLITE_CANTOPEN', 'SQLITE_READONLY', 'EACCES', 'EPERM'])('explica permisos (%s)', (code) => {
    const text = dbErrorMessage(path, sqliteError(code));
    expect(text).toContain(path);
    expect(text).toContain('permisos');
    expect(text).not.toContain('internal');
  });

  it('da un mensaje genérico con la ruta para otros errores', () => {
    const text = dbErrorMessage(path, new Error('boom'));
    expect(text).toContain(path);
    expect(text).not.toContain('boom');
  });
});
