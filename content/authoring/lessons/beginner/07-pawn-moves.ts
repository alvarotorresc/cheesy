// Lesson 7 for beginners: how the pawn moves, captures and promotes.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';

export const pawnMoves: LessonSpec = {
  id: 'pawn-moves',
  level: 'beginner',
  order: 7,
  title: { es: 'El peón', en: 'The pawn' },
  summary: {
    es: 'El peón avanza recto, captura en diagonal y, al llegar al final, se convierte en otra pieza.',
    en: 'The pawn moves straight ahead, captures diagonally and, at the far end, turns into another piece.',
  },
  terms: ['promotion'],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El peón avanza hacia delante, una casilla cada vez. Pero desde su casilla de salida puede avanzar dos de golpe. Mira: el peón blanco de e2 avanza dos, hasta e4, y el negro de e7 responde igual, hasta e5.',
        en: 'The pawn moves forward, one square at a time. But from its starting square it may advance two at once. Watch: the white pawn on e2 advances two, to e4, and the black pawn on e7 does the same, to e5.',
      },
      board: { fen: START, orientation: 'white', moves: ['e4', 'e5'] },
    },
    {
      kind: 'explain',
      text: {
        es: 'El peón nunca retrocede, y solo avanza si la casilla de delante está libre. Aquí los peones de e4 y e5 se tapan el uno al otro: ninguno de los dos puede avanzar.',
        en: 'A pawn never moves backwards, and it only advances if the square in front of it is empty. Here the pawns on e4 and e5 block each other: neither of them can advance.',
      },
      board: {
        fen: '4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['e4', 'e5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'El peón de e4 tiene justo delante el peón negro de e5. ¿Puede capturarlo?',
        en: 'The pawn on e4 has the black pawn on e5 right in front of it. Can it capture it?',
      },
      board: {
        fen: '4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['e4', 'e5'],
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'No', en: 'No' },
          { es: 'Sí, avanzando una casilla', en: 'Yes, by moving one square forward' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'El peón avanza hacia delante, pero no captura hacia delante. Una pieza justo delante lo deja bloqueado.',
          en: 'The pawn moves forward, but it does not capture forward. A piece right in front of it leaves it blocked.',
        },
      ],
      explanation: {
        es: 'Eso es: no puede. El peón es la única pieza que no captura como se mueve: avanza recto, pero captura en [diagonal](diagonal). Lo verás ahora.',
        en: 'That is it: it cannot. The pawn is the only piece that does not capture the way it moves: it advances straight ahead, but it captures [diagonally](diagonal). You will see it now.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El peón captura una casilla en [diagonal](diagonal) hacia delante. El peón blanco de d4 puede capturar el peón de c5 o el caballo de e5, los de las flechas. En cambio, no puede capturar nada que tenga justo delante.',
        en: 'The pawn captures one square [diagonally](diagonal) forwards. The white pawn on d4 can capture the pawn on c5 or the knight on e5, the ones at the arrows. On the other hand, it cannot capture anything right in front of it.',
      },
      board: {
        fen: '4k3/8/8/2p1n3/3P4/8/8/4K3 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'd4', to: 'c5' },
          { from: 'd4', to: 'e5' },
        ],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu turno. El peón de e4 puede capturar dos piezas negras, pero solo una está sin defender. Captúrala.',
        en: 'Your turn. The pawn on e4 can capture two black pieces, but only one of them is undefended. Capture it.',
      },
      board: { fen: '4k3/8/6p1/3n1p2/4P3/8/8/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'capture-undefended' },
      wrong: {
        exf5: {
          es: 'Ese peón está defendido: el peón de g6 capturaría el tuyo.',
          en: 'That pawn is defended: the pawn on g6 would capture yours.',
        },
        e5: {
          es: 'Eso es avanzar, no capturar. El peón captura en [diagonal](diagonal).',
          en: 'That is advancing, not capturing. The pawn captures [diagonally](diagonal).',
        },
      },
      hint: {
        es: 'Mira las dos casillas en [diagonal](diagonal) delante del peón. ¿Cuál de las dos piezas no tiene a nadie que la proteja?',
        en: 'Look at the two squares [diagonally](diagonal) in front of the pawn. Which of the two pieces has nobody protecting it?',
      },
      explanation: {
        es: 'Bien: el caballo de d5 no tenía defensa. El peón lo captura en [diagonal](diagonal) y ocupa su casilla.',
        en: 'Well done: the knight on d5 had no defender. The pawn captures it [diagonally](diagonal) and takes its square.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cuando un peón llega a la última [fila](rank), se convierte en otra pieza: dama, torre, alfil o caballo, la que quieras, pero nunca en rey. Es la [coronación](promotion). Casi siempre se elige dama, la más fuerte. Aquí el peón de e7 avanza a e8 y se convierte en dama.',
        en: 'When a pawn reaches the last [rank](rank), it turns into another piece: a queen, rook, bishop or knight, whichever you like, but never a king. This is [promotion](promotion). Almost always you choose a queen, the strongest. Here the pawn on e7 advances to e8 and becomes a queen.',
      },
      board: { fen: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1', orientation: 'white', moves: ['e8=Q+'] },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu turno: [corona](promotion) el peón de b7. Solo le falta una casilla.',
        en: 'Your turn: [promote](promotion) the pawn on b7. It needs only one more square.',
      },
      board: { fen: '8/1P4k1/8/8/8/8/8/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'promote' },
      hint: {
        es: 'Avanza el peón hasta la última [fila](rank) y elige la pieza: casi siempre, la dama.',
        en: 'Move the pawn up to the last [rank](rank) and choose the piece: almost always, the queen.',
      },
      explanation: {
        es: 'Eso es: el peón llega a b8 y se [corona](promotion). Si has elegido dama, ahora tienes la pieza más fuerte del tablero.',
        en: 'That is it: the pawn reaches b8 and [promotes](promotion). If you chose a queen, you now have the strongest piece on the board.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Otra más, un poco más difícil: [corona](promotion) el peón de c7. Ojo: el alfil negro de c8 le tapa el paso hacia delante.',
        en: 'One more, a little harder: [promote](promotion) the pawn on c7. Careful: the black bishop on c8 blocks its way forward.',
      },
      board: { fen: '2br3k/2P5/8/8/8/8/8/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'promote' },
      hint: {
        es: 'Si no puede avanzar, quizá pueda capturar en [diagonal](diagonal) y llegar a la última [fila](rank) a la vez.',
        en: 'If it cannot advance, maybe it can capture [diagonally](diagonal) and reach the last [rank](rank) at the same time.',
      },
      explanation: {
        es: 'Eso es: el peón captura la torre de d8 y se [corona](promotion) en la misma jugada. Una captura en [diagonal](diagonal) también sirve para llegar a la última [fila](rank).',
        en: 'That is it: the pawn captures the rook on d8 and [promotes](promotion) in the same move. A [diagonal](diagonal) capture also takes it to the last [rank](rank).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el peón avanza una casilla hacia delante, o dos desde su casilla de salida, y nunca retrocede. Captura en [diagonal](diagonal), una casilla hacia delante. Al llegar a la última [fila](rank) se [corona](promotion): se convierte en dama, torre, alfil o caballo. Cada bando empieza con ocho peones, en su segunda fila.',
        en: 'Summary: the pawn moves one square forward, or two from its starting square, and it never goes back. It captures [diagonally](diagonal), one square forward. On reaching the last [rank](rank) it [promotes](promotion): it becomes a queen, rook, bishop or knight. Each side starts with eight pawns, on its second rank.',
      },
      board: { fen: START, orientation: 'white' },
    },
  ],
};
