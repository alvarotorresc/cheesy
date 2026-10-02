// Lesson 2 for beginners: how the rook moves, and what blocks or attacks it. Every minMoves comes from minReachMoves.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const rookMoves: LessonSpec = {
  id: 'rook-moves',
  level: 'beginner',
  order: 2,
  title: { es: 'La torre', en: 'The rook' },
  summary: {
    es: 'La torre va en línea recta, tan lejos como quiera.',
    en: 'The rook goes in a straight line, as far as it likes.',
  },
  terms: [],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'La torre se mueve en línea recta por [filas](rank) y [columnas](file): hacia delante, hacia atrás o de lado, tantas casillas como quiera. Desde d4 puede ir a cualquier casilla de las flechas. Las otras dos piezas son los reyes: de momento, no te fijes en ellos.',
        en: 'The rook moves in a straight line along [ranks](rank) and [files](file): forwards, backwards or sideways, as many squares as it likes. From d4 it can go to any square along the arrows. The other two pieces are the kings: ignore them for now.',
      },
      board: {
        fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'd4', to: 'd8' },
          { from: 'd4', to: 'd1' },
          { from: 'd4', to: 'a4' },
          { from: 'd4', to: 'h4' },
        ],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Recoge las estrellas con la torre, en el orden que quieras. Cada jugada puede ser tan larga como quieras, así que intenta usar pocas: el contador te dice el mínimo.',
        en: 'Collect the stars with the rook, in any order. Each move can be as long as you like, so try to use few: the counter tells you the minimum.',
      },
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['a6', 'f6', 'f2'],
      minMoves: 3,
      hint: {
        es: 'Sube primero por la [columna](file) hasta la estrella de arriba y luego ve de lado.',
        en: 'First go up the [file](file) to the top star, then go sideways.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La torre no puede saltar. Si una pieza de su mismo color le corta el paso, se para antes: aquí el peón blanco de d6 no la deja pasar de d5. Las casillas marcadas son todas las que tiene.',
        en: 'The rook cannot jump. If a piece of its own colour is in the way, it stops before it: here the white pawn on d6 does not let it past d5. The marked squares are all the ones it has.',
      },
      board: {
        fen: '4k3/8/3P4/8/3R4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['d5', 'd3', 'd2', 'd1', 'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4'],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Ahora hay peones blancos que no se mueven. La torre no puede pisarlos ni pasar por encima. Busca otro camino hasta la estrella.',
        en: 'Now there are white pawns that do not move. The rook cannot step on them or pass over them. Find another way to the star.',
      },
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['a8'],
      blockers: ['a4', 'c1'],
      minMoves: 3,
      hint: {
        es: 'Por su [columna](file) no puede subir. Da un paso a la derecha y sube por la columna de al lado.',
        en: 'It cannot go up its own [file](file). Take one step right and go up the next file.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una pieza rival ataca casillas: si tu torre se para en una de ellas, la rival se la come. La torre negra de c5 ataca su [fila](rank) y su [columna](file), que son las casillas marcadas. Puedes pasar por ellas en mitad de una jugada; lo que no puedes es pararte.',
        en: 'A rival piece attacks squares: if your rook stops on one of them, the rival takes it. The black rook on c5 attacks its [rank](rank) and its [file](file), which are the marked squares. You can pass through them in the middle of a move; what you cannot do is stop on them.',
      },
      board: {
        fen: '4k3/8/8/2r5/8/8/8/R3K3 w - - 0 1',
        orientation: 'white',
        highlights: [
          'c1',
          'c2',
          'c3',
          'c4',
          'c6',
          'c7',
          'c8',
          'a5',
          'b5',
          'd5',
          'e5',
          'f5',
          'g5',
          'h5',
        ],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Recoge las estrellas sin pararte en ninguna casilla que ataque la torre negra. Si te paras en una, te captura y empiezas de nuevo.',
        en: 'Collect the stars without stopping on any square the black rook attacks. If you stop on one, it captures you and you start again.',
      },
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['c8', 'h3'],
      enemies: [{ role: 'rook', square: 'd5' }],
      minMoves: 4,
      hint: {
        es: 'Evita la [fila](rank) 5 y la [columna](file) d. Cruzarlas en mitad de una jugada sí vale.',
        en: 'Avoid [rank](rank) 5 and the d [file](file). Crossing them in the middle of a move is fine.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: la torre va en línea recta por [filas](rank) y [columnas](file), tan lejos como quiera, y no salta. No puede pararse en una casilla atacada sin que la capturen. Cada bando empieza con dos torres, en las esquinas: las marcadas.',
        en: 'Summary: the rook goes in a straight line along [ranks](rank) and [files](file), as far as it likes, and it does not jump. It cannot stop on an attacked square without being captured. Each side starts with two rooks, in the corners: the marked ones.',
      },
      board: { fen: START, orientation: 'white', highlights: ['a1', 'h1', 'a8', 'h8'] },
    },
  ],
};
