// Lesson 6 for beginners: how the knight moves and jumps. Every minMoves comes from minReachMoves.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const knightMoves: LessonSpec = {
  id: 'knight-moves',
  level: 'beginner',
  order: 6,
  title: { es: 'El caballo', en: 'The knight' },
  summary: {
    es: 'El caballo salta en forma de L por encima de las demás piezas.',
    en: 'The knight jumps in an L shape over the other pieces.',
  },
  terms: [],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El caballo se mueve en forma de L: dos casillas en línea recta y luego una hacia un lado. Desde d4 tiene las ocho casillas de las flechas. Fíjate: cada vez que salta, cambia de color de casilla.',
        en: 'The knight moves in an L shape: two squares in a straight line and then one to the side. From d4 it has the eight squares at the ends of the arrows. Notice that every time it jumps, it changes square colour.',
      },
      board: {
        fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'd4', to: 'c6' },
          { from: 'd4', to: 'e6' },
          { from: 'd4', to: 'f5' },
          { from: 'd4', to: 'f3' },
          { from: 'd4', to: 'e2' },
          { from: 'd4', to: 'c2' },
          { from: 'd4', to: 'b3' },
          { from: 'd4', to: 'b5' },
        ],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Recoge las estrellas con el caballo. Cuenta la L antes de mover: dos y una.',
        en: 'Collect the stars with the knight. Count the L before you move: two and one.',
      },
      piece: { role: 'knight', color: 'white', square: 'g1' },
      targets: ['f3', 'e5'],
      minMoves: 2,
    },
    {
      kind: 'explain',
      text: {
        es: 'El caballo es la única pieza que salta por encima de las demás, sean suyas o del rival. Por eso, al empezar la partida, puede salir por encima de sus peones.',
        en: 'The knight is the only piece that jumps over the others, its own or the opponent’s. That is why, at the start of the game, it can come out over its pawns.',
      },
      board: { fen: START, orientation: 'white', moves: ['Nf3'] },
    },
    {
      kind: 'reach',
      text: {
        es: 'El caballo está rodeado de peones blancos que no se mueven. No puede pisarlos, pero sí saltarlos.',
        en: 'The knight is surrounded by white pawns that do not move. It cannot step on them, but it can jump over them.',
      },
      piece: { role: 'knight', color: 'white', square: 'e4' },
      targets: ['f6', 'c3'],
      blockers: ['d3', 'e3', 'f3', 'd4', 'f4', 'd5', 'e5', 'f5'],
      minMoves: 3,
      hint: {
        es: 'Las dos estrellas no están a un salto la una de la otra. Puedes volver a la casilla del centro.',
        en: 'The two stars are not one jump apart. You can go back to the centre square.',
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Un alfil negro ataca sus dos [diagonales](diagonal). Llega a la estrella sin pararte en ninguna de sus casillas.',
        en: 'A black bishop attacks its two [diagonals](diagonal). Reach the star without stopping on any of its squares.',
      },
      piece: { role: 'knight', color: 'white', square: 'b1' },
      targets: ['e6'],
      enemies: [{ role: 'bishop', square: 'e5' }],
      minMoves: 4,
      hint: {
        es: 'Cuidado con c3, que está vigilada: sal por d2.',
        en: 'Careful with c3, it is watched: start with d2.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'En el borde, el caballo tiene menos saltos. En una esquina, solo le quedan dos: desde a1 puede ir a b3 o a c2. Por eso un caballo en el borde suele estar peor que uno en el centro.',
        en: 'On the edge, the knight has fewer jumps. In a corner it has only two: from a1 it can go to b3 or to c2. That is why a knight on the edge is usually worse off than one in the centre.',
      },
      board: {
        fen: '4k3/8/8/8/8/8/8/N3K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'a1', to: 'b3' },
          { from: 'a1', to: 'c2' },
        ],
      },
    },
    {
      kind: 'reach',
      text: {
        es: 'Un recorrido clásico: lleva el caballo de una esquina a la contraria. Parece un camino recto, pero el caballo necesita varios saltos.',
        en: 'A classic journey: take the knight from one corner to the opposite one. It looks like a straight line, but the knight needs several jumps.',
      },
      piece: { role: 'knight', color: 'white', square: 'a1' },
      targets: ['h8'],
      minMoves: 6,
      hint: {
        es: 'Piensa al revés: a h8 solo se llega desde g6 o desde f7. Busca primero el camino hasta una de esas dos.',
        en: 'Think backwards: h8 can only be reached from g6 or f7. First find the way to one of those two.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el caballo salta en L, dos casillas y una, por encima de lo que haya en medio. Siempre cambia de color de casilla, y en el centro tiene más saltos que en el borde. Cada bando empieza con dos, entre las torres y los alfiles: los marcados.',
        en: 'Summary: the knight jumps in an L, two squares and one, over whatever is in between. It always changes square colour, and it has more jumps in the centre than on the edge. Each side starts with two, between the rooks and the bishops: the marked ones.',
      },
      board: { fen: START, orientation: 'white', highlights: ['b1', 'g1', 'b8', 'g8'] },
    },
  ],
};
