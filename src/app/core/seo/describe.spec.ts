import {
  describe as describeText,
  MAX_DESCRIPTION,
  MIN_DESCRIPTION,
  sentencesOf,
  textOf,
} from './describe';

describe('textOf', () => {
  it('reads moves as written, terms by their words and squares by name', () => {
    expect(
      textOf([
        { kind: 'text', text: 'Solo ' },
        { kind: 'move', san: 'Ke7', number: '1...', start: false, written: '1...Re7' },
        { kind: 'text', text: ' toma la ' },
        { kind: 'term', id: 'opposition', text: 'oposición' },
        { kind: 'text', text: ' en ' },
        { kind: 'square', square: 'e7' },
        { kind: 'text', text: '.\n' },
      ]),
    ).toBe('Solo 1...Re7 toma la oposición en e7.');
  });
});

describe('sentencesOf', () => {
  it('splits at the end of a sentence, not inside a move', () => {
    expect(sentencesOf('Solo 1...Re7 hace tablas. ¿Por qué? «Mira» el rey. 2. Txe5 gana.')).toEqual(
      ['Solo 1...Re7 hace tablas.', '¿Por qué?', '«Mira» el rey.', '2. Txe5 gana.'],
    );
  });

  it('keeps a closing quote with its sentence', () => {
    expect(sentencesOf('He said “stop.” Then he left.')).toEqual([
      'He said “stop.”',
      'Then he left.',
    ]);
  });
});

describe('describe', () => {
  const a = 'A'.repeat(70) + '.';
  const b = 'B'.repeat(70) + '.';
  const c = 'C'.repeat(70) + '.';

  it('takes whole sentences while they fit', () => {
    expect(describeText([`${a} ${b} ${c}`])).toBe(`${a} ${b}`);
  });

  it('goes on to the next text', () => {
    expect(describeText([a, b])).toBe(`${a} ${b}`);
  });

  it('stops at the first sentence that does not fit, keeping the order', () => {
    const long = 'L'.repeat(MIN_DESCRIPTION) + '.';
    expect(describeText([`${long} ${'D'.repeat(100)}. Short.`])).toBe(long);
  });

  it('cuts the sentence that does not fit when the whole ones say too little', () => {
    const next = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ') + '.';
    const result = describeText([`${a} ${next}`]);
    expect(result.startsWith(`${a} word0 word1`)).toBe(true);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(result.length).toBeGreaterThan(MIN_DESCRIPTION);
  });

  it('cuts a first sentence that is too long at a word', () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ') + '.';
    const result = describeText([long]);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(result.endsWith('…')).toBe(true);
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
  });

  it('gives nothing for no text', () => {
    expect(describeText([])).toBe('');
  });
});
