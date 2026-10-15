import { describe, expect, it } from 'vitest';
import { isAffirmative } from '../../src/utils/confirm.js';

describe('isAffirmative', () => {
  it.each(['s', 'si', 'sí', 'y', 'yes', 'S', 'Sí', 'SI', 'YES', '  si  '])('%j es afirmativa', (answer) => {
    expect(isAffirmative(answer)).toBe(true);
  });

  it.each(['', '   ', 'n', 'no', 'nope', 'sip', 'yes please', '1'])('%j no es afirmativa', (answer) => {
    expect(isAffirmative(answer)).toBe(false);
  });
});
