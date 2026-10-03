// Lesson 1 for intermediates: pieces left without defence, and counting before capturing.
import type { LessonSpec } from '../../../types.ts';
import { LICHESS_THEMES, WIKI_TACTICS } from './sources.ts';

const LOOSE_BISHOP = '6k1/pp3ppp/8/4b3/8/5N2/PP3PPP/6K1 w - - 0 1';

export const hangingPieces: LessonSpec = {
  id: 'hanging-pieces',
  level: 'intermediate',
  order: 1,
  title: { es: 'Piezas sin defensa', en: 'Hanging pieces' },
  summary: {
    es: 'Ver qué piezas se quedan sin defensa, las tuyas y las del rival.',
    en: 'Spotting the pieces left without defence, yours and your opponent’s.',
  },
  terms: ['hanging-piece'],
  sources: [LICHESS_THEMES, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [pieza colgada](hanging-piece) es una pieza que el rival puede capturar gratis: está atacada y nadie la defiende. Aquí el alfil negro de e5 está colgado: el caballo de f3 lo ataca y ninguna pieza negra lo protege. Antes de cada jugada, mira dos cosas: qué ha dejado colgado el rival con su última jugada y qué dejarías colgado tú con la tuya.',
        en: 'A [hanging piece](hanging-piece) is a piece your opponent can capture for free: it is attacked and nobody defends it. Here the black bishop on e5 is hanging: the knight on f3 attacks it and no black piece protects it. Before every move, look at two things: what your opponent has left hanging with their last move, and what you would leave hanging with yours.',
      },
      board: {
        fen: LOOSE_BISHOP,
        orientation: 'white',
        highlights: ['e5'],
        arrows: [{ from: 'f3', to: 'e5' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu caballo puede capturar dos piezas negras. Una está colgada y la otra no. Captura la que nadie defiende.',
        en: 'Your knight can capture two black pieces. One is hanging and the other is not. Capture the one nobody defends.',
      },
      board: { fen: '6k1/5ppp/p7/1b1n4/8/2N5/5PPP/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'capture-undefended' },
      wrong: {
        Nxb5: {
          es: 'Ese alfil está defendido: el peón de a6 capturaría tu caballo.',
          en: 'That bishop is defended: the pawn on a6 would capture your knight.',
        },
      },
      hint: {
        es: 'Para cada pieza que puedes capturar, mira si alguna pieza negra podría recapturar en su casilla.',
        en: 'For each piece you can capture, see whether a black piece could take back on its square.',
      },
      explanation: {
        es: 'Bien: nadie defendía el caballo de d5, así que lo ganas gratis.',
        en: 'Well done: nobody defended the knight on d5, so you win it for free.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si la pieza está defendida, cuenta: cuántas piezas tuyas la atacan, cuántas del rival la defienden y cuánto vale cada una. Aquí el caballo de d5 tiene dos atacantes, tu caballo y tu torre, y un defensor, el peón de e6. Empieza el caballo: el peón recaptura y tu torre se lleva el peón. Has ganado un peón. Si empezara la torre, la darías por un caballo.',
        en: 'If the piece is defended, count: how many of your pieces attack it, how many of your opponent’s defend it, and what each one is worth. Here the knight on d5 has two attackers, your knight and your rook, and one defender, the pawn on e6. Your knight goes first: the pawn takes back and your rook takes the pawn. You have won a pawn. If the rook went first, you would give it for a knight.',
      },
      board: {
        fen: '6k1/5ppp/4p3/3n4/8/2N5/5PPP/3R2K1 w - - 0 1',
        orientation: 'white',
        moves: ['Nxd5', 'exd5', 'Rxd5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Tienes tres capturas. ¿Cuál gana material?',
        en: 'You have three captures. Which one wins material?',
      },
      board: {
        fen: 'r5k1/pp3ppp/8/4p3/2Bnb3/2N5/PP3PPP/3R2K1 w - - 0 1',
        orientation: 'white',
      },
      answer: { by: 'engine', options: ['Nxe4', 'Rxd4', 'Bxf7+'], correct: 0 },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'El caballo de d4 está defendido por el peón de e5: das una torre, que vale 5, por un caballo, que vale 3.',
          en: 'The knight on d4 is defended by the pawn on e5: you give a rook, worth 5, for a knight, worth 3.',
        },
        {
          es: 'Es [jaque](check), pero el rey defiende el peón de f7: das un alfil, que vale 3, por un peón.',
          en: 'It is [check](check), but the king defends the pawn on f7: you give a bishop, worth 3, for a pawn.',
        },
      ],
      explanation: {
        es: 'Eso es: el alfil negro de e4 está colgado. Nadie lo defiende, así que tu caballo lo captura gratis.',
        en: 'That is it: the black bishop on e4 is hanging. Nobody defends it, so your knight captures it for free.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Ahora mira tus piezas. La torre negra de d8 ataca tu alfil de d3, y nada lo defiende. ¿Qué jugada lo salva sin perder nada?',
        en: 'Now look at your own pieces. The black rook on d8 attacks your bishop on d3, and nothing defends it. Which move saves it without losing anything?',
      },
      board: {
        fen: '3r2k1/1p3ppp/pn6/8/8/3B4/PP3PPP/2R3K1 w - - 0 1',
        orientation: 'white',
      },
      answer: { by: 'engine', options: ['Be4', 'Bxh7+', 'Bb5'], correct: 0 },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'El rey captura el alfil: lo cambias por un peón.',
          en: 'The king captures the bishop: you trade it for a pawn.',
        },
        {
          es: 'En b5 el alfil sigue colgado: el peón de a6 lo captura.',
          en: 'On b5 the bishop is still hanging: the pawn on a6 captures it.',
        },
      ],
      explanation: {
        es: 'Eso es: en e4 el alfil está a salvo, nadie lo ataca, y no deja ninguna otra pieza colgada.',
        en: 'That is it: on e4 the bishop is safe, nothing attacks it, and it leaves no other piece hanging.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El caballo negro de e5 tiene dos atacantes, tu caballo y tu dama, y un solo defensor, el caballo de c6. Gana material contando bien.',
        en: 'The black knight on e5 has two attackers, your knight and your queen, and only one defender, the knight on c6. Win material by counting well.',
      },
      board: {
        fen: 'r2q1rk1/ppp2ppp/2n5/4n3/8/5N2/PPP1QPPP/R1B2RK1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Nxe5'] },
      wrong: {
        Qxe5: {
          es: 'La dama vale 9: el caballo de c6 la captura y tú solo recuperas un caballo.',
          en: 'The queen is worth 9: the knight on c6 takes her and you only get a knight back.',
        },
      },
      hint: {
        es: 'Empieza a capturar con la pieza que menos vale.',
        en: 'Start capturing with the piece worth the least.',
      },
      explanation: {
        es: 'Bien: si el caballo de c6 recaptura, tu dama lo captura a él. Dos atacantes contra un defensor: ganas un caballo. Y como empieza la pieza que menos vale, la dama nunca corre peligro.',
        en: 'Well done: if the knight on c6 takes back, your queen takes it. Two attackers against one defender: you win a knight. And since the piece worth the least goes first, the queen is never in danger.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: una [pieza colgada](hanging-piece) está atacada y sin defensa, y se puede capturar gratis. Antes de mover, mira qué deja colgado la jugada del rival y qué dejarías colgado tú. Si la pieza está defendida, cuenta atacantes y defensores, y captura primero con la pieza que menos vale.',
        en: 'Summary: a [hanging piece](hanging-piece) is attacked and undefended, and can be captured for free. Before moving, look at what your opponent’s move leaves hanging and what you would leave hanging. If the piece is defended, count attackers and defenders, and capture first with the piece worth the least.',
      },
      board: {
        fen: LOOSE_BISHOP,
        orientation: 'white',
        highlights: ['e5'],
        arrows: [{ from: 'f3', to: 'e5' }],
      },
    },
  ],
};
