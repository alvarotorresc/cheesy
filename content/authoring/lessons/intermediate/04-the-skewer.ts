// Lesson 4 for intermediates: the skewer, in the middlegame and in the ending.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_INTERMEDIATE,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_TACTICS,
} from './sources.ts';

const BISHOP_SKEWER = '6q1/8/8/3k4/8/1B6/8/K7 b - - 0 1';

export const theSkewer: LessonSpec = {
  id: 'the-skewer',
  level: 'intermediate',
  order: 4,
  title: { es: 'La enfilada', en: 'The skewer' },
  summary: {
    es: 'Atacar a una pieza valiosa para ganar la que tiene detrás.',
    en: 'Attacking a valuable piece to win the one behind it.',
  },
  terms: ['skewer'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [enfilada](skewer) es como una [clavada](pin) al revés: delante está la pieza más valiosa. Cuando se aparta, deja al descubierto la de detrás, y esa es la que cae. Aquí el alfil de b3 da [jaque](check) al rey de d5, y detrás, en la misma [diagonal](diagonal), está la dama de g8.',
        en: 'A [skewer](skewer) is like a [pin](pin) turned around: the more valuable piece is in front. When it steps aside, it exposes the one behind, and that is the one that falls. Here the bishop on b3 gives [check](check) to the king on d5, and behind him, on the same [diagonal](diagonal), stands the queen on g8.',
      },
      board: {
        fen: BISHOP_SKEWER,
        orientation: 'white',
        highlights: ['d5', 'g8'],
        arrows: [{ from: 'b3', to: 'g8' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Haz una [enfilada](skewer) con el alfil: da [jaque](check) al rey y gana lo que tiene detrás.',
        en: 'Make a [skewer](skewer) with the bishop: give [check](check) to the king and win what stands behind him.',
      },
      board: { fen: '6q1/pp4pp/4kp2/8/8/8/PP3P1P/5BK1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Bc4+', 'Kf5', 'Bxg8'] },
      hint: {
        es: 'El rey de e6 y la dama de g8 están en la misma [diagonal](diagonal).',
        en: 'The king on e6 and the queen on g8 stand on the same [diagonal](diagonal).',
      },
      explanation: {
        es: 'Eso es: el alfil da [jaque](check) desde c4. El rey tiene que salir de la [diagonal](diagonal), y el alfil captura la dama.',
        en: 'That is it: the bishop gives [check](check) from c4. The king has to leave the [diagonal](diagonal), and the bishop captures the queen.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora con la torre, por la última [fila](rank).',
        en: 'Now with the rook, along the back [rank](rank).',
      },
      board: {
        fen: '4k2q/3p1pp1/1p2p3/2p5/8/2PB4/1P3PPP/R5K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Ra8+', 'Ke7', 'Rxh8'] },
      hint: {
        es: 'El rey de e8 y la dama de h8 están en la misma [fila](rank), y la [columna](file) de tu torre está libre.',
        en: 'The king on e8 and the queen on h8 stand on the same [rank](rank), and your rook’s [file](file) is open.',
      },
      explanation: {
        es: 'Bien: la torre da [jaque](check) desde a8. El rey solo puede ir a e7, y la torre captura la dama de h8.',
        en: 'Well done: the rook gives [check](check) from a8. The king can only go to e7, and the rook captures the queen on h8.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La [enfilada](skewer) aparece mucho en los finales, justo cuando un peón [corona](promotion). Aquí el peón negro corona en a1, pero la nueva dama y su rey quedan en la misma [columna](file). La torre da [jaque](check) desde a8, el rey se aparta y la torre captura la dama.',
        en: 'The [skewer](skewer) turns up a lot in endings, just as a pawn [promotes](promotion). Here the black pawn promotes on a1, but the new queen and her king end up on the same [file](file). The rook gives [check](check) from a8, the king steps aside and the rook captures the queen.',
      },
      board: {
        fen: '7R/8/8/5K2/k7/8/p7/8 b - - 0 1',
        orientation: 'white',
        moves: ['a1=Q', 'Ra8+', 'Kb3', 'Rxa1'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora tú. La dama negra acaba de [coronar](promotion) en h1, y su rey está en la misma [fila](rank). Gánala con una [enfilada](skewer).',
        en: 'Your turn. The black queen has just [promoted](promotion) on h1, and her king is on the same [rank](rank). Win her with a [skewer](skewer).',
      },
      board: { fen: '8/R7/8/1K6/8/8/8/3k3q w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Ra1+', 'Kd2', 'Rxh1'] },
      hint: {
        es: 'La torre puede bajar por la [columna](file) hasta la primera [fila](rank).',
        en: 'The rook can go down the [file](file) to the first [rank](rank).',
      },
      explanation: {
        es: 'Eso es: la torre da [jaque](check) desde a1, el rey tiene que salir de la primera [fila](rank) y la torre captura la dama. Con torre contra nada, la partida está ganada.',
        en: 'That is it: the rook gives [check](check) from a1, the king has to leave the first [rank](rank) and the rook captures the queen. With a rook against nothing, the game is won.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en una [enfilada](skewer) atacas a una pieza valiosa, casi siempre con [jaque](check), y cuando se aparta ganas la que tenía detrás en la misma línea. Búscala cuando el rey y la dama rivales estén en la misma [fila](rank), [columna](file) o [diagonal](diagonal).',
        en: 'Summary: in a [skewer](skewer) you attack a valuable piece, almost always with [check](check), and when it steps aside you win the one behind it on the same line. Look for it when the enemy king and queen stand on the same [rank](rank), [file](file) or [diagonal](diagonal).',
      },
      board: {
        fen: BISHOP_SKEWER,
        orientation: 'white',
        highlights: ['d5', 'g8'],
        arrows: [{ from: 'b3', to: 'g8' }],
      },
    },
  ],
  next: { kind: 'positions', tag: 'skewer' },
};
