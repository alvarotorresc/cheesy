// Lesson 3 for beginners: how the bishop moves and why it keeps its square colour. Every minMoves comes from minReachMoves.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const bishopMoves: LessonSpec = {
  id: 'bishop-moves',
  level: 'beginner',
  order: 3,
  title: { es: 'El alfil', en: 'The bishop' },
  summary: {
    es: 'El alfil va en diagonal y nunca cambia de color de casilla.',
    en: 'The bishop moves diagonally and never changes square colour.',
  },
  terms: [],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El alfil se mueve en [diagonal](diagonal), hacia delante o hacia atrás, tantas casillas como quiera. Como la torre, no puede saltar. Desde d4 llega a cualquier casilla de las flechas.',
        en: 'The bishop moves along a [diagonal](diagonal), forwards or backwards, as many squares as it likes. Like the rook, it cannot jump. From d4 it can reach any square along the arrows.',
      },
      board: {
        fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'd4', to: 'h8' },
          { from: 'd4', to: 'a7' },
          { from: 'd4', to: 'a1' },
          { from: 'd4', to: 'g1' },
        ],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Fíjate en las casillas marcadas: todas son oscuras. Una [diagonal](diagonal) nunca cambia de color, así que este alfil, que está en d4, no pisará jamás una casilla clara. Por eso cada bando tiene dos alfiles: uno para las casillas claras y otro para las oscuras.',
        en: 'Look at the marked squares: they are all dark. A [diagonal](diagonal) never changes colour, so this bishop, standing on d4, will never step on a light square. That is why each side has two bishops: one for the light squares and one for the dark ones.',
      },
      board: {
        fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['e5', 'f6', 'g7', 'h8', 'c5', 'b6', 'a7', 'e3', 'f2', 'g1', 'c3', 'b2', 'a1'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Recoge las estrellas con el alfil. Todas están en casillas oscuras, como él.',
        en: 'Collect the stars with the bishop. They are all on dark squares, like the bishop.',
      },
      piece: { role: 'bishop', color: 'white', square: 'c1' },
      targets: ['a3', 'f8', 'h6'],
      minMoves: 3,
      hint: {
        es: 'Sigue cada [diagonal](diagonal) con la vista antes de mover: desde la estrella de la izquierda sale una que sube hasta arriba.',
        en: 'Follow each [diagonal](diagonal) with your eyes before moving: from the star on the left, one runs all the way to the top.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Un alfil está en una casilla clara. ¿Podrá llegar alguna vez a una casilla oscura?',
        en: 'A bishop stands on a light square. Will it ever reach a dark square?',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'No, nunca', en: 'No, never' },
          { es: 'Sí, dando un rodeo', en: 'Yes, by going the long way round' },
          { es: 'Sí, si se lo permite otra pieza', en: 'Yes, if another piece lets it' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Ningún rodeo sirve: cada jugada del alfil sigue una [diagonal](diagonal), y todas sus casillas son del mismo color.',
          en: 'No detour helps: every bishop move follows a [diagonal](diagonal), and all its squares have the same colour.',
        },
        {
          es: 'Las demás piezas solo pueden cortarle el paso, no cambiar cómo se mueve. Sigue en su [diagonal](diagonal), del mismo color.',
          en: 'Other pieces can only block its way, not change how it moves. It stays on its [diagonal](diagonal), of the same colour.',
        },
      ],
      explanation: {
        es: 'Correcto. Cada jugada del alfil sigue una [diagonal](diagonal), y en una diagonal todas las casillas son del mismo color. Un alfil de casillas claras se queda en las claras toda la partida.',
        en: 'Right. Every bishop move follows a [diagonal](diagonal), and all the squares of a diagonal have the same colour. A light-squared bishop stays on the light squares for the whole game.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si una pieza de su color está en el camino, el alfil se para antes. Aquí el peón de e2 le tapa una [diagonal](diagonal), y solo le quedan g2 y h3.',
        en: 'If a piece of its own colour is in the way, the bishop stops before it. Here the pawn on e2 blocks one [diagonal](diagonal), and it only has g2 and h3 left.',
      },
      board: {
        fen: '4k3/8/8/8/8/8/4P3/4KB2 w - - 0 1',
        orientation: 'white',
        highlights: ['g2', 'h3'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'El peón de e2 no se mueve y el alfil no puede saltarlo. Llega a la estrella por otro camino.',
        en: 'The pawn on e2 does not move and the bishop cannot jump over it. Reach the star another way.',
      },
      piece: { role: 'bishop', color: 'white', square: 'f1' },
      targets: ['a6'],
      blockers: ['e2'],
      minMoves: 3,
      hint: {
        es: 'Sal por el otro lado, hacia g2, y busca desde allí una [diagonal](diagonal) larga que cruce el tablero.',
        en: 'Leave by the other side, towards g2, and look from there for a long [diagonal](diagonal) that crosses the board.',
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Ahora hay una torre negra. No te pares en ninguna casilla de su [fila](rank) ni de su [columna](file): te capturaría.',
        en: 'Now there is a black rook. Do not stop on any square of its [rank](rank) or its [file](file): it would capture you.',
      },
      piece: { role: 'bishop', color: 'white', square: 'c1' },
      targets: ['h6', 'b8'],
      enemies: [{ role: 'rook', square: 'e7' }],
      minMoves: 3,
      hint: {
        es: 'Pasar por una casilla atacada en mitad de una jugada sí vale. Lo que cuenta es dónde te paras.',
        en: 'Passing through an attacked square in the middle of a move is fine. What counts is where you stop.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el alfil va en [diagonal](diagonal), tan lejos como quiera, y no salta. Nunca cambia de color de casilla. Cada bando empieza con dos alfiles, junto al rey y a la dama: los marcados.',
        en: 'Summary: the bishop moves along a [diagonal](diagonal), as far as it likes, and it does not jump. It never changes square colour. Each side starts with two bishops, next to the king and the queen: the marked ones.',
      },
      board: { fen: START, orientation: 'white', highlights: ['c1', 'f1', 'c8', 'f8'] },
    },
  ],
};
