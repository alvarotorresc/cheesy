// Lesson 7 for advanced players: the bad bishop, bishop against knight and opposite-coloured bishops.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_ADVANCED,
  CHESSKID,
  WIKI_CHESS_ENDGAME,
  WIKI_OPPOSITE_BISHOPS,
  WIKI_ZUGZWANG,
} from './sources.ts';

export const minorPieceEndings: LessonSpec = {
  id: 'minor-piece-endings',
  level: 'advanced',
  order: 7,
  title: { es: 'Alfiles y caballos en el final', en: 'Bishops and knights in the endgame' },
  summary: {
    es: 'El alfil malo, el alfil contra el caballo y los alfiles de distinto color.',
    en: 'The bad bishop, bishop against knight and opposite-coloured bishops.',
  },
  terms: ['bad-bishop', 'opposite-coloured-bishops'],
  sources: [WIKI_ZUGZWANG, WIKI_CHESS_ENDGAME, WIKI_OPPOSITE_BISHOPS, CHESSKID, CHESSCOM_ADVANCED],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'En el final, un alfil y un caballo valen más o menos lo mismo, pero no siempre rinden igual. Un [alfil malo](bad-bishop) tiene sus propios peones en casillas de su color: le tapan el camino y además tiene que defenderlos. Aquí el alfil blanco de d3 va por casillas claras, y los peones blancos de c4, d5 y e4 también están en casillas claras. Al alfil solo le quedan casillas hacia atrás.',
        en: 'In the endgame a bishop and a knight are worth about the same, but they do not always do the same job. A [bad bishop](bad-bishop) has its own pawns on squares of its colour: they block its way and it also has to defend them. Here the white bishop on d3 moves on light squares, and the white pawns on c4, d5 and e4 stand on light squares too. The bishop only has squares behind it left.',
      },
      board: {
        fen: '4k3/8/8/2pPp3/2P1P3/3B4/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['d3', 'c4', 'd5', 'e4'],
      },
    },
    // fact+: pawn-facts test, badBishop(white) = ['e2'], badBishop(black) = [] (progress.md).
    {
      kind: 'choice',
      text: {
        es: 'Aquí cada bando tiene un alfil. ¿Cuál es el alfil malo?',
        en: 'Here each side has one bishop. Which one is the bad bishop?',
      },
      board: {
        fen: '6k1/3b1pp1/1p2p2p/p1p5/2P1P3/1P3PP1/P3B2P/6K1 w - - 0 1',
        orientation: 'white',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'El alfil blanco de e2', en: 'The white bishop on e2' },
          { es: 'El alfil negro de d7', en: 'The black bishop on d7' },
          { es: 'Ninguno de los dos', en: 'Neither of them' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'No: el alfil negro va por casillas claras y casi todos los peones negros están en casillas oscuras, en a5, b6, c5, g7 y h6. Sus propios peones casi no le estorban: es un alfil bueno.',
          en: 'No: the black bishop moves on light squares and nearly all the black pawns stand on dark squares, on a5, b6, c5, g7 and h6. Its own pawns hardly get in its way: it is a good bishop.',
        },
        {
          es: 'Uno de los dos sí lo es: el alfil blanco va por casillas claras, y cinco peones blancos están en casillas claras, en a2, b3, c4, e4 y f3.',
          en: 'One of them is: the white bishop moves on light squares, and five white pawns stand on light squares, on a2, b3, c4, e4 and f3.',
        },
      ],
      explanation: {
        es: 'Eso es: el alfil blanco de e2 va por casillas claras, como los peones de a2, b3, c4, e4 y f3. Tiene poco sitio y debe cuidar de ellos. El alfil negro, en cambio, tiene casi todos sus peones en casillas oscuras, que no le estorban.',
        en: 'That is it: the white bishop on e2 moves on light squares, like the pawns on a2, b3, c4, e4 and f3. It has little room and must look after them. The black bishop, on the other hand, has nearly all its pawns on dark squares, where they do not get in its way.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Con peones en los dos lados del tablero, el alfil suele ganarle al caballo: cruza el tablero en una sola jugada. Fischer contra Taimanov, cuarta partida de su match de 1971. El rey blanco ya está en a6 atacando el peón de b6, y el rey negro tiene que quedarse cerca para defenderlo. El alfil blanco da un rodeo hasta e8 para atacar el peón de g6, y el caballo negro tiene que defenderlo desde e7. Ahora las negras están en [zugzwang](zugzwang): si mueve el caballo, el alfil se come los peones de ese lado.',
        en: 'With pawns on both sides of the board, the bishop usually beats the knight: it crosses the board in a single move. Fischer against Taimanov, fourth game of their 1971 match. The white king is already on a6 attacking the pawn on b6, and the black king has to stay close to defend it. The white bishop takes a detour to e8 to attack the pawn on g6, and the black knight has to defend it from e7. Now Black is in [zugzwang](zugzwang): if the knight moves, the bishop eats the pawns on that side.',
      },
      board: {
        fen: '8/2k1n3/Kp4p1/p1p2p1p/P4P1P/2P2BP1/1P6/8 b - - 0 57',
        orientation: 'white',
        moves: ['Nc8', 'Bd5', 'Ne7', 'Bc4', 'Nc6', 'Bf7', 'Ne7', 'Be8'],
      },
    },
    // Spec: «FM eng (1): 62.Axg6 (si pasa el test 10; si no, E animado hasta 64.Rxc5)». It does not
    // pass (Bf7 also wins, 580 cp against 605 cp at depth 22): animated explain (progress.md).
    {
      kind: 'explain',
      text: {
        es: 'El rey negro tuvo que apartarse a d8. Entonces el alfil se entrega en g6: el caballo lo captura, pero el rey blanco entra en b6 y luego en c5, y se come los peones del otro lado. Ahora uno de los peones blancos de ese lado coronará, o el rey irá a por los peones negros que quedan. Taimanov abandonó siete jugadas después.',
        en: 'The black king had to step aside to d8. Then the bishop gives itself up on g6: the knight captures it, but the white king walks into b6 and then c5, eating the pawns on the other side. Now one of the white pawns on that side will promote, or the king will go after the remaining black pawns. Taimanov resigned seven moves later.',
      },
      board: {
        fen: '3kB3/4n3/Kp4p1/p1p2p1p/P4P1P/2P3P1/1P6/8 w - - 9 62',
        orientation: 'white',
        moves: ['Bxg6', 'Nxg6', 'Kxb6', 'Kd7', 'Kxc5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Contra un alfil malo, el caballo es muy fuerte. Aquí el alfil negro de c8 va por casillas claras, igual que todos los peones negros: solo puede moverse a d7. El caballo blanco puede saltar a casillas oscuras, que ese alfil no podrá atacar nunca. Y fíjate en el rey blanco: ya está en el centro, listo para entrar. En el final, el rey es una pieza más; sácalo, tengas alfil o caballo.',
        en: 'Against a bad bishop, the knight is very strong. Here the black bishop on c8 moves on light squares, like all the black pawns: it can only move to d7. The white knight can jump to dark squares, which that bishop will never be able to attack. And look at the white king: it is already in the centre, ready to walk in. In the endgame the king is one more piece; bring it out, whether you have a bishop or a knight.',
      },
      board: {
        fen: '2b5/1p3pk1/p3p1p1/3pP3/3P1P2/2N1K3/PP4PP/8 w - - 0 1',
        orientation: 'white',
        highlights: ['c8', 'c3', 'e3'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Juegas con el rey blanco solo, contra alfil y peón de la columna h. Ese peón coronaría en h1, una casilla clara, y el alfil negro va por casillas oscuras: nunca podrá echar a tu rey de esa esquina. Llega a la esquina y aguanta las tablas.',
        en: 'You play the lone white king, against bishop and pawn on the h-file. That pawn would promote on h1, a light square, and the black bishop moves on dark squares: it will never be able to drive your king out of that corner. Reach the corner and hold the draw.',
      },
      fen: '8/8/3b4/8/5k1p/8/8/4K3 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Ve por f1 o f2 hacia g1 y h1. Si te alejas hacia el otro lado, el rey negro te cierra el paso.',
        en: 'Go through f1 or f2 towards g1 and h1. If you drift to the other side, the black king cuts you off.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cuando a cada bando le queda un alfil y van por casillas de distinto color, son [alfiles de distinto color](opposite-coloured-bishops). Nunca se pueden cambiar el uno por el otro, y así es más fácil defenderse: aquí las blancas tienen dos peones más y aun así son tablas. El rey negro se planta delante de los peones, en e6, y su alfil vigila las casillas oscuras por las que tendrían que pasar.',
        en: 'When each side has one bishop left and they move on squares of different colours, they are [opposite-coloured bishops](opposite-coloured-bishops). They can never be exchanged for each other, and that makes defending easier: here White has two extra pawns and it is still a draw. The black king plants itself in front of the pawns, on e6, and its bishop watches the dark squares the pawns would have to cross.',
      },
      board: {
        fen: '8/6b1/4k3/8/3PP3/3B4/4K3/8 w - - 0 1',
        orientation: 'white',
        highlights: ['d3', 'g7', 'e6'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: un [alfil malo](bad-bishop) tiene sus peones en casillas de su color; si puedes, pon tus peones en el color contrario al de tu alfil. Con peones en los dos lados del tablero manda el alfil, y contra un alfil malo el caballo busca casillas del otro color. En el final, saca el rey. Si solo te queda el rey contra alfil y peón de la columna a o h, corre a la esquina si el alfil no controla la casilla donde coronaría el peón. Y con [alfiles de distinto color](opposite-coloured-bishops), quien defiende suele hacer tablas.',
        en: 'Summary: a [bad bishop](bad-bishop) has its pawns on squares of its colour; if you can, put your pawns on the opposite colour to your bishop. With pawns on both sides of the board the bishop rules, and against a bad bishop the knight looks for squares of the other colour. In the endgame, bring your king out. If you only have your king left against bishop and a pawn on the a- or h-file, run to the corner if the bishop does not control the square where the pawn would promote. And with [opposite-coloured bishops](opposite-coloured-bishops), the defender usually draws.',
      },
      board: {
        fen: '8/2k1n3/Kp4p1/p1p2p1p/P4P1P/2P2BP1/1P6/8 b - - 0 57',
        orientation: 'white',
      },
    },
  ],
};
