// Lesson 4 for beginners: the queen, a rook and a bishop in one piece. Every minMoves comes from minReachMoves.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const queenMoves: LessonSpec = {
  id: 'queen-moves',
  level: 'beginner',
  order: 4,
  title: { es: 'La dama', en: 'The queen' },
  summary: {
    es: 'La dama se mueve como la torre y como el alfil a la vez.',
    en: 'The queen moves like the rook and the bishop at once.',
  },
  terms: [],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'La dama junta la torre y el alfil: se mueve por [filas](rank), [columnas](file) y [diagonales](diagonal), tantas casillas como quiera. Es la pieza más fuerte del tablero, pero tampoco salta. Desde d4 tiene ocho direcciones.',
        en: 'The queen combines the rook and the bishop: she moves along [ranks](rank), [files](file) and [diagonals](diagonal), as many squares as she likes. She is the strongest piece on the board, but she cannot jump either. From d4 she has eight directions.',
      },
      board: {
        fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'd4', to: 'd8' },
          { from: 'd4', to: 'h8' },
          { from: 'd4', to: 'h4' },
          { from: 'd4', to: 'g1' },
          { from: 'd4', to: 'd1' },
          { from: 'd4', to: 'a1' },
          { from: 'd4', to: 'a4' },
          { from: 'd4', to: 'a7' },
        ],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'La dama empieza detrás de sus peones, que no se mueven. Recoge las estrellas con el menor número de jugadas que puedas.',
        en: 'The queen starts behind her pawns, which do not move. Collect the stars in as few moves as you can.',
      },
      piece: { role: 'queen', color: 'white', square: 'd1' },
      targets: ['a5', 'h5', 'e8'],
      blockers: ['c2', 'd2', 'e2'],
      minMoves: 4,
      hint: {
        es: 'Hacia arriba y en [diagonal](diagonal) está tapada. Sal primero de lado, por la [fila](rank) de abajo.',
        en: 'Up and along the [diagonals](diagonal) she is blocked. First go sideways, along the bottom [rank](rank).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Aunque sea tan fuerte, a la dama también la pueden capturar. El alfil negro de f5 ataca las casillas marcadas: si la dama se para en una, el alfil se la come.',
        en: 'Strong as she is, the queen can be captured too. The black bishop on f5 attacks the marked squares: if the queen stops on one, the bishop takes her.',
      },
      board: {
        fen: '4k3/8/8/5b2/8/8/8/Q3K3 w - - 0 1',
        orientation: 'white',
        highlights: ['e4', 'd3', 'c2', 'b1', 'g4', 'h3', 'e6', 'd7', 'c8', 'g6', 'h7'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Una torre y un alfil negros vigilan el tablero. Recoge las estrellas sin pararte en ninguna casilla que ataquen.',
        en: 'A black rook and a black bishop are watching the board. Collect the stars without stopping on any square they attack.',
      },
      piece: { role: 'queen', color: 'white', square: 'd1' },
      targets: ['h7', 'b6'],
      enemies: [
        { role: 'rook', square: 'f4' },
        { role: 'bishop', square: 'c4' },
      ],
      minMoves: 4,
      hint: {
        es: 'La [columna](file) b es un buen pasillo. A veces conviene volver por donde has venido.',
        en: 'The b [file](file) is a good corridor. Sometimes it pays to go back the way you came.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Con el tablero vacío a su alrededor, ¿en cuántas direcciones puede moverse la dama?',
        en: 'With an empty board around her, in how many directions can the queen move?',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'Cuatro', en: 'Four' },
          { es: 'Ocho', en: 'Eight' },
          { es: 'Dos', en: 'Two' },
        ],
        correct: 1,
      },
      whyWrong: [
        {
          es: 'Cuatro son las de la torre, o las del alfil. La dama tiene las dos cosas.',
          en: 'Four are the rook’s directions, or the bishop’s. The queen has both.',
        },
        null, // correct option: no whyWrong
        {
          es: 'Muy pocas. Piensa en la torre y en el alfil juntos.',
          en: 'Far too few. Think of the rook and the bishop together.',
        },
      ],
      explanation: {
        es: 'Ocho: cuatro en línea recta, como la torre, y cuatro en [diagonal](diagonal), como el alfil.',
        en: 'Eight: four in straight lines, like the rook, and four along the [diagonals](diagonal), like the bishop.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: la dama va en línea recta y en [diagonal](diagonal), tan lejos como quiera, y no salta. Cada bando tiene una, y empieza en su color: la blanca en d1 y la negra en d8.',
        en: 'Summary: the queen goes in straight lines and along [diagonals](diagonal), as far as she likes, and she does not jump. Each side has one, and she starts on her own colour: the white queen on d1 and the black queen on d8.',
      },
      board: { fen: START, orientation: 'white', highlights: ['d1', 'd8'] },
    },
  ],
};
