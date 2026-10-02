// Lesson 5 for beginners: the king, one square at a time and never onto an attacked square. Every minMoves comes from minReachMoves.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const kingMoves: LessonSpec = {
  id: 'king-moves',
  level: 'beginner',
  order: 5,
  title: { es: 'El rey', en: 'The king' },
  summary: {
    es: 'El rey va de casilla en casilla y nunca a una casilla atacada.',
    en: 'The king moves one square at a time and never onto an attacked square.',
  },
  terms: [],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El rey se mueve una sola casilla, en cualquier dirección: en línea recta o en [diagonal](diagonal). Es lento, pero es la pieza más importante: la partida gira a su alrededor. Desde d4 tiene las ocho casillas marcadas.',
        en: 'The king moves just one square, in any direction: in a straight line or along a [diagonal](diagonal). He is slow, but he is the most important piece: the whole game revolves around him. From d4 he has the eight marked squares.',
      },
      board: {
        fen: '4k3/8/8/8/3K4/8/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['c3', 'd3', 'e3', 'c4', 'e4', 'c5', 'd5', 'e5'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Recoge las estrellas con el rey. Solo avanza una casilla por jugada, así que cada paso cuenta.',
        en: 'Collect the stars with the king. He only goes one square per move, so every step counts.',
      },
      piece: { role: 'king', color: 'white', square: 'e1' },
      targets: ['e3', 'g3'],
      minMoves: 4,
      hint: {
        es: 'Moverse en [diagonal](diagonal) avanza igual de rápido que en línea recta.',
        en: 'Moving along a [diagonal](diagonal) is just as fast as moving straight.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Hay una regla que solo tiene el rey: nunca puede ir a una casilla atacada por una pieza rival. Aquí la torre negra ataca la [columna](file) e, así que el rey no puede ir a e3, e4 ni e5. Eso sería meterse en [jaque](check), y está prohibido.',
        en: 'There is a rule only the king has: he can never move to a square attacked by a rival piece. Here the black rook attacks the e [file](file), so the king cannot go to e3, e4 or e5. That would be walking into [check](check), which is not allowed.',
      },
      board: {
        fen: '4r2k/8/8/8/3K4/8/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['e3', 'e4', 'e5'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Lleva el rey hasta la estrella sin pisar ninguna casilla que ataque la torre negra. El peón blanco no se mueve, pero le tapa el paso a la torre.',
        en: 'Take the king to the star without stepping on any square the black rook attacks. The white pawn does not move, but it blocks the rook’s path.',
      },
      piece: { role: 'king', color: 'white', square: 'c6' },
      targets: ['g6'],
      blockers: ['e5'],
      enemies: [{ role: 'rook', square: 'e8' }],
      minMoves: 4,
      hint: {
        es: 'La torre ataca la [columna](file) e solo hasta el peón. Cruza por debajo de él.',
        en: 'The rook attacks the e [file](file) only as far as the pawn. Cross below it.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Los dos reyes están separados por una casilla, la marcada. ¿Puede alguno de ellos pisarla?',
        en: 'The two kings are one square apart, with the marked square between them. Can either of them step onto it?',
      },
      board: {
        fen: '8/8/8/3k4/8/3K4/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['d4'],
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'No, ninguno de los dos', en: 'No, neither of them' },
          { es: 'Sí, el que juegue primero', en: 'Yes, whichever moves first' },
          { es: 'Sí, pero solo el blanco', en: 'Yes, but only White' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Da igual quién juegue: el rey que la pisara quedaría junto al otro rey, en una casilla atacada.',
          en: 'It does not matter who moves: the king that stepped there would stand next to the other king, on an attacked square.',
        },
        {
          es: 'La regla es igual para los dos colores. Cada rey ataca esa casilla, así que ninguno puede ir.',
          en: 'The rule is the same for both colours. Each king attacks that square, so neither can go there.',
        },
      ],
      explanation: {
        es: 'Cada rey ataca todas las casillas que tiene alrededor. El que pisara la casilla marcada se metería en una casilla atacada por el otro rey, y eso está prohibido. Por eso entre los dos reyes siempre queda al menos una casilla.',
        en: 'Each king attacks every square around him. The one that stepped onto the marked square would walk onto a square attacked by the other king, which is not allowed. That is why there is always at least one square between the two kings.',
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'El rey negro está en medio del camino y no se mueve. Llega a la estrella sin pisar ninguna casilla de su alrededor.',
        en: 'The black king is in the way and does not move. Reach the star without stepping on any square around him.',
      },
      piece: { role: 'king', color: 'white', square: 'b2' },
      targets: ['f2'],
      enemies: [{ role: 'king', square: 'd3' }],
      minMoves: 4,
      hint: {
        es: 'El camino recto pasa junto a él. Rodéalo por la [fila](rank) de abajo.',
        en: 'The straight way passes next to him. Go round him along the bottom [rank](rank).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el rey va una casilla en cualquier dirección y nunca a una casilla atacada. Por eso los dos reyes nunca se tocan. Cada bando tiene uno, y empieza en la [columna](file) e: el blanco en e1 y el negro en e8.',
        en: 'Summary: the king goes one square in any direction and never to an attacked square. That is why the two kings never touch. Each side has one, and he starts on the e [file](file): the white king on e1 and the black king on e8.',
      },
      board: { fen: START, orientation: 'white', highlights: ['e1', 'e8'] },
    },
  ],
};
