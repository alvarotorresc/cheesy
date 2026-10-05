// Lesson 10 for advanced players: interference, clearance and combinations that join two ideas.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_ADVANCED,
  CHESSKID,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_CLEARANCE,
  WIKI_DEFLECTION,
  WIKI_INTERFERENCE,
} from './sources.ts';

export const advancedTactics: LessonSpec = {
  id: 'advanced-tactics',
  level: 'advanced',
  order: 10,
  title: { es: 'Táctica avanzada', en: 'Advanced tactics' },
  summary: {
    es: 'Cortar las líneas del rival, abrir las tuyas y juntar dos ideas en un golpe.',
    en: 'Cut your opponent’s lines, open your own and join two ideas in one blow.',
  },
  terms: ['interference', 'clearance'],
  sources: [
    LICHESS_PRACTICE,
    LICHESS_THEMES,
    WIKI_DEFLECTION,
    WIKI_INTERFERENCE,
    WIKI_CLEARANCE,
    CHESSKID,
    CHESSCOM_ADVANCED,
  ],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Repaso del nivel medio. Muchas combinaciones atacan a una pieza que defiende algo importante. Con la [desviación](deflection) la obligas a irse de su sitio. Con la [atracción](attraction) traes una pieza rival a una casilla donde estorba. Aquí la dama negra de d8 es la única que defiende la torre de e8. Hoy verás dos ideas más: cortar una línea del rival y abrir una línea tuya.',
        en: 'A recap from the intermediate level. Many combinations hit a piece that defends something important. With [deflection](deflection) you force it away from its post. With [attraction](attraction) you lure an enemy piece onto a square where it gets in the way. Here the black queen on d8 is the only defender of the rook on e8. Today you will see two more ideas: cutting one of your opponent’s lines and opening one of your own.',
      },
      board: {
        fen: '3qr1k1/5ppp/8/8/8/8/1Q3PPP/4R1K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d8', 'e8'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La [interferencia](interference) es poner una pieza tuya en medio de la línea por la que el rival defiende. Aquí la torre negra de d8 defiende a su dama de d2 por la columna, y tu dama de e2 ataca a esa dama. El caballo salta a d6 con jaque y corta la columna. Si el peón o el alfil lo capturan, la columna sigue cortada y pierden la dama. Lo mejor es capturar con la torre, pero tras el cambio de damas las negras han dado una torre por un caballo y un peón.',
        en: '[Interference](interference) means putting one of your pieces in the middle of the line your opponent defends along. Here the black rook on d8 defends its queen on d2 along the file, and your queen on e2 attacks that queen. The knight jumps to d6 with check and cuts the file. If the pawn or the bishop takes it, the file stays cut and the queen is lost. Taking with the rook is best, but after the queens come off Black has given a rook for a knight and a pawn.',
      },
      board: {
        fen: '2kr1b2/ppp4p/6p1/4PN2/8/7P/P2qQPP1/4R1K1 w - - 0 1',
        orientation: 'white',
        moves: ['Nd6+', 'Rxd6', 'exd6', 'Qxe2', 'Rxe2', 'Bxd6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu dama de h6 quiere dar [mate](checkmate) en g7, donde la apoya el peón de f6. Solo lo impide la dama negra de a7, que vigila g7 por la séptima fila. Corta esa fila.',
        en: 'Your queen on h6 wants to [checkmate](checkmate) on g7, where the pawn on f6 supports it. Only the black queen on a7 stops it, guarding g7 along the seventh rank. Cut that rank.',
      },
      board: { fen: '2r3k1/q6p/p4PpQ/1pp5/8/8/PP4PP/4R1K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Re7', 'Qxe7', 'fxe7'] },
      wrong: {
        'Qg7+': {
          es: 'La dama negra captura en g7, porque la séptima fila sigue abierta. Cambias las damas, el ataque se termina y el rey negro acaba comiéndose tu peón de g7: te quedas con un peón menos.',
          en: 'The black queen captures on g7, because the seventh rank is still open. The queens come off, the attack is over and the black king ends up taking your pawn on g7: you are a pawn down.',
        },
        'f7+': {
          es: 'La dama negra captura el peón en f7, y g7 se queda sin apoyo.',
          en: 'The black queen takes the pawn on f7, and g7 loses its support.',
        },
      },
      hint: {
        es: 'Busca una casilla de la séptima fila que defienda tu peón de f6.',
        en: 'Look for a square on the seventh rank that your pawn on f6 defends.',
      },
      explanation: {
        es: 'Bien: la torre en e7 corta la séptima fila. Si la dama negra no la captura, das mate en g7. Si la captura, el peón de f6 captura la dama. Has dado una torre por una dama.',
        en: 'Well done: the rook on e7 cuts the seventh rank. If the black queen does not take it, you mate on g7. If she takes it, the pawn on f6 takes the queen. You gave a rook for a queen.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El [despeje](clearance) es lo contrario: a veces la pieza que estorba es tuya. La quitas de en medio, mejor con una amenaza, para que entre otra. Aquí tu torre de f7 ocupa la casilla que necesita el caballo. La torre se entrega con jaque en f8 y deja libre f7. Tras la captura, la dama da jaque en g8, la torre negra tiene que capturarla y el caballo da [mate](checkmate) en f7.',
        en: '[Clearance](clearance) is the opposite: sometimes the piece in the way is your own. You move it out of the way, ideally with a threat, so that another piece can come in. Here your rook on f7 stands on the square the knight needs. The rook gives itself up with check on f8 and frees f7. After the capture the queen checks on g8, the black rook has to take it and the knight gives [checkmate](checkmate) on f7.',
      },
      board: {
        fen: 'r1r4k/2n2Rbp/4Q1p1/p5N1/PpB5/1P6/6PP/3R3K w - - 0 1',
        orientation: 'white',
        moves: ['Rf8+', 'Rxf8', 'Qg8+', 'Rxg8', 'Nf7#'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu dama de c2 mira hacia h7, pero tu propio caballo de e4 le tapa el camino. Quítalo de en medio de forma que el rival no tenga tiempo de defenderse.',
        en: 'Your queen on c2 looks towards h7, but your own knight on e4 blocks the way. Move it out of the way so that your opponent has no time to defend.',
      },
      board: { fen: 'r1b2rk1/pp3ppp/1qp5/6N1/4N3/8/PPQ2PPP/5RK1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Nf6+', 'gxf6', 'Qxh7#'] },
      wrong: {
        Nxh7: {
          es: 'Capturas un peón, pero tu caballo de e4 sigue tapando la dama y el rival tiene tiempo de reorganizarse: la ventaja pasa a ser suya.',
          en: 'You win a pawn, but your knight on e4 still blocks the queen and your opponent has time to regroup: the advantage passes to them.',
        },
        Nd6: {
          es: 'La diagonal se abre, pero sin [jaque](check): el rival tiene tiempo de tapar la diagonal: su peón de g7 avanza a g6.',
          en: 'The diagonal opens, but without [check](check): your opponent has time to block it: the pawn on g7 moves to g6.',
        },
      },
      hint: {
        es: 'El caballo puede saltar dando jaque. Así el rival tiene que contestar al jaque y no a tu dama.',
        en: 'The knight can jump with check. Then your opponent has to answer the check and not your queen.',
      },
      explanation: {
        es: 'Bien: el caballo salta a f6 con jaque y abre la diagonal. Si el peón lo captura, la dama da mate en h7 con el apoyo del caballo de g5. Si el rey va a h8, el mate en h7 es el mismo.',
        en: 'Well done: the knight jumps to f6 with check and opens the diagonal. If the pawn takes it, the queen mates on h7, supported by the knight on g5. If the king goes to h8, the mate on h7 is the same.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'La torre negra de f8 es la única que defiende la última fila. Tres ideas: sacrificar la dama en f8 para atraer al rey, avanzar el peón a e7 para desviar la torre, o llevar la torre a d8 de golpe. ¿Cuál funciona?',
        en: 'The black rook on f8 is the only defender of the back rank. Three ideas: sacrifice the queen on f8 to lure the king, push the pawn to e7 to deflect the rook, or take the rook straight to d8. Which one works?',
      },
      board: { fen: '5rk1/pp4pp/1q2P3/8/5Q2/8/PP3PPP/3R2K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Qxf8+', 'e7', 'Rd8'], correct: 1 },
      whyWrong: [
        {
          es: 'El rey captura la dama y no hay mate: si tu torre da jaque en d8, el rey sale por e7. Has perdido la dama.',
          en: 'The king takes the queen and there is no mate: if your rook checks on d8, the king escapes via e7. You have lost the queen.',
        },
        null,
        {
          es: 'Te olvidas de la dama negra: desde b6 captura tu torre en d8.',
          en: 'You forgot the black queen: from b6 she takes your rook on d8.',
        },
      ],
      explanation: {
        es: 'Eso es: el peón ataca la torre. Si la torre captura tu dama, deja la última fila: tu torre da jaque en d8 y el peón se convierte en dama. Si la dama negra captura tu torre, el peón la captura en d8 y corona con jaque; si el rey se aparta, corona en e8. Si hace otra cosa, le va todavía peor. La torre no puede hacer las dos cosas.',
        en: 'That is it: the pawn attacks the rook. If the rook takes your queen, it leaves the back rank: your rook checks on d8 and the pawn becomes a queen. If the black queen takes your rook, the pawn takes her on d8 and promotes with check; if the king steps aside, it promotes on e8. Anything else is even worse for Black. The rook cannot do both jobs.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora dos ideas seguidas. El rey negro tiene poca defensa, y tu torre de h1 está detrás de tu alfil de h4. Da mate en tres jugadas.',
        en: 'Now two ideas in a row. The black king has few defenders, and your rook on h1 stands behind your bishop on h4. Mate in three moves.',
      },
      board: { fen: 'r1qr2k1/pb3p1p/1p6/5P1Q/7B/8/PPP2PP1/1K5R w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qxh7+', 'Kxh7', 'Bf6+', 'Kg8', 'Rh8#'] },
      wrong: {
        Bf6: {
          es: 'Amenaza mucho, pero no es mate a la fuerza: el rival tiene tiempo de defenderse. Empieza con algo que obligue más.',
          en: 'It threatens a lot, but it is not a forced mate: your opponent has time to defend. Start with something more forcing.',
        },
        Bxd8: {
          es: 'Ganas una torre, pero había mate.',
          en: 'You win a rook, but there was a mate.',
        },
      },
      hint: {
        es: 'Primero atrae al rey a la columna h con un [sacrificio](sacrifice). Después aparta el alfil para que hable la torre.',
        en: 'First lure the king onto the h-file with a [sacrifice](sacrifice). Then move the bishop away so that the rook can speak.',
      },
      explanation: {
        es: 'Bien: la dama se entrega en h7 y atrae al rey a la columna h. El alfil se aparta a f6 con jaque de la torre: es un despeje. El rey vuelve a g8 y la torre da mate en h8, apoyada por el alfil. El peón de f5 le quitaba al rey la casilla g6.',
        en: 'Well done: the queen gives herself up on h7 and lures the king onto the h-file. The bishop steps aside to f6 and the rook gives check: that is a clearance. The king goes back to g8 and the rook mates on h8, supported by the bishop. The pawn on f5 took the g6 square away from the king.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: con la [interferencia](interference) pones una pieza en medio de una línea del rival y su defensa se corta. Con el [despeje](clearance) quitas de en medio una pieza tuya, mejor con [jaque](check) o con amenaza, para que entre otra. Las combinaciones fuertes suelen juntar dos ideas: aquí, atraer al rey y despejar la columna. En Posiciones tienes más ejercicios de atracción.',
        en: 'Summary: with [interference](interference) you put a piece in the middle of an enemy line and cut its defence. With [clearance](clearance) you move one of your own pieces out of the way, ideally with [check](check) or a threat, so another can come in. Strong combinations often join two ideas: here, luring the king and clearing the file. In Positions you will find more attraction exercises.',
      },
      board: {
        fen: 'r1qr2k1/pb3p1p/1p6/5P1Q/7B/8/PPP2PP1/1K5R w - - 0 1',
        orientation: 'white',
        moves: ['Qxh7+', 'Kxh7', 'Bf6+', 'Kg8', 'Rh8#'],
      },
    },
  ],
  next: { kind: 'positions', tag: 'attraction' },
};
