// Lesson 4 for advanced players: outposts, the knight that uses them, knight against bishop and holes.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSKID,
  WIKI_GOOD_BAD_BISHOP,
  WIKI_OUTPOST,
  WIKI_PAWN_STRUCTURE,
  WIKI_STRATEGY,
} from './sources.ts';

export const outposts: LessonSpec = {
  id: 'outposts',
  level: 'advanced',
  order: 4,
  title: { es: 'Casillas fuertes', en: 'Outposts' },
  summary: {
    es: 'Casillas de donde ningún peón rival te puede echar, y la pieza que mejor las aprovecha.',
    en: 'Squares no rival pawn can drive you from, and the piece that uses them best.',
  },
  terms: ['outpost', 'bishop-pair'],
  sources: [WIKI_OUTPOST, WIKI_STRATEGY, WIKI_PAWN_STRUCTURE, WIKI_GOOD_BAD_BISHOP, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [casilla fuerte](outpost) está en tu cuarta fila o más adelante, la protege un peón tuyo y ningún peón rival podrá atacarla nunca, porque al rival no le quedan peones por delante en las columnas de al lado. Una pieza colocada ahí no se puede echar con peones. Aquí e5 es una [casilla fuerte](outpost) para las blancas: la protege el peón de d4, y las negras no tienen peones en las columnas d ni f.',
        en: 'An [outpost](outpost) is a square on your fourth rank or further up, protected by one of your pawns, that no rival pawn can ever attack, because the rival has no pawns left ahead of it on the files next to it. A piece placed there cannot be chased away by pawns. Here e5 is an [outpost](outpost) for White: the pawn on d4 protects it, and Black has no pawns on the d-file or the f-file.',
      },
      board: {
        fen: '6k1/pp4pp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['e5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Cuál de estas casillas es una [casilla fuerte](outpost) para tu caballo?',
        en: 'Which of these squares is an [outpost](outpost) for your knight?',
      },
      board: { fen: '2b3k1/pp3ppp/3p4/4p3/2P1P3/5N2/PP3PPP/6K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'b5', en: 'b5' },
          { es: 'd5', en: 'd5' },
          { es: 'f5', en: 'f5' },
        ],
        correct: 1,
      },
      whyWrong: [
        {
          es: 'La protege el peón de c4, pero el peón negro de a7 puede avanzar a a6 y echar de ahí a tu caballo.',
          en: 'The pawn on c4 protects it, but the black pawn on a7 can move to a6 and drive your knight away.',
        },
        null,
        {
          es: 'La protege el peón de e4, pero el peón negro de g7 puede avanzar a g6 y echar a tu caballo.',
          en: 'The pawn on e4 protects it, but the black pawn on g7 can move to g6 and drive your knight away.',
        },
      ],
      explanation: {
        es: 'Eso es: d5 la protegen tus peones de c4 y e4, y ningún peón negro puede atacarla: no hay ninguno en la columna c, y el de e5 ya ha avanzado demasiado. Un caballo en d5 se queda ahí toda la partida.',
        en: 'That is it: your pawns on c4 and e4 protect d5, and no black pawn can attack it: there is none on the c-file, and the one on e5 has already gone too far. A knight on d5 stays there for the whole game.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El caballo es la pieza que más gana con una [casilla fuerte](outpost): de cerca ataca muchas casillas y no lo pueden echar. En la partida Anand contra Ivanchuk, de 2001, el caballo blanco en c4 defiende el peón de a5 y ataca la casilla d6, y ningún peón negro puede tocarlo.',
        en: 'The knight is the piece that gains most from an [outpost](outpost): close up it attacks many squares and cannot be chased away. In the game Anand against Ivanchuk, from 2001, the white knight on c4 defends the pawn on a5 and attacks the square d6, and no black pawn can touch it.',
      },
      board: {
        fen: '3Rn3/R7/p3rpkp/Prp1p1p1/1pN5/1P3P1P/2P2KP1/8 w - - 0 1',
        orientation: 'white',
        highlights: ['c4'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Tu caballo de b1 quiere llegar a d5, la [casilla fuerte](outpost). ¿Con qué jugada empieza el camino más corto?',
        en: 'Your knight on b1 wants to reach d5, the [outpost](outpost). Which move starts the shortest way there?',
      },
      board: { fen: '6k1/pp2bppp/3p4/4p3/2P1P3/3B4/PP3PPP/1N4K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'El caballo a a3', en: 'The knight to a3' },
          { es: 'El caballo a d2', en: 'The knight to d2' },
          { es: 'El caballo a c3', en: 'The knight to c3' },
        ],
        correct: 2,
      },
      whyWrong: [
        {
          es: 'Desde a3 el caballo no llega a d5 en una jugada, y por b5 lo echaría el peón de a7.',
          en: 'From a3 the knight does not reach d5 in one move, and on b5 the pawn on a7 would chase it away.',
        },
        {
          es: 'Desde d2 hacen falta varios saltos más: tus propios peones de c4 y e4 le quitan las casillas.',
          en: 'From d2 it needs several more jumps: your own pawns on c4 and e4 take its squares.',
        },
        null,
      ],
      explanation: {
        es: 'Bien: de b1 a c3 y de c3 a d5, dos saltos. Antes de mover un caballo, cuenta los saltos hasta su casilla buena.',
        en: 'Well done: from b1 to c3 and from c3 to d5, two jumps. Before you move a knight, count the jumps to its good square.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Caballo o alfil: el caballo es mejor en posiciones cerradas, con los peones bloqueados, porque salta por encima de ellos. El alfil es mejor en posiciones abiertas, donde sus diagonales llegan lejos. Y los dos alfiles juntos, la [pareja de alfiles](bishop-pair), suelen ser una ventaja: entre los dos vigilan casillas de los dos colores.',
        en: 'Knight or bishop: the knight is better in closed positions, with the pawns locked, because it jumps over them. The bishop is better in open positions, where its diagonals reach far. And the two bishops together, the [bishop pair](bishop-pair), are usually an advantage: between them they watch squares of both colours.',
      },
      board: {
        fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/2BB2K1 w - - 0 1',
        orientation: 'white',
        highlights: ['c1', 'd1'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Los peones del centro están bloqueados y no se van a mover. Aquí, ¿qué pieza prefieres tener?',
        en: 'The centre pawns are locked and will not move. Here, which piece would you rather have?',
      },
      board: { fen: '6k1/pp3ppp/3p1b2/2pPp3/2P1P3/3N4/PP3PPP/6K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'El caballo', en: 'The knight' },
          { es: 'El alfil', en: 'The bishop' },
          { es: 'Da igual: valen lo mismo', en: 'It makes no difference: they are worth the same' },
        ],
        correct: 0,
      },
      whyWrong: [
        null,
        {
          es: 'El alfil negro va por casillas oscuras, las mismas en las que están bloqueados sus peones de c5, d6 y e5: le tapan el camino.',
          en: 'The black bishop runs on dark squares, the same ones its blocked pawns on c5, d6 and e5 stand on: they block its way.',
        },
        {
          es: 'Valen lo mismo en el [valor de las piezas](piece-value), pero en una posición cerrada el caballo es mejor.',
          en: 'They are worth the same in the [piece values](piece-value), but in a closed position the knight is better.',
        },
      ],
      explanation: {
        es: 'Eso es: con los peones bloqueados, el caballo salta por encima de ellos y puede ir a cualquier lado del tablero. El alfil negro, en cambio, está encerrado detrás de sus propios peones.',
        en: 'That is it: with the pawns locked, the knight jumps over them and can go to either side of the board. The black bishop, on the other hand, is shut in behind its own pawns.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'También cuenta quitarle casillas al rival. En la partida Tarrasch contra Euwe, de 1922, las blancas parecen ir mejor desarrolladas, pero las negras están mejor: la casilla d4 es un hueco que ningún peón blanco puede defender, y las negras pueden llevar allí una pieza. Las blancas no tienen nada parecido.',
        en: 'Taking squares away from the rival counts too. In the game Tarrasch against Euwe, from 1922, White seems better developed, but Black stands better: the square d4 is a hole that no white pawn can defend, and Black can bring a piece there. White has nothing like it.',
      },
      board: {
        fen: 'r1b1r1k1/pp1n1pbp/2pR1np1/4p3/2P1P3/2N1BN1P/PP3PP1/2K2B1R w - - 0 1',
        orientation: 'white',
        highlights: ['d4'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: una [casilla fuerte](outpost), de tu cuarta fila en adelante, la protege un peón tuyo y ningún peón rival la puede atacar. El caballo es quien más la aprovecha. En posiciones cerradas suele ser mejor el caballo; en las abiertas, el alfil, y la [pareja de alfiles](bishop-pair) es una ventaja. Y no dejes huecos en tu campo: el rival los usará igual.',
        en: 'Summary: an [outpost](outpost), on your fourth rank or further up, is protected by one of your pawns and no rival pawn can attack it. The knight is the piece that uses it best. In closed positions the knight is usually better; in open ones, the bishop, and the [bishop pair](bishop-pair) is an advantage. And do not leave holes in your camp: the rival will use them just the same.',
      },
      board: {
        fen: '6k1/pp3ppp/3p4/3Np3/2P1P3/8/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d5'],
      },
    },
  ],
};
