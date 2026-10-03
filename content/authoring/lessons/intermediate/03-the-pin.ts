// Lesson 3 for intermediates: the pin, absolute and relative, and how to use it.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_INTERMEDIATE,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_TACTICS,
} from './sources.ts';

const ABSOLUTE_PIN = '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1';

export const thePin: LessonSpec = {
  id: 'the-pin',
  level: 'intermediate',
  order: 3,
  title: { es: 'La clavada', en: 'The pin' },
  summary: {
    es: 'Una pieza que no puede moverse sin dejar algo más valioso al descubierto.',
    en: 'A piece that cannot move without exposing something worth more.',
  },
  terms: ['pin'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Hay una [clavada](pin) cuando una pieza no puede moverse porque detrás de ella, en la misma línea, hay otra más valiosa. Si la de detrás es el rey, la clavada es absoluta: mover la pieza clavada dejaría al rey en [jaque](check), y eso no está permitido. Aquí el caballo de c6 no puede moverse: detrás está el rey de e8.',
        en: 'There is a [pin](pin) when a piece cannot move because behind it, on the same line, stands a more valuable one. If the piece behind is the king, the pin is absolute: moving the pinned piece would leave the king in [check](check), and that is not allowed. Here the knight on c6 cannot move: the king on e8 is behind it.',
      },
      board: {
        fen: ABSOLUTE_PIN,
        orientation: 'white',
        highlights: ['c6', 'e8'],
        arrows: [{ from: 'b5', to: 'e8' }],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si detrás no está el rey sino otra pieza valiosa, como la dama, la clavada es relativa: la pieza clavada puede moverse, pero entonces se pierde lo de detrás. Aquí, si el caballo de f6 se aparta, el alfil captura la dama de d8.',
        en: 'If what stands behind is not the king but another valuable piece, such as the queen, the pin is relative: the pinned piece may move, but then the piece behind is lost. Here, if the knight on f6 steps aside, the bishop captures the queen on d8.',
      },
      board: {
        fen: '3qk3/8/5n2/6B1/8/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['f6', 'd8'],
        arrows: [{ from: 'g5', to: 'd8' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Clava la dama negra contra su rey.',
        en: 'Pin the black queen to her king.',
      },
      board: {
        fen: 'r3k2r/pp1q1ppp/3bpn2/8/8/2N5/PPQ1BPPP/R4RK1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Bb5'] },
      hint: {
        es: 'La dama de d7 y el rey de e8 están en la misma [diagonal](diagonal).',
        en: 'The queen on d7 and the king on e8 stand on the same [diagonal](diagonal).',
      },
      explanation: {
        es: 'Bien: el alfil de b5 clava la dama. No puede apartarse, y si captura el alfil, tu caballo de c3 la captura a ella. Ganas la dama por un alfil.',
        en: 'Well done: the bishop on b5 pins the queen. She cannot step aside, and if she takes the bishop, your knight on c3 takes her. You win the queen for a bishop.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El caballo de c6 está clavado contra el rey. Atácalo otra vez, esta vez con un peón.',
        en: 'The knight on c6 is pinned to the king. Attack it again, this time with a pawn.',
      },
      board: {
        fen: 'r2qk2r/ppp1ppbp/2n2np1/1B6/2PP4/8/PP1NQPPP/R1B2RK1 w k - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['d5'] },
      hint: {
        es: 'Un peón que avanza ataca las dos casillas que tiene delante en [diagonal](diagonal).',
        en: 'A pawn that advances attacks the two squares in front of it on the [diagonal](diagonal).',
      },
      explanation: {
        es: 'Eso es: el peón ataca al caballo, y el caballo no puede huir porque está clavado. Las negras pierden una pieza. Había que darse prisa: si esperas, el rey negro hace el [enroque](castling) y la clavada desaparece.',
        en: 'That is it: the pawn attacks the knight, and the knight cannot run because it is pinned. Black loses a piece. You had to hurry: if you wait, the black king plays [castling](castling) and the pin is gone.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'El caballo de f6 está clavado contra la dama. ¿Qué jugada aprovecha la clavada?',
        en: 'The knight on f6 is pinned to the queen. Which move takes advantage of the pin?',
      },
      board: {
        fen: 'rnbq1rk1/ppp2ppp/3p1n2/6B1/3PP3/2NB4/PPP1QPPP/R4RK1 w - - 0 1',
        orientation: 'white',
      },
      answer: { by: 'engine', options: ['e5', 'Bxf6', 'h3'], correct: 0 },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Cambias tu alfil por el caballo y la clavada desaparece, pero no ganas nada.',
          en: 'You trade your bishop for the knight and the pin is gone, but you win nothing.',
        },
        {
          es: 'Es una jugada tranquila: no ataca nada, y el rival tiene tiempo de deshacer la clavada.',
          en: 'It is a quiet move: it attacks nothing, and your opponent has time to undo the pin.',
        },
      ],
      explanation: {
        es: 'Eso es: el peón ataca al caballo clavado. Si el caballo se aparta, el alfil captura la dama; si se queda, el peón lo captura.',
        en: 'That is it: the pawn attacks the pinned knight. If the knight steps aside, the bishop takes the queen; if it stays, the pawn takes it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Para deshacer una clavada hay tres caminos: apartar la pieza de detrás, tapar la línea con otra pieza o atacar a la pieza que clava. Aquí el peón negro avanza a h6 y ataca al alfil que clava el caballo.',
        en: 'There are three ways to undo a pin: move the piece behind out of the way, block the line with another piece, or attack the piece that pins. Here the black pawn advances to h6 and attacks the bishop pinning the knight.',
      },
      board: {
        fen: '3qk3/7p/5n2/6B1/8/8/8/4K3 b - - 0 1',
        orientation: 'white',
        moves: ['h6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El caballo de c6 está clavado y nadie lo defiende. Gánalo antes de que el rival deshaga la clavada.',
        en: 'The knight on c6 is pinned and nobody defends it. Win it before your opponent undoes the pin.',
      },
      board: { fen: '2b1k2r/p1p2ppp/2n1p3/1B6/8/8/PP3PPP/RN4K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Bxc6+'] },
      hint: {
        es: 'Si esperas, el alfil negro de c8 puede ir a d7: tapa la clavada y defiende el caballo.',
        en: 'If you wait, the black bishop on c8 can go to d7: it blocks the pin and defends the knight.',
      },
      explanation: {
        es: 'Bien: capturas el caballo con [jaque](check). Si hubieras esperado, el alfil negro habría ido a d7 para tapar la clavada y defender el caballo.',
        en: 'Well done: you capture the knight with [check](check). Had you waited, the black bishop would have gone to d7 to block the pin and defend the knight.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en una [clavada](pin), la pieza de delante no puede moverse sin dejar al descubierto otra más valiosa. Si detrás está el rey, ni siquiera puede moverse. Aprovéchala atacando otra vez a la pieza clavada, a ser posible con un peón, y date prisa: el rival intentará deshacerla.',
        en: 'Summary: in a [pin](pin), the piece in front cannot move without exposing a more valuable one. If the king is behind, it cannot move at all. Take advantage of it by attacking the pinned piece again, with a pawn if you can, and hurry: your opponent will try to undo it.',
      },
      board: {
        fen: ABSOLUTE_PIN,
        orientation: 'white',
        highlights: ['c6', 'e8'],
        arrows: [{ from: 'b5', to: 'e8' }],
      },
    },
  ],
  next: { kind: 'positions', tag: 'pin' },
};
