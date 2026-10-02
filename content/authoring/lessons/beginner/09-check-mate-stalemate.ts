// Lesson 9 for beginners: check and the three ways out, checkmate and stalemate.
import type { LessonSpec } from '../../../types.ts';

const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const checkMateStalemate: LessonSpec = {
  id: 'check-mate-stalemate',
  level: 'beginner',
  order: 9,
  title: { es: 'Jaque, mate y ahogado', en: 'Check, checkmate and stalemate' },
  summary: {
    es: 'Atacar al rey, ganar la partida y el final que acaba en tablas.',
    en: 'Attacking the king, winning the game and the ending that is a draw.',
  },
  terms: ['check', 'checkmate', 'stalemate'],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Cuando una pieza ataca al rey rival, se dice que le da [jaque](check). El rey en jaque tiene que salir del jaque en la jugada siguiente, y hay tres formas: mover el rey, tapar el jaque con otra pieza o capturar la pieza que lo da. Aquí la torre de e1 da jaque al rey negro de e8.',
        en: 'When a piece attacks the rival king, it is giving [check](check). A king in check must get out of check on the very next move, and there are three ways: move the king, block the check with another piece, or capture the piece giving it. Here the rook on e1 gives check to the black king on e8.',
      },
      board: {
        fen: '4k3/8/8/8/8/8/8/4RK2 b - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'e1', to: 'e8' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las negras. ¿Qué le pasa al rey negro?',
        en: 'Black to move. What is happening to the black king?',
      },
      board: { fen: '4k3/8/8/1B6/8/8/8/4K3 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        null, // check: correct
        {
          es: 'No es [mate](checkmate): el rey negro puede apartarse a una casilla que nadie ataca.',
          en: 'It is not [checkmate](checkmate): the black king can step aside to a square nobody attacks.',
        },
        {
          es: 'El [ahogado](stalemate) es no tener jugadas sin estar en [jaque](check). Aquí sí hay jaque.',
          en: '[Stalemate](stalemate) means having no move without being in [check](check). Here there is a check.',
        },
        {
          es: 'Fíjate en el alfil de b5: ataca al rey por la [diagonal](diagonal).',
          en: 'Look at the bishop on b5: it attacks the king along the [diagonal](diagonal).',
        },
      ],
      explanation: {
        es: 'Eso es: [jaque](check). El alfil de b5 ataca al rey por la [diagonal](diagonal), pero el rey puede apartarse.',
        en: 'That is it: [check](check). The bishop on b5 attacks the king along the [diagonal](diagonal), but the king can step aside.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu rey está en [jaque](check): la torre de b1 lo ataca. Sal del jaque. Aquí el rey no puede moverse, pero puedes tapar o capturar.',
        en: 'Your king is in [check](check): the rook on b1 attacks him. Get out of check. Here the king cannot move, but you can block or capture.',
      },
      board: { fen: '6k1/5ppp/8/8/8/2NB4/5PPP/1r4K1 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'escape-check' },
      hint: {
        es: 'Busca una pieza que pueda ponerse entre la torre y tu rey, o una que pueda capturar la torre.',
        en: 'Look for a piece that can stand between the rook and your king, or one that can capture the rook.',
      },
      explanation: {
        es: 'Bien. Tapar con una pieza o capturar la torre te sacan del [jaque](check). Capturarla, además, te hace ganar una torre.',
        en: 'Well done. Blocking with a piece or capturing the rook both get you out of [check](check). Capturing it also wins you a rook.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si el rey está en [jaque](check) y no hay forma de salir, es [jaque mate](checkmate), o simplemente mate, y la partida termina: gana quien lo da. Aquí la torre de a8 da jaque, los propios peones negros encierran a su rey, y nada puede tapar ni capturar la torre.',
        en: 'If the king is in [check](check) and there is no way out, it is [checkmate](checkmate), or just mate, and the game ends: whoever gives it wins. Here the rook on a8 gives check, the black king’s own pawns shut him in, and nothing can block or capture the rook.',
      },
      board: {
        fen: 'R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'a8', to: 'g8' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las negras. ¿Y ahora?',
        en: 'Black to move. What about now?',
      },
      board: { fen: 'k7/1Q6/1K6/8/8/8/8/8 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        {
          es: 'Es más que [jaque](check): el rey negro no puede apartarse, y tampoco capturar la dama, porque la defiende el rey blanco.',
          en: 'It is more than [check](check): the black king cannot step aside, and he cannot capture the queen either, because the white king defends her.',
        },
        null, // checkmate: correct
        {
          es: 'No es [ahogado](stalemate): el rey negro está en [jaque](check).',
          en: 'It is not [stalemate](stalemate): the black king is in [check](check).',
        },
        {
          es: 'La dama de b7 ataca al rey negro, que está justo a su lado.',
          en: 'The queen on b7 attacks the black king, who is right next to her.',
        },
      ],
      explanation: {
        es: 'Eso es: [mate](checkmate). La dama de b7 da [jaque](check), el rey negro no tiene casillas libres y no puede capturarla, porque la defiende el rey blanco de b6.',
        en: 'That is it: [checkmate](checkmate). The queen on b7 gives [check](check), the black king has no free squares and cannot capture her, because the white king on b6 defends her.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Da [jaque mate](checkmate) en una jugada.',
        en: 'Give [checkmate](checkmate) in one move.',
      },
      board: { fen: '6k1/5ppp/8/8/2n5/8/5PPP/R5K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Ra8#'] },
      wrong: {
        Ra4: {
          es: 'Atacas el caballo, pero había algo mucho mejor: [mate](checkmate) en una.',
          en: 'You attack the knight, but there was something much better: [checkmate](checkmate) in one.',
        },
      },
      hint: {
        es: 'El rey negro está encerrado por sus propios peones. Busca un [jaque](check) por la última [fila](rank).',
        en: 'The black king is shut in by his own pawns. Look for a [check](check) along the last [rank](rank).',
      },
      explanation: {
        es: 'Eso es: la torre llega a a8 y da [jaque](check). El rey no puede escapar, porque sus peones le quitan las casillas, y nadie puede tapar ni capturar la torre: es [mate](checkmate).',
        en: 'That is it: the rook reaches a8 and gives [check](check). The king cannot escape, because his pawns take away his squares, and nobody can block or capture the rook: it is [checkmate](checkmate).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si le toca jugar a un bando que no tiene ninguna jugada legal, y su rey no está en [jaque](check), es [ahogado](stalemate): la partida acaba en tablas y nadie gana. Parece un [mate](checkmate), pero no lo es. Aquí juegan las negras: el rey de a8 no está en jaque, y todas las casillas de su alrededor están atacadas.',
        en: 'If the side to move has no legal move, and its king is not in [check](check), it is [stalemate](stalemate): the game ends in a draw and nobody wins. It looks like [checkmate](checkmate), but it is not. Here Black is to move: the king on a8 is not in check, and every square around him is attacked.',
      },
      board: { fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', orientation: 'white' },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las negras. ¿Qué pasa?',
        en: 'Black to move. What is going on?',
      },
      board: { fen: 'k7/P7/1K6/8/8/8/8/8 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        {
          es: 'El peón de a7 no ataca al rey: los peones atacan en [diagonal](diagonal), y este ataca b8.',
          en: 'The pawn on a7 does not attack the king: pawns attack [diagonally](diagonal), and this one attacks b8.',
        },
        {
          es: 'Para que haya [mate](checkmate), el rey tiene que estar en [jaque](check), y no lo está.',
          en: 'For [checkmate](checkmate), the king has to be in [check](check), and he is not.',
        },
        null, // stalemate: correct
        {
          es: 'Mira bien: las negras no tienen ninguna jugada legal. El rey no puede capturar el peón de a7, porque lo defiende el rey blanco.',
          en: 'Look closely: Black has no legal move. The king cannot capture the pawn on a7, because the white king defends it.',
        },
      ],
      explanation: {
        es: 'Eso es: [ahogado](stalemate). El rey negro no está en [jaque](check), pero no tiene ninguna jugada legal: la partida acaba en tablas.',
        en: 'That is it: [stalemate](stalemate). The black king is not in [check](check), but he has no legal move: the game ends in a draw.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Una última. Juegan las negras.',
        en: 'One last one. Black to move.',
      },
      board: { fen: '7k/8/8/5Q2/8/8/8/6K1 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        {
          es: 'La dama de f5 no ataca al rey de h8.',
          en: 'The queen on f5 does not attack the king on h8.',
        },
        {
          es: 'Sin [jaque](check) no hay [mate](checkmate).',
          en: 'Without [check](check) there is no [checkmate](checkmate).',
        },
        {
          es: 'El rey negro sí tiene jugadas: puede ir a g8 o a g7.',
          en: 'The black king does have moves: he can go to g8 or to g7.',
        },
        null, // none: correct
      ],
      explanation: {
        es: 'Eso es: nada. El rey negro no está en [jaque](check) y tiene jugadas, así que la partida sigue.',
        en: 'That is it: nothing. The black king is not in [check](check) and has moves, so the game goes on.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: [jaque](check) es atacar al rey, y se sale moviendo el rey, tapando o capturando. [Jaque mate](checkmate) es un jaque sin salida, y gana la partida. [Ahogado](stalemate) es no tener jugadas sin estar en jaque, y la partida acaba en tablas.',
        en: 'Summary: [check](check) means attacking the king, and you get out of it by moving the king, blocking or capturing. [Checkmate](checkmate) is a check with no way out, and it wins the game. [Stalemate](stalemate) is having no move without being in check, and the game ends in a draw.',
      },
      board: { fen: 'R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', orientation: 'white' },
    },
  ],
};
