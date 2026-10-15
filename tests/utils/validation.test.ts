import { describe, expect, it } from 'vitest';
import {
  buildUpdate,
  parseDescription,
  parseId,
  parsePriority,
  parseStatus,
  parseTitle,
} from '../../src/utils/validation.js';

describe('parseId', () => {
  it.each([
    ['1', 1],
    ['42', 42],
  ])('acepta %s', (input, expected) => {
    expect(parseId(input)).toEqual({ ok: true, value: expected });
  });

  it.each(['abc', '-1', '0', '1.5', '1e3', '', ' ', '01a'])('rechaza %j', (input) => {
    expect(parseId(input)).toEqual({
      ok: false,
      error: `el ID debe ser un entero positivo (recibido: "${input}").`,
    });
  });
});

describe('parseTitle', () => {
  it('quita espacios al inicio y al final', () => {
    expect(parseTitle('  Comprar pan  ')).toEqual({ ok: true, value: 'Comprar pan' });
  });

  it.each(['', '   ', '\t'])('rechaza título vacío %j', (input) => {
    expect(parseTitle(input)).toEqual({
      ok: false,
      error: 'el título es obligatorio y no puede estar vacío.',
    });
  });
});

describe('parsePriority', () => {
  it.each([
    ['HIGH', 'high'],
    ['Medium', 'medium'],
    ['low', 'low'],
  ])('acepta %s sin distinguir mayúsculas', (input, expected) => {
    expect(parsePriority(input)).toEqual({ ok: true, value: expected });
  });

  it('rechaza valores inválidos listando los válidos', () => {
    expect(parsePriority('urgent')).toEqual({
      ok: false,
      error: 'prioridad inválida "urgent". Valores válidos: high, medium, low.',
    });
  });
});

describe('parseStatus', () => {
  it.each([
    ['TODO', 'todo'],
    ['In-Progress', 'in-progress'],
    ['done', 'done'],
  ])('acepta %s sin distinguir mayúsculas', (input, expected) => {
    expect(parseStatus(input)).toEqual({ ok: true, value: expected });
  });

  it('rechaza valores inválidos listando los válidos', () => {
    expect(parseStatus('doing')).toEqual({
      ok: false,
      error: 'estado inválido "doing". Valores válidos: todo, in-progress, done.',
    });
  });
});

describe('buildUpdate', () => {
  it('exige al menos un campo', () => {
    expect(buildUpdate({})).toEqual({
      ok: false,
      error: 'indica al menos un campo a modificar: --title, --description, --clear-description o --priority.',
    });
  });

  it('incluye solo los campos indicados', () => {
    expect(buildUpdate({ priority: 'LOW' })).toEqual({ ok: true, value: { priority: 'low' } });
  });

  it('valida y recorta título y descripción', () => {
    expect(buildUpdate({ title: '  Nuevo  ', description: ' x ' })).toEqual({
      ok: true,
      value: { title: 'Nuevo', description: 'x' },
    });
  });

  it('rechaza título vacío', () => {
    expect(buildUpdate({ title: '  ' })).toEqual({
      ok: false,
      error: 'el título es obligatorio y no puede estar vacío.',
    });
  });

  it('rechaza prioridad inválida', () => {
    expect(buildUpdate({ priority: 'x' })).toMatchObject({ ok: false });
  });

  it.each([{ description: '' }, { clearDescription: true }])('vacía la descripción con %j', (options) => {
    expect(buildUpdate(options)).toEqual({ ok: true, value: { description: null } });
  });

  it('rechaza --description y --clear-description a la vez', () => {
    expect(buildUpdate({ description: 'x', clearDescription: true })).toEqual({
      ok: false,
      error: 'usa --description o --clear-description, no ambas.',
    });
  });
});

describe('parseDescription', () => {
  it('devuelve el texto sin espacios sobrantes', () => {
    expect(parseDescription('  Antes del viernes ')).toEqual({ ok: true, value: 'Antes del viernes' });
  });

  it('devuelve null si queda vacía', () => {
    expect(parseDescription('   ')).toEqual({ ok: true, value: null });
  });
});
