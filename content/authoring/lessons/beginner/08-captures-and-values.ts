// Lesson 8 for beginners: capturing, defended pieces and the usual piece values.
import type { LessonSpec } from '../../../types.ts';

const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_VALUES = 'https://en.wikipedia.org/wiki/Chess_piece_relative_value';

export const capturesAndValues: LessonSpec = {
  id: 'captures-and-values',
  level: 'beginner',
  order: 8,
  title: { es: 'Capturar y el valor de las piezas', en: 'Capturing and piece values' },
  summary: {
    es: 'Cómo se captura, cuándo conviene y cuánto vale cada pieza.',
    en: 'How to capture, when it pays and what each piece is worth.',
  },
  terms: ['piece-value'],
  sources: [FIDE, WIKI_VALUES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Capturar es mover una pieza a la casilla de una pieza rival: la rival sale del tablero. Todas las piezas capturan igual que se mueven, salvo el peón. Aquí la torre de d1 captura el caballo de d6.',
        en: 'Capturing means moving a piece onto the square of a rival piece: the rival piece leaves the board. Every piece captures the way it moves, except the pawn. Here the rook on d1 captures the knight on d6.',
      },
      board: { fen: '4k3/8/3n4/8/8/8/8/3RK3 w - - 0 1', orientation: 'white', moves: ['Rxd6'] },
    },
    {
      kind: 'explain',
      text: {
        es: 'Antes de capturar, mira si la pieza está defendida. Aquí el peón de d6 está defendido por el de e7: si la torre lo captura, el peón de e7 captura la torre. Has dado una torre por un peón.',
        en: 'Before capturing, see whether the piece is defended. Here the pawn on d6 is defended by the one on e7: if the rook captures it, the pawn on e7 captures the rook. You have given a rook for a pawn.',
      },
      board: {
        fen: '4k3/4p3/3p4/8/8/8/8/3RK3 w - - 0 1',
        orientation: 'white',
        moves: ['Rxd6', 'exd6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu caballo puede capturar dos piezas. Una está defendida y la otra no. Captura la que nadie defiende.',
        en: 'Your knight can capture two pieces. One is defended and the other is not. Capture the one nobody defends.',
      },
      board: { fen: '1k6/2p5/3b1r2/8/4N3/8/8/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'capture-undefended' },
      wrong: {
        Nxd6: {
          es: 'Ese alfil está defendido: el peón de c7 capturaría tu caballo.',
          en: 'That bishop is defended: the pawn on c7 would capture your knight.',
        },
      },
      hint: {
        es: 'Para cada pieza, busca si alguna pieza negra podría capturar en su casilla.',
        en: 'For each piece, look for a black piece that could capture on its square.',
      },
      explanation: {
        es: 'Bien: nadie defendía la torre de f6, así que la ganas gratis.',
        en: 'Well done: nobody defended the rook on f6, so you win it for free.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Para decidir qué capturar, ayuda conocer el [valor de las piezas](piece-value). Es una costumbre, no una regla del juego: peón 1, caballo 3, alfil 3, torre 5 y dama 9. Las piezas marcadas están en ese orden. El rey no se cuenta: nunca se captura, y la partida gira a su alrededor.',
        en: 'To decide what to capture, it helps to know the [piece values](piece-value). They are a custom, not a rule of the game: pawn 1, knight 3, bishop 3, rook 5 and queen 9. The marked pieces are in that order. The king is not counted: he is never captured, and the whole game revolves around him.',
      },
      board: {
        fen: '7k/8/8/8/8/8/P7/1NBRQK2 w - - 0 1',
        orientation: 'white',
        highlights: ['a2', 'b1', 'c1', 'd1', 'e1'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Qué vale más, un alfil o una torre?',
        en: 'Which is worth more, a bishop or a rook?',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'La torre', en: 'The rook' },
          { es: 'El alfil', en: 'The bishop' },
          { es: 'Valen lo mismo', en: 'They are worth the same' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Al revés: el alfil vale 3 y la torre 5.',
          en: 'The other way round: the bishop is worth 3 and the rook 5.',
        },
        {
          es: 'No: el alfil vale 3 y la torre 5. Una torre vale más o menos lo que un alfil y dos peones.',
          en: 'No: the bishop is worth 3 and the rook 5. A rook is worth about as much as a bishop and two pawns.',
        },
      ],
      explanation: {
        es: 'Eso es: la torre vale 5 y el alfil 3. Dar tu alfil a cambio de una torre rival es buen negocio.',
        en: 'That is it: the rook is worth 5 and the bishop 3. Giving your bishop for a rival rook is a good deal.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu alfil puede capturar una torre o un peón, y ninguno de los dos está defendido. Captura el que más vale.',
        en: 'Your bishop can capture a rook or a pawn, and neither of them is defended. Capture the one worth more.',
      },
      board: { fen: '6k1/5ppp/r7/3p3n/2B5/8/5PPP/3R2K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Bxa6'] },
      wrong: {
        Bxd5: {
          es: 'Ese peón vale 1. La torre vale 5, y también estaba sin defender.',
          en: 'That pawn is worth 1. The rook is worth 5, and it was undefended too.',
        },
        Rxd5: {
          es: 'Con la torre ganas un peón, que vale 1. Con el alfil podías ganar una torre, que vale 5.',
          en: 'With the rook you win a pawn, worth 1. With the bishop you could win a rook, worth 5.',
        },
      },
      hint: {
        es: 'Sigue las [diagonales](diagonal) del alfil hasta el borde izquierdo.',
        en: 'Follow the bishop’s [diagonals](diagonal) to the left edge.',
      },
      explanation: {
        es: 'Bien: una torre vale 5 y un peón 1. Si puedes capturar gratis dos piezas, elige la que más vale.',
        en: 'Well done: a rook is worth 5 and a pawn 1. If you can capture two pieces for free, choose the one worth more.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: capturar es ocupar la casilla de una pieza rival, que sale del tablero. Antes de capturar, mira si la pieza está defendida. Y usa el [valor de las piezas](piece-value) para elegir: peón 1, caballo 3, alfil 3, torre 5 y dama 9.',
        en: 'Summary: capturing means taking the square of a rival piece, which leaves the board. Before capturing, see whether the piece is defended. And use the [piece values](piece-value) to choose: pawn 1, knight 3, bishop 3, rook 5 and queen 9.',
      },
      board: {
        fen: '7k/8/8/8/8/8/P7/1NBRQK2 w - - 0 1',
        orientation: 'white',
        highlights: ['a2', 'b1', 'c1', 'd1', 'e1'],
      },
    },
  ],
};
