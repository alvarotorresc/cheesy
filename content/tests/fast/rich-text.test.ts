import { describe, expect, it } from 'vitest';
import { checkRichText } from '../../lib/schema.ts';
import { movesOf, richOf, stripNote, termsOf, tokenize } from '../../lib/rich-text.ts';

describe('tokenize', () => {
  it('keeps plain text as one text segment', () => {
    expect(tokenize('Sin jugadas aquí.', 'es')).toEqual([
      { kind: 'text', text: 'Sin jugadas aquí.' },
    ]);
  });

  it('reads Spanish piece letters and stores English SAN', () => {
    expect(tokenize('Solo 1...Re7 hace tablas', 'es')).toEqual([
      { kind: 'text', text: 'Solo ' },
      { kind: 'move', san: 'Ke7', number: '1...', start: false, written: '1...Re7' },
      { kind: 'text', text: ' hace tablas' },
    ]);
  });

  it('reads English piece letters', () => {
    expect(tokenize('Only 1...Ke7 draws', 'en')[1]).toEqual({
      kind: 'move',
      san: 'Ke7',
      number: '1...',
      start: false,
      written: '1...Ke7',
    });
  });

  it('does not read the letters of the other language', () => {
    // "N" is no Spanish piece letter: Nf3 stays text in a Spanish text (test 2 flags it).
    expect(tokenize('juega Nf3', 'es')).toEqual([{ kind: 'text', text: 'juega Nf3' }]);
  });

  it('translates the promotion piece', () => {
    expect(tokenize('y e8=D gana', 'es')[1]).toMatchObject({ kind: 'move', san: 'e8=Q' });
  });

  it('keeps captures, checks, mates and castling as moves', () => {
    const moves = movesOf(tokenize('Axf7+, Td8#, exd5, O-O y O-O-O', 'es'));
    expect(moves).toEqual(['Bxf7+', 'Rd8#', 'exd5', 'O-O', 'O-O-O']);
  });

  it('reads castling written with zeros and stores it with letters', () => {
    // The Spanish texts of the content write "0-0" and "0-0-0".
    expect(tokenize('Plan Dd2, 0-0-0 y g4', 'es')[3]).toEqual({
      kind: 'move',
      san: 'O-O-O',
      start: false,
      written: '0-0-0',
    });
    expect(movesOf(tokenize('prepara ...Ae7 y ...0-0.', 'es'))).toEqual(['Be7', 'O-O']);
  });

  it('keeps annotations inside the SAN', () => {
    expect(movesOf(tokenize('1.Rd5?, 1.Rd4? o 1.Rf4?', 'es'))).toEqual(['Kd5?', 'Kd4?', 'Kf4?']);
    expect(stripNote('Kd5?!')).toBe('Kd5');
  });

  it('reads a numbered pawn move as a move and a bare square as a square', () => {
    expect(tokenize('con 3.d4 hacia d5', 'es')).toEqual([
      { kind: 'text', text: 'con ' },
      { kind: 'move', san: 'd4', number: '3.', start: false, written: '3.d4' },
      { kind: 'text', text: ' hacia ' },
      { kind: 'square', square: 'd5' },
    ]);
  });

  it('reads a series of squares joined by dashes', () => {
    expect(tokenize('b4-f4-f8-b8', 'es')).toEqual([
      { kind: 'square', square: 'b4' },
      { kind: 'text', text: '-' },
      { kind: 'square', square: 'f4' },
      { kind: 'text', text: '-' },
      { kind: 'square', square: 'f8' },
      { kind: 'text', text: '-' },
      { kind: 'square', square: 'b8' },
    ]);
  });

  it('gives back a question mark that follows a bare square', () => {
    expect(tokenize('¿está en d5? Sí.', 'es')).toEqual([
      { kind: 'text', text: '¿está en ' },
      { kind: 'square', square: 'd5' },
      { kind: 'text', text: '? Sí.' },
    ]);
  });

  it('marks a move that opens a sentence', () => {
    const segments = tokenize('Tablas. Re7 es la única.', 'es');
    expect(segments[1]).toMatchObject({ kind: 'move', san: 'Ke7', start: true });
    expect(tokenize('Re7 salva', 'es')[0]).toMatchObject({ start: true });
  });

  it('does not read squares or moves inside words or codes', () => {
    expect(tokenize('ECO C44, la a4b o 2e4', 'es')).toEqual([
      { kind: 'text', text: 'ECO C44, la a4b o 2e4' },
    ]);
  });

  it('turns a term mark into a term segment and reads nothing inside it', () => {
    expect(tokenize('toma la [oposición](opposition) en e6', 'es')).toEqual([
      { kind: 'text', text: 'toma la ' },
      { kind: 'term', id: 'opposition', text: 'oposición' },
      { kind: 'text', text: ' en ' },
      { kind: 'square', square: 'e6' },
    ]);
  });

  it('leaves a malformed term mark as text', () => {
    expect(tokenize('la [oposición](Bad Id)', 'es')).toEqual([
      { kind: 'text', text: 'la [oposición](Bad Id)' },
    ]);
  });
});

describe('richOf', () => {
  it('cuts both languages', () => {
    const rich = richOf({ es: 'Juega Cf3.', en: 'Play Nf3.' });
    expect(movesOf(rich.es)).toEqual(['Nf3']);
    expect(movesOf(rich.en)).toEqual(['Nf3']);
  });
});

describe('termsOf', () => {
  it('lists the term ids once and sorted', () => {
    const segments = tokenize('[b](pin) y [a](fork) y otra [b](pin)', 'es');
    expect(termsOf(segments)).toEqual(['fork', 'pin']);
  });
});

describe('checkRichText', () => {
  const errorsOf = (value: unknown): string[] => {
    const errs: string[] = [];
    checkRichText(value, 'x', errs);
    return errs;
  };

  it('accepts cut texts', () => {
    expect(errorsOf(richOf({ es: 'Juega Cf3 hacia [e5](centre).', en: 'Play Nf3.' }))).toEqual([]);
  });

  it('rejects plain strings and unknown segments', () => {
    expect(errorsOf({ es: 'texto', en: 'text' })).not.toEqual([]);
    expect(errorsOf({ es: [{ kind: 'bold', text: 'x' }], en: [] })).not.toEqual([]);
    expect(errorsOf({ es: [{ kind: 'square', square: 'z9' }], en: [] })).not.toEqual([]);
  });

  it('rejects an empty language', () => {
    expect(errorsOf({ es: [], en: [{ kind: 'text', text: 'x' }] })).not.toEqual([]);
  });
});
