// The glossary: chess terms in plain words, each with a small board and the sources it was checked
// against. Definitions are written from scratch, never copied. The closed list of ids lives in
// content/tests/fast/glossary.test.ts.
import type { GlossarySpec } from '../types.ts';

const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI = 'https://en.wikipedia.org/wiki/Glossary_of_chess';

export const glossary: GlossarySpec[] = [
  {
    id: 'pin',
    name: { es: 'Clavada', en: 'Pin' },
    definition: {
      es: 'Una pieza no puede moverse, o no le conviene, porque detrás de ella, en la misma línea, hay otra más valiosa que quedaría atacada.',
      en: 'A piece cannot move, or should not, because behind it on the same line stands a more valuable one that would be left under attack.',
    },
    example: {
      fen: '8/8/5k2/8/8/2n5/8/B3K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c3', 'f6'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [WIKI, 'https://lichess.org/practice/checkmates/piece-checkmates-i'],
  },
  {
    id: 'opposition',
    name: { es: 'Oposición', en: 'Opposition' },
    definition: {
      es: 'Los dos reyes están en la misma columna o fila con una sola casilla entre ellos, y le toca mover al otro: el rey que tiene la oposición no le deja avanzar.',
      en: 'The two kings stand on the same file or rank with one square between them and it is the other side to move: the king that has the opposition keeps the other from advancing.',
    },
    example: {
      fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1',
      orientation: 'white',
      highlights: ['e4', 'e6'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [WIKI, FIDE],
  },
];
