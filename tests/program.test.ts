import { describe, expect, it, vi } from 'vitest';
import { main, type CommandRegistrar } from '../src/program.js';
import { userError } from '../src/utils/errors.js';
import { makeDeps } from './helpers.js';

function makeIo() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { stdout: (t: string) => out.push(t), stderr: (t: string) => err.push(t) },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  };
}

// Commander solo informa "comando desconocido" si el programa tiene subcomandos.
const stubRegistrar: CommandRegistrar = (program, getDeps) => {
  program.command('noop').description('No hace nada').action(() => {
    getDeps();
  });
  program.command('fail-user').action(() => {
    throw userError('x');
  });
  program.command('fail-boom').action(() => {
    throw new Error('boom');
  });
};

const run = async (args: string[], getDeps = vi.fn(() => makeDeps().deps)) => {
  const io = makeIo();
  const code = await main(['node', 'task-cli', ...args], io.io, getDeps, [stubRegistrar]);
  return { code, getDeps, ...io };
};

describe('main', () => {
  it('--help sale con 0, en español y sin abrir la base de datos', async () => {
    const r = await run(['--help']);
    expect(r.code).toBe(0);
    expect(r.stdout()).toContain('Uso:');
    expect(r.stdout()).toContain('Opciones:');
    expect(r.stdout()).toContain('Comandos:');
    expect(r.stdout()).not.toMatch(/Usage:|Options:|\[options\]/);
    expect(r.getDeps).not.toHaveBeenCalled();
  });

  it('un comando que termina bien sale con 0', async () => {
    const r = await run(['noop']);
    expect(r.code).toBe(0);
    expect(r.getDeps).toHaveBeenCalledOnce();
  });

  it('comando desconocido sale con 1 y mensaje en español', async () => {
    const r = await run(['foo']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toContain('Error: comando desconocido "foo"');
  });

  it('un error de usuario se muestra como "Error: <mensaje>" y sale con 1', async () => {
    const r = await run(['fail-user']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toBe('Error: x\n');
  });

  it('--version sale con 0', async () => {
    const r = await run(['--version']);
    expect(r.code).toBe(0);
    expect(r.stdout()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('un error inesperado muestra un mensaje genérico sin stack trace y sale con 1', async () => {
    const r = await run(['fail-boom']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toContain('Ocurrió un error inesperado');
    expect(r.stderr()).not.toContain('boom');
    expect(r.stderr()).not.toMatch(/\bat /);
  });
});

describe('main con los comandos reales', () => {
  const runReal = async (args: string[]) => {
    const io = makeIo();
    const code = await main(['node', 'task-cli', ...args], io.io, () => makeDeps().deps);
    return { code, ...io };
  };

  it('--help lista los seis comandos', async () => {
    const r = await runReal(['--help']);
    expect(r.code).toBe(0);
    for (const name of ['add', 'list', 'show', 'status', 'update', 'delete']) {
      expect(r.stdout()).toMatch(new RegExp(`^  ${name}\\b`, 'm'));
    }
  });

  it('falta un argumento obligatorio → mensaje en español y salida 1', async () => {
    const r = await runReal(['add']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toBe(
      'Error: falta el argumento obligatorio <title>. Usa task-cli <comando> --help para ver cómo usarlo.\n',
    );
  });

  it('opción desconocida → mensaje en español y salida 1', async () => {
    const r = await runReal(['list', '--foo']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toContain('Error: opción desconocida "--foo"');
  });

  it('opción sin valor → mensaje en español y salida 1', async () => {
    const r = await runReal(['add', 'x', '-p']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toContain('Error: falta el valor de la opción -p, --priority <priority>.');
  });

  it('un ID negativo se trata como ID inválido, no como opción', async () => {
    const r = await runReal(['show', '-1']);
    expect(r.code).toBe(1);
    expect(r.stderr()).toBe('Error: el ID debe ser un entero positivo (recibido: "-1").\n');
  });

  it('un comando correcto sale con 0', async () => {
    const r = await runReal(['list']);
    expect(r.code).toBe(0);
  });
});
