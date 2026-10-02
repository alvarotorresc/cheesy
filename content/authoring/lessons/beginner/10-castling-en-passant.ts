// Lesson 10 for beginners: the two special moves, castling and en passant.
import type { LessonSpec } from '../../../types.ts';

const FIDE = 'https://handbook.fide.com/chapter/E012023';
const WIKI_RULES = 'https://en.wikipedia.org/wiki/Rules_of_chess';
const ITALIAN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

export const castlingEnPassant: LessonSpec = {
  id: 'castling-en-passant',
  level: 'beginner',
  order: 10,
  title: { es: 'Enroque y captura al paso', en: 'Castling and en passant' },
  summary: {
    es: 'Las dos jugadas especiales: el rey y la torre a la vez, y una captura de peón muy particular.',
    en: 'The two special moves: king and rook at once, and a very particular pawn capture.',
  },
  terms: ['castling', 'en-passant'],
  sources: [FIDE, WIKI_RULES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El [enroque](castling) es la única jugada en la que se mueven dos piezas: el rey avanza dos casillas hacia una torre, y esa torre salta al otro lado del rey. Mira: las blancas enrocan por el lado corto, con el rey de e1 a g1 y la torre de h1 a f1. Las negras, por el lado largo: el rey de e8 a c8 y la torre de a8 a d8.',
        en: '[Castling](castling) is the only move in which two pieces move: the king goes two squares towards a rook, and that rook jumps to the other side of the king. Watch: White castles on the short side, king from e1 to g1 and rook from h1 to f1. Black castles on the long side: king from e8 to c8 and rook from a8 to d8.',
      },
      board: {
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        orientation: 'white',
        moves: ['O-O', 'O-O-O'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Solo se puede [enrocar](castling) si el rey y esa torre no se han movido nunca, y no hay piezas entre ellos. Además, el rey no puede estar en [jaque](check), ni pasar por una casilla atacada, ni terminar en una. Aquí el alfil negro ataca f1, la casilla por la que pasaría el rey: las blancas no pueden enrocar.',
        en: 'You may only [castle](castling) if the king and that rook have never moved and there are no pieces between them. Also, the king cannot be in [check](check), pass through an attacked square, or end up on one. Here the black bishop attacks f1, the square the king would pass through: White cannot castle.',
      },
      board: {
        fen: '4k3/8/8/8/2b5/8/8/4K2R w K - 0 1',
        orientation: 'white',
        highlights: ['f1'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Las blancas han sacado el caballo y el alfil, y entre el rey y la torre de h1 no queda nada. [Enroca](castling).',
        en: 'White has brought out the knight and the bishop, and there is nothing left between the king and the rook on h1. [Castle](castling).',
      },
      board: { fen: ITALIAN, orientation: 'white' },
      check: { by: 'rule', rule: 'castle' },
      wrong: {
        Kf1: {
          es: 'Eso mueve el rey una sola casilla. No es un [enroque](castling), y además pierdes el derecho a enrocar.',
          en: 'That moves the king just one square. It is not [castling](castling), and you also lose the right to castle.',
        },
        Rf1: {
          es: 'Así solo se mueve la torre, y pierde el derecho a [enrocar](castling). Para enrocar se mueve el rey dos casillas.',
          en: 'That only moves the rook, and it loses the right to [castle](castling). To castle, you move the king two squares.',
        },
      },
      hint: {
        es: 'Mueve el rey dos casillas hacia la torre; la torre salta sola.',
        en: 'Move the king two squares towards the rook; the rook jumps by itself.',
      },
      explanation: {
        es: 'Eso es: el rey queda en g1, protegido detrás de sus peones, y la torre sale a f1, más cerca del [centro](centre).',
        en: 'That is it: the king ends up on g1, safe behind his pawns, and the rook comes out to f1, closer to the [centre](centre).',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Ni el rey blanco ni sus torres se han movido todavía, y no hay piezas entre ellos. ¿Pueden [enrocar](castling) las blancas?',
        en: 'Neither the white king nor his rooks have moved yet, and there are no pieces between them. Can White [castle](castling)?',
      },
      board: { fen: '4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'Sí', en: 'Yes' },
          { es: 'No', en: 'No' },
        ],
        correct: 1,
      },
      whyWrong: [
        {
          es: 'Fíjate en la torre negra de e8: el rey blanco está en [jaque](check), y estando en jaque no se puede [enrocar](castling).',
          en: 'Look at the black rook on e8: the white king is in [check](check), and you cannot [castle](castling) while in check.',
        },
        null, // correct option: no whyWrong
      ],
      explanation: {
        es: 'Eso es: no. La torre de e8 da [jaque](check) al rey, y el [enroque](castling) no sirve para salir del jaque.',
        en: 'That is it: no. The rook on e8 gives [check](check) to the king, and [castling](castling) is not a way out of check.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La [captura al paso](en-passant) es una captura especial del peón. Si un peón avanza dos casillas y queda justo al lado de un peón rival, ese peón puede capturarlo como si solo hubiera avanzado una. Mira: el peón negro de d7 avanza a d5, junto al blanco de e5. El blanco lo captura yendo a d6, y el peón de d5 sale del tablero.',
        en: '[En passant](en-passant) is a special pawn capture. If a pawn advances two squares and lands right beside a rival pawn, that pawn may capture it as if it had advanced only one. Watch: the black pawn on d7 advances to d5, next to the white pawn on e5. The white pawn captures it by moving to d6, and the pawn on d5 leaves the board.',
      },
      board: {
        fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1',
        orientation: 'white',
        moves: ['d5', 'exd6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El peón negro acaba de avanzar dos casillas, de c7 a c5, y ha quedado junto a tu peón de b5. Captúralo [al paso](en-passant).',
        en: 'The black pawn has just advanced two squares, from c7 to c5, and landed next to your pawn on b5. Capture it [en passant](en-passant).',
      },
      board: { fen: '4k3/8/8/1Pp5/8/8/8/4K3 w - c6 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'en-passant' },
      wrong: {
        b6: {
          es: 'Eso es avanzar. La captura [al paso](en-passant) se hace en [diagonal](diagonal), hacia la casilla por la que pasó el peón negro.',
          en: 'That is advancing. The [en passant](en-passant) capture goes [diagonally](diagonal), to the square the black pawn passed over.',
        },
      },
      hint: {
        es: 'Tu peón va a c6, la casilla que el peón negro se saltó.',
        en: 'Your pawn goes to c6, the square the black pawn skipped.',
      },
      explanation: {
        es: 'Eso es: tu peón va a c6 y el peón de c5 sale del tablero, como si solo hubiera avanzado una casilla.',
        en: 'That is it: your pawn goes to c6 and the pawn on c5 leaves the board, as if it had advanced only one square.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'El peón rival avanzó dos casillas y quedó junto al tuyo, pero en vez de capturarlo hiciste otra jugada. Ahora, una jugada después, ¿aún puedes capturarlo [al paso](en-passant)?',
        en: 'The rival pawn advanced two squares and landed next to yours, but instead of capturing it you played another move. Now, one move later, can you still capture it [en passant](en-passant)?',
      },
      answer: {
        by: 'fact',
        options: [
          { es: 'No', en: 'No' },
          { es: 'Sí', en: 'Yes' },
        ],
        correct: 0,
      },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'La captura [al paso](en-passant) solo se puede hacer justo en la jugada siguiente. Si esperas, se pierde.',
          en: 'The [en passant](en-passant) capture can only be made on the very next move. If you wait, it is gone.',
        },
      ],
      explanation: {
        es: 'Eso es: no. La captura [al paso](en-passant) hay que hacerla enseguida, en la jugada que sigue al avance de dos. Después ya no vale.',
        en: 'That is it: no. The [en passant](en-passant) capture must be made at once, on the move right after the two-square advance. After that it is no longer allowed.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en el [enroque](castling), el rey va dos casillas hacia una torre y la torre salta al otro lado. Solo vale si ninguno de los dos se ha movido, no hay piezas en medio y el rey no está en [jaque](check), ni pasa por una casilla atacada ni acaba en ella. La [captura al paso](en-passant) la hace un peón contra un peón rival que acaba de avanzar dos casillas, y solo vale en la jugada siguiente.',
        en: 'Summary: in [castling](castling), the king goes two squares towards a rook and the rook jumps to the other side. It is only allowed if neither of them has moved, there are no pieces in between and the king is not in [check](check), does not pass through an attacked square and does not end up on one. [En passant](en-passant) is a capture by a pawn of a rival pawn that has just advanced two squares, and it is only allowed on the very next move.',
      },
      board: { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', orientation: 'white' },
    },
  ],
};
