// Lesson 7 for intermediates: the back-rank, smothered and Anastasia mates.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_INTERMEDIATE, CHESSKID, LICHESS_PRACTICE, LICHESS_THEMES } from './sources.ts';

export const matePatterns: LessonSpec = {
  id: 'mate-patterns',
  level: 'intermediate',
  order: 7,
  title: { es: 'Mates típicos', en: 'Mate patterns' },
  summary: {
    es: 'El mate del pasillo, el de la coz y el de Anastasia: tres dibujos que se repiten.',
    en: 'The back-rank mate, the smothered mate and Anastasia’s mate: three pictures that keep coming back.',
  },
  terms: ['back-rank', 'smothered-mate', 'anastasia-mate'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSCOM_INTERMEDIATE, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Hay [mates](checkmate) que se repiten tanto que tienen nombre. El primero es el [mate del pasillo](back-rank): el rey se queda en su [última fila](back-rank) detrás de sus peones, y una torre o la dama le da [jaque](check) por esa fila. Aquí la torre de d8 da jaque y los peones de f7, g7 y h7 encierran a su propio rey. La defensa es sencilla: mover a tiempo uno de esos peones para dejarle un hueco al rey.',
        en: 'Some [checkmates](checkmate) come up so often that they have a name. The first is the [back-rank mate](back-rank): the king stays on his [back rank](back-rank) behind his pawns, and a rook or the queen gives [check](check) along that rank. Here the rook on d8 gives check and the pawns on f7, g7 and h7 shut their own king in. The defence is simple: move one of those pawns in time to leave the king a gap.',
      },
      board: {
        fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
        orientation: 'white',
        highlights: ['f7', 'g7', 'h7'],
        arrows: [{ from: 'd8', to: 'g8' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'La dama negra de f3 amenaza tu peón de g2. Antes de defenderte, mira el rey negro. Da [jaque mate](checkmate) en una jugada.',
        en: 'The black queen on f3 threatens your pawn on g2. Before you defend, look at the black king. Give [checkmate](checkmate) in one move.',
      },
      board: { fen: 'r1b3k1/pp3ppp/2n5/8/8/2N2q2/PP3PPP/4R1K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Re8#'] },
      wrong: {
        gxf3: {
          es: 'Capturar la dama parece lo natural, pero las negras siguen atacando y tú sigues peor. Había algo mucho mejor: [mate](checkmate) en una. Mira la [última fila](back-rank) del rival.',
          en: 'Taking the queen looks natural, but Black keeps attacking and you are still worse. There was something much better: [checkmate](checkmate) in one. Look at the rival’s [back rank](back-rank).',
        },
      },
      hint: {
        es: 'El rey negro no tiene ningún hueco. ¿Qué pieza puede llegar a su [última fila](back-rank)?',
        en: 'The black king has no gap at all. Which piece can reach his [back rank](back-rank)?',
      },
      explanation: {
        es: 'Eso es: la torre llega a e8 y da [jaque](check). Ninguna pieza negra puede taparlo ni capturar la torre, y los peones encierran al rey: es el [mate del pasillo](back-rank). Un [mate](checkmate) vale más que una dama.',
        en: 'That is it: the rook reaches e8 and gives [check](check). No black piece can block it or take the rook, and the pawns shut the king in: it is the [back-rank mate](back-rank). A [checkmate](checkmate) is worth more than a queen.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora la torre negra de c8 vigila la [última fila](back-rank). Captúrala, y cuando la dama negra la recupere, da [mate](checkmate). Tienes dos jugadas.',
        en: 'Now the black rook on c8 guards the [back rank](back-rank). Take it, and when the black queen takes back, give [checkmate](checkmate). You have two moves.',
      },
      board: { fen: '2r3k1/p2q1ppp/1p6/8/8/1P6/P1Q2PPP/2R3K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qxc8+', 'Qxc8', 'Rxc8#'] },
      hint: {
        es: 'Tu dama y tu torre miran a la misma casilla, c8. Empieza por la dama.',
        en: 'Your queen and your rook both look at the same square, c8. Start with the queen.',
      },
      explanation: {
        es: 'Bien. La dama captura la torre con [jaque](check), la dama negra la recupera y tu torre captura otra vez en c8 dando [mate](checkmate). Sobre c8 atacabas con dos piezas y el rival defendía con una sola: al acabar los cambios, la última en capturar es la tuya.',
        en: 'Well done. Your queen takes the rook with [check](check), the black queen takes back and your rook captures again on c8 with [checkmate](checkmate). You attacked c8 with two pieces and the rival defended it with only one: when the exchanges are over, the last one to capture is yours.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El segundo es el [mate de la coz](smothered-mate): un caballo da [jaque](check) a un rey tan rodeado de sus propias piezas que no puede moverse. Al caballo no se le puede tapar, porque salta. Aquí el rey de h8 tiene su torre en g8 y sus peones en g7 y h7, y el caballo salta a f7.',
        en: 'The second is the [smothered mate](smothered-mate): a knight gives [check](check) to a king so surrounded by his own pieces that he cannot move. A knight check cannot be blocked, because the knight jumps. Here the king on h8 has his rook on g8 and his pawns on g7 and h7, and the knight jumps to f7.',
      },
      board: {
        fen: '6rk/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['g8', 'g7', 'h7'],
        moves: ['Nf7#'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Da [mate](checkmate) en una jugada con el caballo.',
        en: 'Give [checkmate](checkmate) in one move with the knight.',
      },
      board: { fen: 'r5rk/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Nf7#'] },
      hint: {
        es: 'El rey negro no tiene ninguna casilla libre. Busca la casilla desde la que el caballo ataca h8.',
        en: 'The black king has no free square at all. Find the square from which the knight attacks h8.',
      },
      explanation: {
        es: 'Eso es: el caballo salta a f7 y da [jaque](check). El rey no puede moverse, porque sus piezas le ocupan las casillas, y nadie puede capturar el caballo: [mate de la coz](smothered-mate).',
        en: 'That is it: the knight jumps to f7 and gives [check](check). The king cannot move, because his own pieces fill his squares, and nobody can take the knight: [smothered mate](smothered-mate).',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Aquí la casilla g8 está libre y la torre de f8 cubre f7. Ofrece la dama para que una torre negra tape la última salida, y luego da [mate](checkmate) con el caballo. Tienes dos jugadas.',
        en: 'Here the square g8 is free and the rook on f8 covers f7. Offer your queen so that a black rook blocks the last way out, then give [checkmate](checkmate) with the knight. You have two moves.',
      },
      board: { fen: '3r1r1k/pp4pp/7N/8/2Q5/8/1q3PPP/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qg8+', 'Rxg8', 'Nf7#'] },
      wrong: {
        'Nf7+': {
          es: 'La torre de f8 captura el caballo. Primero hay que llevar esa torre a otra casilla.',
          en: 'The rook on f8 takes the knight. First that rook has to be lured to another square.',
        },
      },
      hint: {
        es: 'Tu dama puede llegar a g8 dando [jaque](check). El rey no puede capturarla, porque el caballo de h6 vigila g8.',
        en: 'Your queen can reach g8 with [check](check). The king cannot take her, because the knight on h6 guards g8.',
      },
      explanation: {
        es: 'Precioso. La dama da [jaque](check) en g8, el rey no puede capturarla y la torre de f8 tiene que hacerlo. Ahora la torre tapa g8 y f7 queda libre: el caballo salta allí y es [mate de la coz](smothered-mate). Entregar la dama así es un [sacrificio de dama](queen-sacrifice).',
        en: 'Beautiful. The queen gives [check](check) on g8, the king cannot take her and the rook on f8 has to. Now the rook blocks g8 and f7 is free: the knight jumps there and it is a [smothered mate](smothered-mate). Giving up the queen like this is a [queen sacrifice](queen-sacrifice).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El tercero es el [mate de Anastasia](anastasia-mate): el rey está en el borde, un caballo le quita las casillas de delante y una torre le da [jaque](check) por la [columna](file) del borde. Aquí el caballo de e7 vigila g8 y g6, el peón de g7 es del propio rey y la torre de h1 da el jaque.',
        en: 'The third is [Anastasia’s mate](anastasia-mate): the king is on the edge, a knight takes away the squares in front of him and a rook gives [check](check) along the edge [file](file). Here the knight on e7 guards g8 and g6, the pawn on g7 belongs to the king himself and the rook on h1 gives the check.',
      },
      board: {
        fen: '5r2/4N1pk/8/8/8/8/PP3PP1/1K5R b - - 0 1',
        orientation: 'white',
        highlights: ['g8', 'g6'],
        arrows: [{ from: 'h1', to: 'h7' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu dama de d3 tapa el camino de la torre de a3 hacia la [columna](file) h. Ábrelo con [jaque](check) y da el [mate de Anastasia](anastasia-mate). Tienes dos jugadas.',
        en: 'Your queen on d3 blocks the way of the rook on a3 to the h-[file](file). Open it with [check](check) and give [Anastasia’s mate](anastasia-mate). You have two moves.',
      },
      board: { fen: '1q3r1k/pp2N1pp/8/8/8/R2Q4/PP3PP1/1K6 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qxh7+', 'Kxh7', 'Rh3#'] },
      hint: {
        es: 'La dama puede capturar el peón de h7 dando [jaque](check). Si el rey la captura, ¿dónde queda?',
        en: 'The queen can take the pawn on h7 with [check](check). If the king takes her, where does he end up?',
      },
      explanation: {
        es: 'Eso es. La dama captura en h7 con [jaque](check) y el rey tiene que capturarla. Al irse la dama de d3, la torre tiene el camino libre: llega a h3 y da [mate](checkmate). El caballo de e7 le quita al rey g8 y g6.',
        en: 'That is it. The queen takes on h7 with [check](check) and the king has to take her. With the queen gone from d3, the rook has a clear road: it reaches h3 and gives [checkmate](checkmate). The knight on e7 takes g8 and g6 away from the king.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: un rey encerrado por sus propias piezas es un rey en peligro. En el [mate del pasillo](back-rank), la torre o la dama dan [jaque](check) por la [última fila](back-rank). En el [mate de la coz](smothered-mate), el caballo salta sobre un rey rodeado. En el [mate de Anastasia](anastasia-mate), caballo y torre lo atrapan en el borde. Cuando reconozcas el dibujo, busca las jugadas que lo completan, aunque cueste una dama. Y para tu rey: déjale siempre un hueco.',
        en: 'Summary: a king shut in by his own pieces is a king in danger. In the [back-rank mate](back-rank), the rook or the queen gives [check](check) along the [back rank](back-rank). In the [smothered mate](smothered-mate), the knight jumps on a surrounded king. In [Anastasia’s mate](anastasia-mate), knight and rook trap him on the edge. When you recognise the picture, look for the moves that complete it, even if they cost a queen. And for your own king: always leave him a gap.',
      },
      board: { fen: '6rk/5Npp/8/8/8/8/6PP/6K1 b - - 0 1', orientation: 'white' },
    },
  ],
  next: { kind: 'positions', tag: 'back-rank' },
};
