// Lesson 9 for intermediates: the in-between move and x-ray.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_INTERMEDIATE,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_TACTICS,
} from './sources.ts';

export const inBetweenMove: LessonSpec = {
  id: 'in-between-move',
  level: 'intermediate',
  order: 9,
  title: { es: 'La jugada intermedia', en: 'The in-between move' },
  summary: {
    es: 'Antes de recapturar, mira si hay algo mejor; y las piezas que atacan a través de otras.',
    en: 'Before taking back, check whether there is something better; and the pieces that attack through others.',
  },
  terms: ['intermediate-move', 'x-ray'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Cuando el rival captura una pieza, lo natural es recuperarla enseguida. Pero a veces hay algo mejor antes: una [jugada intermedia](intermediate-move), casi siempre un [jaque](check) o una amenaza, que el rival tiene que atender. Aquí la dama negra acaba de capturar en d2. En lugar de recuperarla ya, la torre de e1 captura en e8 con jaque; el rey se aparta, y solo entonces la otra torre recupera la dama. Las blancas ganan una torre entera.',
        en: 'When the rival takes a piece, the natural thing is to take it back at once. But sometimes there is something better first: an [in-between move](intermediate-move), almost always a [check](check) or a threat, that the rival has to answer. Here the black queen has just taken on d2. Instead of taking her back now, the rook on e1 takes on e8 with check; the king steps aside, and only then does the other rook take the queen back. White wins a whole rook.',
      },
      board: {
        fen: '4r1k1/pp3pp1/1b5p/8/8/8/PP1q1PPP/3RR1K1 w - - 0 1',
        orientation: 'white',
        moves: ['Rxe8+', 'Kh7', 'Rxd2'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'La dama negra acaba de capturar tu dama en e1. Puedes recuperarla con la torre, pero espera: ¿hay algo antes? Juega la [jugada intermedia](intermediate-move) y luego recupera. Tienes dos jugadas.',
        en: 'The black queen has just taken your queen on e1. You can take her back with the rook, but wait: is there something first? Play the [in-between move](intermediate-move) and then take back. You have two moves.',
      },
      board: { fen: '1kr5/pppb2pp/8/4N3/8/8/PPP3PP/1KR1q3 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Nxd7+', 'Ka8', 'Rxe1'] },
      wrong: {
        Rxe1: {
          es: 'Recuperar está bien, pero te dejas algo: antes podías capturar una pieza con [jaque](check), y la dama seguiría ahí.',
          en: 'Taking back is fine, but you miss something: first you could take a piece with [check](check), and the queen would still be there.',
        },
      },
      hint: {
        es: 'Tu caballo puede capturar una pieza dando [jaque](check) al rey de b8.',
        en: 'Your knight can take a piece while giving [check](check) to the king on b8.',
      },
      explanation: {
        es: 'Eso es. El caballo captura el alfil de d7 con [jaque](check). El rey tiene que apartarse, y la dama de e1 sigue a tiro de tu torre: la recuperas en la jugada siguiente. Has ganado un alfil con una [jugada intermedia](intermediate-move).',
        en: 'That is it. The knight takes the bishop on d7 with [check](check). The king has to step aside, and the queen on e1 is still in reach of your rook: you take her back on the next move. You have won a bishop with an [in-between move](intermediate-move).',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'La dama negra acaba de capturar en d1. Juegan las blancas: ¿recuperar ya, o hay algo mejor antes?',
        en: 'The black queen has just taken on d1. White to move: take back now, or is there something better first?',
      },
      board: { fen: '5rk1/ppp1bppp/8/3N4/8/8/PPP2PPP/3q1RK1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Rxd1', 'Nxe7+', 'Nxc7'], correct: 1 },
      whyWrong: [
        {
          es: 'Recuperas la dama y quedáis igual. Antes de recapturar había un [jaque](check) que ganaba una pieza.',
          en: 'You get the queen back and things are level. Before taking back there was a [check](check) that won a piece.',
        },
        null, // Nxe7+: correct
        {
          es: 'Capturas un peón, pero no es [jaque](check) y te olvidas de la dama: el rival la pone a salvo y te quedas sin la tuya.',
          en: 'You take a pawn, but it is not [check](check) and you forget the queen: the rival takes her to safety and you are left without yours.',
        },
      ],
      explanation: {
        es: 'Eso es. El caballo captura el alfil de e7 con [jaque](check), el rey se aparta y después la torre recupera la dama en d1. Una pieza de más gracias a la [jugada intermedia](intermediate-move).',
        en: 'That is it. The knight takes the bishop on e7 with [check](check), the king steps aside and then the rook takes the queen back on d1. A piece up thanks to the [in-between move](intermediate-move).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un apunte más: los [rayos X](x-ray). Una dama, una torre o un alfil puede atacar o defender una casilla a través de una pieza rival que está en la misma línea, porque en cuanto esa pieza se aparta o captura, la de detrás entra en juego. Aquí la torre negra de d5 parece poder capturar tu caballo de d6, pero tu torre de d1 lo defiende a través de ella: si la torre negra captura en d6, deja libre la columna y tu torre la recupera.',
        en: 'One more note: [x-ray](x-ray). A queen, a rook or a bishop can attack or defend a square through an enemy piece standing on the same line, because as soon as that piece moves away or captures, the one behind it comes into play. Here the black rook on d5 seems able to take your knight on d6, but your rook on d1 defends it through the rook: if the black rook takes on d6, it opens the file and your rook takes it back.',
      },
      board: {
        fen: '6k1/pp3ppp/3Npn2/3r4/8/8/PP2KPPP/3R4 b - - 0 1',
        orientation: 'white',
        highlights: ['d6'],
        arrows: [{ from: 'd1', to: 'd6' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Usa los [rayos X](x-ray) de tu torre y da [mate](checkmate) en dos jugadas.',
        en: 'Use your rook’s [x-ray](x-ray) and give [checkmate](checkmate) in two moves.',
      },
      board: { fen: '6k1/pp1r1ppp/1n6/6Q1/8/8/PP3PPP/3R2K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qd8+', 'Rxd8', 'Rxd8#'] },
      hint: {
        es: 'Tu torre de d1 mira a d8 a través de la torre negra de d7. Lleva la dama a d8 con [jaque](check): si la torre negra la captura, la columna queda libre.',
        en: 'Your rook on d1 looks at d8 through the black rook on d7. Take the queen to d8 with [check](check): if the black rook takes her, the file is open.',
      },
      explanation: {
        es: 'Eso es. Tu dama entra en d8 con [jaque](check) y la torre negra tiene que capturarla. Al hacerlo deja libre la columna d, y tu torre, que defendía d8 a través de ella, captura a su vez: [mate del pasillo](back-rank).',
        en: 'That is it. Your queen lands on d8 with [check](check) and the black rook has to take her. In doing so it opens the d-file, and your rook, which defended d8 through it, captures in turn: [back-rank mate](back-rank).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: recapturar no siempre es lo primero. Antes, pregúntate si tienes un [jaque](check) o una amenaza que el rival tenga que atender: esa [jugada intermedia](intermediate-move) puede ganar material, y la recaptura seguirá ahí. Y recuerda los [rayos X](x-ray): una pieza de largo alcance sigue contando aunque tenga una pieza rival delante en su línea.',
        en: 'Summary: taking back is not always the first thing. Before you do, ask yourself whether you have a [check](check) or a threat the rival must answer: that [in-between move](intermediate-move) can win material, and the recapture will still be there. And remember [x-ray](x-ray): a long-range piece still counts even with an enemy piece in front of it on its line.',
      },
      board: { fen: '1kr5/pppN2pp/8/8/8/8/PPP3PP/1KR1q3 b - - 0 1', orientation: 'white' },
    },
  ],
};
