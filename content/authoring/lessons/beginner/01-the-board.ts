// Lesson 1 for beginners: the board, its ranks, files and diagonals, and the name of each square.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const theBoard: LessonSpec = {
  id: 'the-board',
  level: 'beginner',
  order: 1,
  title: { es: 'El tablero', en: 'The board' },
  summary: {
    es: 'Filas, columnas, diagonales y el nombre de cada casilla.',
    en: 'Ranks, files, diagonals and the name of every square.',
  },
  terms: ['rank', 'file', 'diagonal'],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El ajedrez se juega en un tablero de 64 casillas, ocho por ocho, que alternan claras y oscuras. Cada jugador se sienta a un lado, y el tablero se coloca con una casilla clara en la esquina de abajo a la derecha: la marcada. De las piezas hablaremos más adelante.',
        en: 'Chess is played on a board of 64 squares, eight by eight, alternating light and dark. Each player sits on one side, and the board is placed with a light square in the bottom right corner: the marked one. We will talk about the pieces later.',
      },
      board: { fen: START, orientation: 'white', highlights: ['h1'] },
    },
    {
      kind: 'explain',
      text: {
        es: 'Las líneas horizontales se llaman [filas](rank). Hay ocho, numeradas del 1 al 8 desde el lado de las blancas. Aquí está marcada la fila 4.',
        en: 'The horizontal lines are called [ranks](rank). There are eight, numbered 1 to 8 from the white side. Rank 4 is marked here.',
      },
      board: {
        fen: START,
        orientation: 'white',
        highlights: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Ahora tú: ¿qué [fila](rank) está marcada?',
        en: 'Your turn: which [rank](rank) is marked?',
      },
      board: {
        fen: START,
        orientation: 'white',
        highlights: ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'],
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'La 6', en: 'Rank 6' },
          { es: 'La 3', en: 'Rank 3' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Has contado desde arriba. Las [filas](rank) se cuentan siempre desde el lado de las blancas: la de abajo es la 1.',
          en: 'You counted from the top. [Ranks](rank) are always counted from the white side: the bottom one is rank 1.',
        },
      ],
      explanation: {
        es: 'Eso es: la 6. Las [filas](rank) se cuentan desde el lado de las blancas, de abajo arriba.',
        en: 'That is it: rank 6. [Ranks](rank) are counted from the white side, from the bottom up.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Las líneas verticales se llaman [columnas](file). También hay ocho, y se nombran con letras, de la a a la h, de izquierda a derecha según las ven las blancas. Aquí está marcada la columna c.',
        en: 'The vertical lines are called [files](file). There are eight of them too, named with letters from a to h, left to right as White sees them. The c file is marked here.',
      },
      board: {
        fen: START,
        orientation: 'white',
        highlights: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cada casilla se nombra con la letra de su [columna](file) y el número de su [fila](rank). La marcada es e4: está donde se cruzan la columna e y la fila 4. Las letras y los números vienen escritos en el borde del tablero.',
        en: 'Each square is named with the letter of its [file](file) and the number of its [rank](rank). The marked one is e4: it sits where the e file and rank 4 cross. The letters and numbers are written along the edge of the board.',
      },
      board: { fen: START, orientation: 'white', highlights: ['e4'] },
    },
    {
      kind: 'tap-square',
      text: {
        es: 'A practicar. Toca la casilla que se te pide, diez veces seguidas. Esta vez el borde no tiene letras ni números: busca la [columna](file) y la [fila](rank) de memoria. No hay prisa.',
        en: 'Time to practise. Tap the square you are asked for, ten times in a row. This time the edge has no letters or numbers: find the [file](file) and the [rank](rank) from memory. There is no rush.',
      },
      count: 10,
    },
    {
      kind: 'explain',
      text: {
        es: 'Una [diagonal](diagonal) es una línea de casillas que se tocan por las esquinas. Todas sus casillas son del mismo color. La marcada cruza el tablero de esquina a esquina, y es entera oscura.',
        en: 'A [diagonal](diagonal) is a line of squares that touch at their corners. All its squares have the same colour. The marked one crosses the board from corner to corner, and it is dark all the way.',
      },
      board: {
        fen: START,
        orientation: 'white',
        highlights: ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Sin mirar el tablero: ¿de qué color es la casilla h1?',
        en: 'Without looking at the board: what colour is the h1 square?',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'Clara', en: 'Light' },
          { es: 'Oscura', en: 'Dark' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'No. El tablero se coloca con una casilla clara abajo a la derecha, y esa esquina, para las blancas, es h1.',
          en: 'No. The board is placed with a light square in the bottom right corner, and for White that corner is h1.',
        },
      ],
      explanation: {
        es: 'Eso es: h1 es la esquina de abajo a la derecha para las blancas, y esa esquina siempre es clara. Si al preparar una partida te queda oscura, gira el tablero.',
        en: 'That is it: h1 is the bottom right corner for White, and that corner is always light. If it comes out dark when you set up a game, turn the board around.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Así empieza toda partida. Cada bando tiene 16 piezas: las blancas ocupan las [filas](rank) 1 y 2, y las negras, la 7 y la 8. Un truco para colocarlas: la dama va en su color. Las dos damas están marcadas: la blanca empieza en d1, una casilla clara, y la negra en d8, una oscura.',
        en: 'Every game starts like this. Each side has 16 pieces: White fills [ranks](rank) 1 and 2, and Black ranks 7 and 8. A trick for setting them up: the queen goes on her own colour. Both queens are marked: the white one starts on d1, a light square, and the black one on d8, a dark one.',
      },
      board: { fen: START, orientation: 'white', highlights: ['d1', 'd8'] },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el tablero tiene 64 casillas. Las [filas](rank) van en horizontal y se numeran del 1 al 8; las [columnas](file) van en vertical y se nombran de la a a la h; las [diagonales](diagonal) son líneas de un solo color. Cada casilla se llama por su columna y su fila, como e4. Y siempre, casilla clara abajo a la derecha.',
        en: 'Summary: the board has 64 squares. [Ranks](rank) run across and are numbered 1 to 8; [files](file) run up and down and are named a to h; [diagonals](diagonal) are lines of a single colour. Each square is called by its file and its rank, like e4. And always, a light square in the bottom right corner.',
      },
      board: { fen: START, orientation: 'white' },
    },
  ],
};
