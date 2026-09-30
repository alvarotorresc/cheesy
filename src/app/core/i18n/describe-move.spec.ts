import { describeMove } from './describe-move';
import { parseSan } from './parse-san';

describe('parseSan', () => {
  it('should read a disambiguated capture with promotion and mate', () => {
    expect(parseSan('exd8=Q#')).toEqual({
      piece: undefined,
      from: 'e',
      capture: true,
      to: 'd8',
      promotion: 'Q',
      check: '#',
      annotation: '',
    });
  });

  it('should read castling with check and an annotation', () => {
    expect(parseSan('O-O-O+!?')).toEqual({
      castle: 'long',
      from: '',
      capture: false,
      to: '',
      check: '+',
      annotation: '!?',
    });
  });

  it.each(['', '--', 'Zf3', 'e9', 'hello'])('should not read %j as a move', (san) => {
    expect(parseSan(san)).toBeUndefined();
  });
});

describe('describeMove', () => {
  it.each([
    ['e4', 'Peón a e4', 'Pawn to e4'],
    ['exd5', 'Peón de e captura en d5', 'Pawn from e takes on d5'],
    ['Nf3', 'Caballo a f3', 'Knight to f3'],
    ['Bxf7+', 'Alfil captura en f7, jaque', 'Bishop takes on f7, check'],
    ['Nbd2', 'Caballo de b a d2', 'Knight from b to d2'],
    ['R1e2', 'Torre de 1 a e2', 'Rook from 1 to e2'],
    ['Qh4e1', 'Dama de h4 a e1', 'Queen from h4 to e1'],
    ['O-O', 'Enroque corto', 'Kingside castling'],
    ['O-O-O', 'Enroque largo', 'Queenside castling'],
    ['e8=Q', 'Peón a e8 y corona dama', 'Pawn to e8, promotes to a queen'],
    ['Qd8#', 'Dama a d8, jaque mate', 'Queen to d8, checkmate'],
    ['Kxe7', 'Rey captura en e7', 'King takes on e7'],
    [
      'bxa1=N+',
      'Peón de b captura en a1 y corona caballo, jaque',
      'Pawn from b takes on a1, promotes to a knight, check',
    ],
    ['O-O+', 'Enroque corto, jaque', 'Kingside castling, check'],
  ])('should describe %s', (san, es, en) => {
    expect(describeMove(san, 'es')).toBe(es);
    expect(describeMove(san, 'en')).toBe(en);
  });

  it('should keep the annotation at the end, untranslated', () => {
    expect(describeMove('Nf3!?', 'es')).toBe('Caballo a f3!?');
    expect(describeMove('Bxf7+??', 'en')).toBe('Bishop takes on f7, check??');
  });

  it('should start in lower case when asked to', () => {
    expect(describeMove('Nf3', 'es', { start: false })).toBe('caballo a f3');
    expect(describeMove('O-O', 'en', { start: false })).toBe('kingside castling');
  });

  it('should return what it cannot read untouched', () => {
    expect(describeMove('--', 'es')).toBe('--');
    expect(describeMove('', 'en')).toBe('');
  });
});
