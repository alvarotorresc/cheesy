// Lesson 5 for intermediates: discovered attacks, discovered check and double check.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_INTERMEDIATE,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_TACTICS,
} from './sources.ts';

const BATTERY = '3q2k1/8/8/8/3N4/8/8/3R2K1 w - - 0 1';

export const discoveredAttacks: LessonSpec = {
  id: 'discovered-attacks',
  level: 'intermediate',
  order: 5,
  title: { es: 'Ataque a la descubierta y jaque doble', en: 'Discovered attacks and double check' },
  summary: {
    es: 'Una pieza se aparta y destapa el ataque de otra que estaba detrás.',
    en: 'One piece steps aside and uncovers the attack of another behind it.',
  },
  terms: ['discovered-attack', 'discovered-check', 'double-check'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'En un [ataque a la descubierta](discovered-attack), una pieza se aparta y destapa el ataque de otra que estaba detrás: una dama, una torre o un alfil. Aquí, si el caballo de d4 se mueve, la torre de d1 ataca a la dama de d8. Y el caballo, al moverse, puede atacar otra cosa: el rival tendrá dos problemas a la vez.',
        en: 'In a [discovered attack](discovered-attack), one piece steps aside and uncovers the attack of another that stood behind it: a queen, a rook or a bishop. Here, if the knight on d4 moves, the rook on d1 attacks the queen on d8. And the knight, as it moves, can attack something else: the opponent will have two problems at once.',
      },
      board: {
        fen: BATTERY,
        orientation: 'white',
        highlights: ['d4', 'd8'],
        arrows: [{ from: 'd1', to: 'd8' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu torre de d1 apunta a la dama negra, pero tu alfil de d3 está en medio. Aparta el alfil de forma que el rival no tenga tiempo de salvar la dama.',
        en: 'Your rook on d1 points at the black queen, but your bishop on d3 is in the way. Move the bishop so that your opponent has no time to save the queen.',
      },
      board: {
        fen: 'rnb2rk1/pp3ppp/2pqp3/8/8/1QNB4/PPP2PPP/3R1RK1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Bxh7+', 'Kxh7', 'Rxd6'] },
      hint: {
        es: 'Si el alfil da [jaque](check), el rival tiene que ocuparse antes de su rey.',
        en: 'If the bishop gives [check](check), your opponent has to deal with the king first.',
      },
      explanation: {
        es: 'Bien: el alfil captura en h7 con [jaque](check). El rey tiene que responder y la torre, ya destapada, captura la dama.',
        en: 'Well done: the bishop captures on h7 with [check](check). The king has to answer, and the rook, now uncovered, captures the queen.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si lo que se destapa es un [jaque](check), es un [jaque a la descubierta](discovered-check). La pieza que se aparta puede atacar lo que quiera, porque el rival tiene que ocuparse antes de su rey. Aquí el alfil captura la torre de a8 y, a la vez, la torre de e1 da jaque al rey.',
        en: 'If what is uncovered is a [check](check), it is a [discovered check](discovered-check). The piece that steps aside can attack whatever it likes, because the opponent must deal with the king first. Here the bishop captures the rook on a8 and, at the same time, the rook on e1 gives check to the king.',
      },
      board: {
        fen: 'r3k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1',
        orientation: 'white',
        moves: ['Bxa8+'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu torre de e1 apunta al rey negro y tu alfil de e4 está en medio. Gana material con un [jaque a la descubierta](discovered-check).',
        en: 'Your rook on e1 points at the black king and your bishop on e4 is in the way. Win material with a [discovered check](discovered-check).',
      },
      board: {
        fen: 'r1b1k2r/ppp2ppp/3p1n2/8/4B3/2N5/PPP2PPP/R3R1K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Bxb7+', 'Kd7', 'Bxa8'] },
      hint: {
        es: 'Busca una casilla para el alfil desde la que capture algo y siga atacando otra pieza.',
        en: 'Look for a square where the bishop captures something and still attacks another piece.',
      },
      explanation: {
        es: 'Eso es: el alfil captura en b7 y la torre da [jaque](check). Mientras el rey se aparta, el alfil captura también la torre de a8.',
        en: 'That is it: the bishop captures on b7 and the rook gives [check](check). While the king steps aside, the bishop also captures the rook on a8.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'En un [jaque doble](double-check) dan jaque dos piezas a la vez: la que se mueve y la que se destapa. No se pueden tapar ni capturar las dos en una jugada, así que el rey está obligado a moverse. Aquí el caballo salta a f6 y da jaque, y la torre de e1 da otro.',
        en: 'In a [double check](double-check) two pieces give check at once: the one that moves and the one it uncovers. Both cannot be blocked or captured in one move, so the king is forced to move. Here the knight jumps to f6 and gives check, and the rook on e1 gives another.',
      },
      board: {
        fen: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1',
        orientation: 'white',
        moves: ['Nf6+'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora el [jaque doble](double-check) es contra ti: la torre de e8 y el alfil de b4 atacan a tu rey a la vez. Sal del jaque.',
        en: 'Now the [double check](double-check) is against you: the rook on e8 and the bishop on b4 attack your king at once. Get out of check.',
      },
      board: { fen: '4r1k1/5ppp/8/8/1b6/3Q1N2/PP3PPP/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'escape-check' },
      hint: {
        es: 'Tapar o capturar solo resuelve uno de los dos jaques.',
        en: 'Blocking or capturing only deals with one of the two checks.',
      },
      explanation: {
        es: 'Bien: ante un [jaque doble](double-check), la única salida es mover el rey.',
        en: 'Well done: against a [double check](double-check), the only way out is to move the king.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Da [jaque mate](checkmate) con un [jaque doble](double-check).',
        en: 'Give [checkmate](checkmate) with a [double check](double-check).',
      },
      board: {
        fen: 'rnbqkb1r/pppp2pp/8/8/4N3/8/PPP2PPP/4R1K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Nd6#'] },
      wrong: {
        'Nf6+': {
          es: 'Es un [jaque doble](double-check), pero el rey escapa a f7.',
          en: 'It is a [double check](double-check), but the king escapes to f7.',
        },
      },
      hint: {
        es: 'El caballo de e4 tapa la [columna](file) de tu torre. ¿Adónde puede saltar para dar jaque él también y quitarle al rey la casilla f7?',
        en: 'The knight on e4 blocks your rook’s [file](file). Where can it jump to give check as well and take f7 away from the king?',
      },
      explanation: {
        es: 'Eso es: el caballo da jaque desde d6 y la torre, desde e1. El rey tiene que moverse, pero todas sus casillas están ocupadas o atacadas: es [mate](checkmate).',
        en: 'That is it: the knight gives check from d6 and the rook from e1. The king has to move, but all his squares are taken or attacked: it is [checkmate](checkmate).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en un [ataque a la descubierta](discovered-attack) una pieza se aparta y destapa a otra. Si lo destapado es un jaque, es un [jaque a la descubierta](discovered-check), y la pieza que se mueve queda libre para atacar. Si las dos dan jaque, es un [jaque doble](double-check), y el rey tiene que moverse.',
        en: 'Summary: in a [discovered attack](discovered-attack) one piece steps aside and uncovers another. If what is uncovered is a check, it is a [discovered check](discovered-check), and the piece that moves is free to attack. If both give check, it is a [double check](double-check), and the king has to move.',
      },
      board: {
        fen: BATTERY,
        orientation: 'white',
        highlights: ['d4', 'd8'],
        arrows: [{ from: 'd1', to: 'd8' }],
      },
    },
  ],
  next: { kind: 'positions', tag: 'discovered-attack' },
};
