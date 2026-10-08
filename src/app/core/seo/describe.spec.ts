import { describe as describeText, MAX_DESCRIPTION, sentencesOf, textOf } from './describe';

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
    expect(describeText([`${a} ${'D'.repeat(100)}. Short.`])).toBe(a);
  });

  it('gives the first clause of a first sentence too long to fit, closed with a full stop', () => {
    const words = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => `word${from + i}`).join(' ');
    const long = `${words(0, 8)}, ${words(8, 6)}, ${words(14, 30)}.`;
    const result = describeText([long]);
    expect(result).toBe(`${words(0, 8)}, ${words(8, 6)}.`);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });

  it('never ends a clause inside a move number', () => {
    const long = `Tras 1. e4 e5 2. Cf3 las blancas ${'x'.repeat(170)} ganan.`;
    expect(describeText([long, 'Short and whole.'])).toBe('Short and whole.');
  });

  it('tries the next text when a long first sentence has no clause, and never cuts a word', () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ') + '.';
    expect(describeText([long, `${a} ${b}`])).toBe(`${a} ${b}`);
    expect(describeText([long])).toBe('');
  });

  it('never ends with an ellipsis', () => {
    expect(describeText([`${a} ${'E'.repeat(120)}.`])).toBe(a);
  });

  it('gives nothing for no text', () => {
    expect(describeText([])).toBe('');
  });
});
