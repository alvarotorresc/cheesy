import {
  describe as describeText,
  hasNotation,
  MAX_DESCRIPTION,
  sentencesOf,
  textOf,
} from './describe';

describe('textOf', () => {
  const segments = [
    { kind: 'text', text: 'Solo ' },
    { kind: 'move', san: 'Ke7', number: '1...', start: false, written: '1...Re7' },
    { kind: 'text', text: ' toma la ' },
    { kind: 'term', id: 'opposition', text: 'oposición' },
    { kind: 'text', text: ' en ' },
    { kind: 'square', square: 'e7' },
    { kind: 'text', text: '.\n' },
  ] as const;

  it('tells moves as prose, terms by their words and squares by name', () => {
    expect(textOf(segments, 'es')).toBe('Solo el rey a e7 toma la oposición en e7.');
  });

  it('starts a sentence with a capital when a piece move opens it', () => {
    expect(
      textOf(
        [
          { kind: 'move', san: 'Nf3', number: '2.', start: true, written: '2.Nf3' },
          { kind: 'text', text: ' develops.' },
        ],
        'en',
      ),
    ).toBe('The knight to f3 develops.');
  });

  it('never leaves notation behind: no move number, piece letter, capture or castling sign', () => {
    const text = textOf(
      [
        { kind: 'text', text: 'With ' },
        { kind: 'move', san: 'Bxf7+', number: '5.', start: false, written: '5.Bxf7+' },
        { kind: 'text', text: ' and ' },
        { kind: 'move', san: 'O-O', number: '5...', start: false, written: '5...O-O' },
        { kind: 'text', text: ' Black is fine.' },
      ],
      'en',
    );
    expect(text).toBe('With the bishop capture on f7 and castling kingside Black is fine.');
    expect(hasNotation(text)).toBe(false);
  });
});

describe('hasNotation', () => {
  it('finds moves written in notation, in either language', () => {
    for (const text of [
      'Con 2.c3 las blancas',
      'Con 5...a6 las negras',
      'tras ...d5',
      'el salto Cf3',
      'Nf3 develops',
      'Txe5 gana',
      'exd5 abre',
      'O-O-O y ataque',
      '1. e4',
      'Con 5…a6 las negras',
      'tras …d5',
      '(Cf3) y',
      '«Ab4» clava',
      '"Nf3" develops',
      '“Bb5” pins',
      'y e8=D gana',
      'then a1=Q wins',
    ]) {
      expect(hasNotation(text), text).toBe(true);
    }
  });

  it('lets squares, numbers and words pass', () => {
    for (const text of [
      'El peón de e4 controla d5.',
      'Peón a c3 prepara d4.',
      'Las 21 aperturas, 14 finales y 13 posiciones.',
      'Rey a e7, jaque.',
      'Dama de la Torre de Londres.',
      'Siglo XIX: 1858.',
      'Con c3 las blancas preparan d4.',
      'el alfil a b4 y el caballo a d2',
      'the bishop to b4 and castling kingside',
      'Y entonces… e4 cae.',
      'Las torres (en e1 y d1) presionan.',
      'A1 es una casilla.',
    ]) {
      expect(hasNotation(text), text).toBe(false);
    }
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
