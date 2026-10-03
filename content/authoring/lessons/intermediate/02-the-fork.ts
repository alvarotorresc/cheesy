// Lesson 2 for intermediates: the fork, one piece attacking two at once.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_INTERMEDIATE,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_TACTICS,
} from './sources.ts';

const KNIGHT_FORK = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1';

export const theFork: LessonSpec = {
  id: 'the-fork',
  level: 'intermediate',
  order: 2,
  title: { es: 'La horquilla', en: 'The fork' },
  summary: {
    es: 'Una pieza ataca a dos a la vez, y el rival solo puede salvar una.',
    en: 'One piece attacks two at once, and the opponent can only save one.',
  },
  terms: ['fork', 'knight-fork'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [horquilla](fork) es un ataque a dos piezas a la vez con una sola pieza. El rival solo puede salvar una, y la otra se pierde. Aquí el caballo de c7 ataca a la vez al rey de e8 y a la torre de a8: el rey tiene que salir del [jaque](check), y el caballo se lleva la torre.',
        en: 'A [fork](fork) is an attack on two pieces at once by a single piece. The opponent can only save one, and the other is lost. Here the knight on c7 attacks the king on e8 and the rook on a8 at the same time: the king has to get out of [check](check), and the knight takes the rook.',
      },
      board: {
        fen: KNIGHT_FORK,
        orientation: 'white',
        highlights: ['a8', 'e8'],
        arrows: [
          { from: 'c7', to: 'a8' },
          { from: 'c7', to: 'e8' },
        ],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Busca una [horquilla de caballo](knight-fork) que ataque a la vez al rey y a la dama negra.',
        en: 'Look for a [knight fork](knight-fork) that attacks the black king and queen at the same time.',
      },
      board: {
        fen: 'r2qr2k/pppb2pp/4p3/6N1/8/8/PPP2PPP/RQ2R1K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Nf7+', 'Kg8', 'Nxd8'] },
      hint: {
        es: '¿Desde qué casilla atacaría el caballo a la vez h8 y d8?',
        en: 'From which square would the knight attack both h8 and d8?',
      },
      explanation: {
        es: 'Eso es: el caballo de f7 da [jaque](check) al rey y ataca a la dama. El rey tiene que moverse, y el caballo se lleva la dama.',
        en: 'That is it: the knight on f7 gives [check](check) to the king and attacks the queen. The king has to move, and the knight takes the queen.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cualquier pieza puede hacer una [horquilla](fork): el peón, el alfil, la torre, la dama y hasta el rey. Aquí el peón avanza a c4 y ataca a la vez al caballo de b5 y al alfil de d5.',
        en: 'Any piece can make a [fork](fork): the pawn, the bishop, the rook, the queen and even the king. Here the pawn advances to c4 and attacks the knight on b5 and the bishop on d5 at the same time.',
      },
      board: {
        fen: 'r5k1/5ppp/8/1n1b4/8/2P5/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        moves: ['c4'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Haz una [horquilla](fork) con un peón.',
        en: 'Make a [fork](fork) with a pawn.',
      },
      board: { fen: '6k1/pp3ppp/2n1b3/8/3P4/2NB4/PP3PPP/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['d5'] },
      hint: {
        es: 'Un peón ataca las dos casillas que tiene delante en [diagonal](diagonal).',
        en: 'A pawn attacks the two squares in front of it on the [diagonal](diagonal).',
      },
      explanation: {
        es: 'Bien: el peón de d5 ataca a la vez al caballo de c6 y al alfil de e6. Y está defendido por tu caballo de c3: si el alfil lo captura, el caballo recaptura.',
        en: 'Well done: the pawn on d5 attacks the knight on c6 and the bishop on e6 at once. And your knight on c3 defends it: if the bishop takes it, the knight takes back.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Un [jaque](check) de la dama también puede ser una [horquilla](fork): ataca al rey y, a la vez, a una pieza que nadie defiende. Búscalo.',
        en: 'A queen [check](check) can also be a [fork](fork): it attacks the king and, at the same time, a piece nobody defends. Find it.',
      },
      board: { fen: 'r4bk1/p5pp/1p6/q1p5/8/8/PPP2PPP/2BQ1RK1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qd5+', 'Kh8', 'Qxa8'] },
      hint: {
        es: 'La torre de a8 no tiene defensa. ¿Desde qué casilla ve tu dama a la vez a8 y el rey de g8?',
        en: 'The rook on a8 has no defence. From which square does your queen see both a8 and the king on g8?',
      },
      explanation: {
        es: 'Eso es: la dama da [jaque](check) desde d5 y ataca la torre de a8. El rey solo puede ir a h8, y la dama se lleva la torre.',
        en: 'That is it: the queen gives [check](check) from d5 and attacks the rook on a8. The king can only go to h8, and the queen takes the rook.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Qué jugada del caballo hace una [horquilla](fork)?',
        en: 'Which knight move makes a [fork](fork)?',
      },
      board: { fen: 'r3k2r/pp3ppp/4pn2/1N6/8/8/PP3PPP/3R1RK1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Nc7+', 'Nd6+', 'Nxa7'], correct: 0 },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Es [jaque](check), pero desde d6 el caballo solo ataca al rey y a dos peones: el rey se aparta y no ganas nada.',
          en: 'It is [check](check), but from d6 the knight only attacks the king and two pawns: the king steps aside and you win nothing.',
        },
        {
          es: 'Ganas un peón, pero en a7 el caballo no ataca nada más y se queda encerrado.',
          en: 'You win a pawn, but on a7 the knight attacks nothing else and gets trapped.',
        },
      ],
      explanation: {
        es: 'Eso es: desde c7 el caballo da [jaque](check) al rey y ataca la torre de a8. El rey se aparta y el caballo captura la torre.',
        en: 'That is it: from c7 the knight gives [check](check) to the king and attacks the rook on a8. The king steps aside and the knight captures the rook.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: una [horquilla](fork) ataca dos piezas a la vez, y el rival solo puede salvar una. Cualquier pieza puede hacerla, pero la del caballo, la [horquilla de caballo](knight-fork), es la más traicionera. Para defenderte, no dejes dos piezas valiosas, sobre todo el rey y la dama, a un salto de caballo de la misma casilla.',
        en: 'Summary: a [fork](fork) attacks two pieces at once, and the opponent can only save one. Any piece can make one, but the knight’s, the [knight fork](knight-fork), is the trickiest. To defend yourself, do not leave two valuable pieces, above all the king and queen, a knight’s jump away from the same square.',
      },
      board: {
        fen: KNIGHT_FORK,
        orientation: 'white',
        highlights: ['a8', 'e8'],
        arrows: [
          { from: 'c7', to: 'a8' },
          { from: 'c7', to: 'e8' },
        ],
      },
    },
  ],
  next: { kind: 'positions', tag: 'fork' },
};
