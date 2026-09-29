import { localizeSan } from './san';

describe('localizeSan', () => {
  it.each([
    ['Nf3', 'Cf3'],
    ['Bxe5+', 'Axe5+'],
    ['Rad1', 'Tad1'],
    ['Qh5#', 'Dh5#'],
    ['Kxe7', 'Rxe7'],
    ['exd8=Q#', 'exd8=D#'],
    ['b8=N+', 'b8=C+'],
    ['a1=R', 'a1=T'],
    ['h8=B', 'h8=A'],
    ['O-O', 'O-O'],
    ['O-O-O', 'O-O-O'],
    ['O-O-O+', 'O-O-O+'],
    ['e4', 'e4'],
    ['bxc3', 'bxc3'],
  ])('should write %s as %s in Spanish', (san, expected) => {
    expect(localizeSan(san, 'es')).toBe(expected);
  });

  it('should leave the move untouched in English', () => {
    for (const san of ['Nf3', 'Bxe5+', 'exd8=Q#', 'O-O-O', 'e4']) {
      expect(localizeSan(san, 'en')).toBe(san);
    }
  });
});
