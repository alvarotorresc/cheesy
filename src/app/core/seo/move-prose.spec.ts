import { moveProse } from './move-prose';

describe('moveProse', () => {
  it('says a pawn move as its square, even at the start of a sentence', () => {
    expect(moveProse('c3', 'es')).toBe('c3');
    expect(moveProse('a6', 'en')).toBe('a6');
    expect(moveProse('e5', 'es', true)).toBe('e5');
  });

  it('names a piece with its article and leaves out what tells two pieces apart', () => {
    expect(moveProse('Bb4', 'es')).toBe('el alfil a b4');
    expect(moveProse('Nbd2', 'es')).toBe('el caballo a d2');
    expect(moveProse('Qd1', 'es')).toBe('la dama a d1');
    expect(moveProse('Bb4', 'en')).toBe('the bishop to b4');
    expect(moveProse('Nbd2', 'en')).toBe('the knight to d2');
    expect(moveProse('Nf3', 'en', true)).toBe('The knight to f3');
  });

  it('says a capture as a noun, and castling by its side', () => {
    expect(moveProse('Bxf7+', 'es')).toBe('la captura de alfil en f7');
    expect(moveProse('exd5', 'es')).toBe('la captura en d5');
    expect(moveProse('Bxf7+', 'en')).toBe('the bishop capture on f7');
    expect(moveProse('O-O', 'es', true)).toBe('El enroque corto');
    expect(moveProse('O-O-O', 'en')).toBe('castling queenside');
  });

  it('says a promotion with the new piece', () => {
    expect(moveProse('e8=Q', 'es')).toBe('e8 coronando dama');
    expect(moveProse('e8=N', 'en')).toBe('e8, promoting to a knight');
  });

  it('leaves text that is no move untouched', () => {
    expect(moveProse('hello', 'en')).toBe('hello');
  });
});
