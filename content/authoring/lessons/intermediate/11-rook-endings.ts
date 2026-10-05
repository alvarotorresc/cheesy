// Lesson 11 for intermediates: the active rook, the rook behind the passed pawn, the seventh rank and cutting off the king.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_INTERMEDIATE, CHESSKID, LICHESS_PRACTICE } from './sources.ts';

export const rookEndings: LessonSpec = {
  id: 'rook-endings',
  level: 'intermediate',
  order: 11,
  title: { es: 'Finales de torre', en: 'Rook endings' },
  summary: {
    es: 'Torre activa, torre detrás del peón, la séptima fila y cómo cortar al rey.',
    en: 'An active rook, the rook behind the pawn, the seventh rank and how to cut the king off.',
  },
  terms: ['seventh-rank', 'cutting-off-the-king'],
  sources: [LICHESS_PRACTICE, CHESSCOM_INTERMEDIATE, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Los finales de torre son los más frecuentes. Dos ideas sirven casi siempre. La primera: una torre activa, que ataca y se mueve con libertad, vale más que una torre pasiva, que solo defiende. La segunda: la torre va detrás del [peón pasado](passed-pawn), sea tuyo o del rival. Detrás de tu peón, la torre lo empuja y gana espacio a cada paso; delante, se queda encerrada. Aquí la torre de a1 está detrás del peón de a5.',
        en: 'Rook endings are the most common ones. Two ideas almost always help. The first: an active rook, which attacks and moves freely, is worth more than a passive rook, which only defends. The second: the rook belongs behind the [passed pawn](passed-pawn), yours or the rival’s. Behind your pawn, the rook pushes it and gains room with every step; in front of it, the rook gets shut in. Here the rook on a1 stands behind the pawn on a5.',
      },
      board: {
        fen: '8/r4pk1/6pp/P7/8/6PP/5PK1/R7 w - - 0 1',
        orientation: 'white',
        highlights: ['a1', 'a5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las blancas. La torre negra de b2 ataca tu [fila](rank) 2 y mira hacia tu [peón pasado](passed-pawn). ¿Dónde pones tu torre?',
        en: 'White to move. The black rook on b2 attacks your [rank](rank) 2 and eyes your [passed pawn](passed-pawn). Where do you put your rook?',
      },
      board: { fen: '8/5pk1/6pp/P7/8/6PP/1r3PK1/3R4 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Rd7', 'Ra1', 'Rd6'], correct: 1 },
      whyWrong: [
        {
          es: 'La [séptima fila](seventh-rank) tienta, pero la torre negra se va a por tu peón de a5. Primero hay que cuidar el [peón pasado](passed-pawn).',
          en: 'The [seventh rank](seventh-rank) is tempting, but the black rook goes after your pawn on a5. First you have to look after the [passed pawn](passed-pawn).',
        },
        null, // Ra1: correct
        {
          es: 'Desde d6 la torre ataca un peón, pero es peor: tu [peón pasado](passed-pawn) se queda sin apoyo. Tu torre tiene que ir detrás de él.',
          en: 'From d6 the rook attacks a pawn, but it is worse: your [passed pawn](passed-pawn) is left without support. Your rook has to go behind it.',
        },
      ],
      explanation: {
        es: 'Eso es: la torre a a1, detrás del [peón pasado](passed-pawn). Lo protege, lo empuja hacia la [coronación](promotion) y deja a la torre negra delante, haciendo de tapón.',
        en: 'That is it: the rook to a1, behind the [passed pawn](passed-pawn). It protects the pawn, pushes it towards [promotion](promotion) and leaves the black rook in front, acting as a plug.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Otra casilla de oro para la torre es la [séptima fila](seventh-rank), la segunda del rival. Desde allí ataca los peones que todavía no se han movido y encierra al rey rival en su última [fila](rank). Aquí la torre de d7 ataca el peón de b7, y el rey negro no puede salir de la fila 8.',
        en: 'Another golden square for the rook is the [seventh rank](seventh-rank), the rival’s second rank. From there it attacks the pawns that have not moved yet and shuts the rival king in on his last [rank](rank). Here the rook on d7 attacks the pawn on b7, and the black king cannot leave rank 8.',
      },
      board: {
        fen: '6k1/pp1R4/8/8/8/8/1r3PPP/6K1 b - - 0 1',
        orientation: 'white',
        highlights: ['b7', 'e7', 'f7', 'g7', 'h7'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: '[Cortar al rey](cutting-off-the-king) es usar la torre como una pared: se pone en una [fila](rank) o una [columna](file) que el rey rival no puede cruzar sin quedar en [jaque](check). Así el rey no llega a tiempo a donde importa, sea para defender o para ayudar a su peón. Aquí la torre de d1 corta al rey de b4: no puede cruzar la columna d para ayudar a su peón de e4.',
        en: '[Cutting off the king](cutting-off-the-king) means using the rook as a wall: it stands on a [rank](rank) or a [file](file) the rival king cannot cross without walking into [check](check). That way the king does not arrive in time where it matters, to defend or to help his pawn. Here the rook on d1 cuts off the king on b4: he cannot cross the d-file to help his pawn on e4.',
      },
      board: {
        fen: '8/8/1K6/8/1k2p3/8/8/3R4 w - - 0 1',
        orientation: 'white',
        highlights: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Gana con la torre contra el peón. El rey negro está cortado por la [columna](file) d: no lo dejes cruzar mientras vas a por el peón con la torre o con el rey.',
        en: 'Win with the rook against the pawn. The black king is cut off along the d-[file](file): do not let him cross while you go after the pawn with the rook or the king.',
      },
      fen: '8/8/1K6/8/1k2p3/8/8/3R4 w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'Empieza con un [jaque](check) en d4: el rey negro sigue cortado y tu torre ya ataca el peón. También gana ponerla delante del peón, en e1. Luego tu rey vendrá a capturarlo.',
        en: 'Start with a [check](check) on d4: the black king stays cut off and your rook already attacks the pawn. Putting it in front of the pawn, on e1, also wins. Then your king will come to take it.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Ahora defiendes tú, con rey y un peón a punto de [coronar](promotion) contra una torre. El rey negro está lejos: aguanta las tablas sin separar tu rey del peón.',
        en: 'Now you defend, with king and a pawn about to [promote](promotion) against a rook. The black king is far away: hold the draw without leaving your pawn.',
      },
      fen: '8/1KP5/8/8/8/8/8/2r3k1 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Mantén el rey pegado al peón. Si te dan [jaque](check), vuelve junto a él.',
        en: 'Keep your king next to the pawn. If you get a [check](check), go back beside it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en los finales de torre, la torre activa manda. Ponla detrás del [peón pasado](passed-pawn), llévala a la [séptima fila](seventh-rank) cuando puedas, y úsala para [cortar al rey](cutting-off-the-king) rival. Dos posiciones famosas de torre y peón, la [posición de Lucena](lucena-position) y la [posición de Philidor](philidor-position), están en Finales: son el siguiente paso.',
        en: 'Summary: in rook endings, the active rook rules. Put it behind the [passed pawn](passed-pawn), take it to the [seventh rank](seventh-rank) when you can, and use it for [cutting off](cutting-off-the-king) the rival king. Two famous rook and pawn positions, the [Lucena position](lucena-position) and the [Philidor position](philidor-position), are in Endgames: they are the next step.',
      },
      board: {
        fen: '6k1/pp1R4/8/8/8/8/1r3PPP/6K1 b - - 0 1',
        orientation: 'white',
      },
    },
  ],
  next: { kind: 'endgames', category: 'Rook and pawn' },
};
