// Lesson 11 for beginners: mating the lone king with queen and king, and with rook and king.
import type { LessonSpec } from '../../../types.ts';

const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_CHECKMATE = 'https://en.wikipedia.org/wiki/Checkmate';
const LICHESS_PIECE_MATES = 'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf';

export const basicMates: LessonSpec = {
  id: 'basic-mates',
  level: 'beginner',
  order: 11,
  title: { es: 'Mates básicos', en: 'Basic mates' },
  summary: {
    es: 'Ganar con dama y rey, o con torre y rey, contra el rey solo.',
    en: 'Winning with queen and king, or rook and king, against the lone king.',
  },
  terms: [],
  sources: [WIKI_CHECKMATE, LICHESS_PIECE_MATES, FIDE],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Si al rival solo le queda el rey, una dama o una torre bastan para ganar, pero hay que saber cómo. Este es el objetivo: el rey negro, contra el borde, recibe [jaque mate](checkmate). La dama de e7 da [jaque](check) y el rey blanco de e6 la defiende.',
        en: 'If the rival has only the king left, a queen or a rook is enough to win, but you need to know how. This is the goal: the black king, against the edge, is in [checkmate](checkmate). The queen on e7 gives [check](check) and the white king on e6 defends her.',
      },
      board: { fen: '4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1', orientation: 'white' },
    },
    {
      kind: 'explain',
      text: {
        es: 'Primero, encierra al rey rival contra un borde. Aquí la dama de c7 vigila toda la [fila](rank) 7, las casillas marcadas, y el rey negro ya no puede salir de la fila 8. Pero la dama sola no da [mate](checkmate): después hay que acercar el rey propio para que la ayude.',
        en: 'First, shut the rival king in against an edge. Here the queen on c7 watches the whole of [rank](rank) 7, the marked squares, and the black king can no longer leave rank 8. But the queen alone cannot give [checkmate](checkmate): next you must bring your own king to help her.',
      },
      board: {
        fen: '4k3/2Q5/8/8/8/8/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['a7', 'b7', 'd7', 'e7', 'f7', 'g7', 'h7'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Cuidado con las prisas. Las blancas acaban de llevar la dama a f7. Juegan las negras: ¿qué pasa?',
        en: 'Don’t rush. White has just put the queen on f7. Black to move: what is going on?',
      },
      board: { fen: '7k/5Q2/8/6K1/8/8/8/8 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        {
          es: 'La dama de f7 no ataca al rey de h8.',
          en: 'The queen on f7 does not attack the king on h8.',
        },
        {
          es: 'No hay [jaque](check), así que no puede ser [mate](checkmate).',
          en: 'There is no [check](check), so it cannot be [checkmate](checkmate).',
        },
        null, // stalemate: correct
        {
          es: 'Mira bien: el rey negro no tiene ninguna casilla libre, y las negras no tienen más piezas.',
          en: 'Look closely: the black king has no free square, and Black has no other pieces.',
        },
      ],
      explanation: {
        es: 'Es [ahogado](stalemate): el rey negro no está en [jaque](check) y no tiene jugadas. Son tablas, y la victoria se ha escapado. Cuando encierres al rey, déjale siempre alguna casilla hasta que puedas dar [mate](checkmate).',
        en: 'It is [stalemate](stalemate): the black king is not in [check](check) and has no moves. It is a draw, and the win has slipped away. When you shut the king in, always leave him a square until you can give [checkmate](checkmate).',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Ahora tú: da [mate](checkmate) con la dama y el rey. El rival se defiende lo mejor posible. Encierra al rey negro contra un borde, acerca tu rey y vigila que no quede [ahogado](stalemate).',
        en: 'Your turn: give [checkmate](checkmate) with the queen and king. The rival defends as well as possible. Shut the black king in against an edge, bring your king closer and make sure he is not left in [stalemate](stalemate).',
      },
      fen: '8/8/3k4/8/8/4K3/8/7Q w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'Pon la dama a un salto de caballo del rey negro: así le quitas casillas sin darle [jaque](check). Cuando esté en el borde, trae tu rey.',
        en: 'Put the queen a knight’s jump away from the black king: that takes squares from him without giving [check](check). Once he is on the edge, bring your king.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Con la torre se gana igual, pero el rey tiene que ayudar más. La torre corta el paso al rey rival por una [fila](rank) o una [columna](file), y tu rey lo va empujando hacia el borde. El [mate](checkmate) llega así: la torre de a8 da [jaque](check) por la última fila, y el rey blanco de e6, enfrente del negro, le quita las casillas de la fila 7.',
        en: 'With the rook you win the same way, but the king has to help more. The rook cuts the rival king off along a [rank](rank) or a [file](file), and your king pushes him towards the edge. The [checkmate](checkmate) comes like this: the rook on a8 gives [check](check) along the last rank, and the white king on e6, facing the black one, takes away the squares on rank 7.',
      },
      board: {
        fen: 'R3k3/8/4K3/8/8/8/8/8 b - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'a8', to: 'e8' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Aquí el rey blanco se ha quedado una [fila](rank) más atrás, en e5. Juegan las negras: ¿qué pasa?',
        en: 'Here the white king has stayed one [rank](rank) further back, on e5. Black to move: what is going on?',
      },
      board: { fen: 'R3k3/8/8/4K3/8/8/8/8 b - - 0 1', orientation: 'white' },
      answer: { by: 'status' },
      whyWrong: [
        null, // check: correct
        {
          es: 'Es [jaque](check), pero no [mate](checkmate): el rey negro puede salir a la [fila](rank) 7, porque el rey blanco está demasiado lejos.',
          en: 'It is [check](check), but not [checkmate](checkmate): the black king can step out to [rank](rank) 7, because the white king is too far away.',
        },
        {
          es: 'El rey negro está en [jaque](check), así que no es [ahogado](stalemate).',
          en: 'The black king is in [check](check), so it is not [stalemate](stalemate).',
        },
        {
          es: 'La torre de a8 ataca al rey por la [fila](rank) 8.',
          en: 'The rook on a8 attacks the king along [rank](rank) 8.',
        },
      ],
      explanation: {
        es: 'Solo es [jaque](check). Sin el rey blanco enfrente, el rey negro escapa por la [fila](rank) 7. Por eso, con la torre, tu rey tiene que ayudar.',
        en: 'It is only [check](check). Without the white king facing him, the black king escapes along [rank](rank) 7. That is why, with the rook, your king has to help.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Ahora da [mate](checkmate) con la torre y el rey. Corta el paso al rey negro con la torre, acerca tu rey y empújalo hacia un borde. Tómatelo con calma: hacen falta más jugadas que con la dama.',
        en: 'Now give [checkmate](checkmate) with the rook and king. Cut the black king off with the rook, bring your king closer and push him towards an edge. Take your time: it takes more moves than with the queen.',
      },
      fen: '8/8/3k4/8/8/4K3/8/7R w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'Usa la torre como una pared: que el rey negro no pueda cruzar su [fila](rank) o su [columna](file). Luego, con tu rey enfrente del suyo, da [jaque](check) con la torre.',
        en: 'Use the rook as a wall: the black king must not cross its [rank](rank) or its [file](file). Then, with your king facing his, give [check](check) with the rook.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: contra el rey solo, encierra al rey rival contra un borde, trae tu rey para ayudar y da [mate](checkmate). Con la dama es más rápido; con la torre hace falta más paciencia. Y cuidado con el [ahogado](stalemate): deja siempre al rey rival alguna jugada hasta el mate. En Finales tienes más posiciones de mates básicos para practicar.',
        en: 'Summary: against the lone king, shut the rival king in against an edge, bring your king to help and give [checkmate](checkmate). With the queen it is quicker; with the rook it takes more patience. And beware of [stalemate](stalemate): always leave the rival king a move until the mate. In Endgames you will find more basic mate positions to practise.',
      },
      board: { fen: 'R3k3/8/4K3/8/8/8/8/8 b - - 0 1', orientation: 'white' },
    },
  ],
  next: { kind: 'endgames', category: 'Basic mates' },
};
