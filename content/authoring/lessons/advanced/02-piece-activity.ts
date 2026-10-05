// Lesson 2 for advanced players: mobility, the worst piece, the king in the endgame and the initiative.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_ADVANCED, WIKI_STRATEGY } from './sources.ts';

export const pieceActivity: LessonSpec = {
  id: 'piece-activity',
  level: 'advanced',
  order: 2,
  title: { es: 'Piezas activas', en: 'Active pieces' },
  summary: {
    es: 'Una pieza vale por lo que hace: cuántas casillas útiles ve y adónde puede ir.',
    en: 'A piece is worth what it does: how many useful squares it sees and where it can go.',
  },
  terms: ['mobility', 'initiative', 'fianchetto', 'long-diagonal'],
  sources: [CHESSCOM_ADVANCED, WIKI_STRATEGY],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'El [valor de las piezas](piece-value) es una guía, pero una pieza vale por lo que hace. Cuenta cuántas casillas útiles ve: eso es su [movilidad](mobility). El caballo de d4 llega a ocho casillas; el de a1, en la esquina, solo a dos. Son la misma pieza y no valen lo mismo.',
        en: 'The [piece values](piece-value) are a guide, but a piece is worth what it does. Count how many useful squares it sees: that is its [mobility](mobility). The knight on d4 reaches eight squares; the one on a1, in the corner, only two. They are the same piece and they are not worth the same.',
      },
      board: {
        fen: '7k/8/8/8/3N4/8/8/N6K w - - 0 1',
        orientation: 'white',
        highlights: ['d4', 'a1'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una pieza activa ataca, defiende y vigila casillas importantes; una pasiva está encerrada detrás de sus propios peones. El alfil en [fianchetto](fianchetto), en g2, mira toda la [gran diagonal](long-diagonal) hasta a8 sin que nada lo tape. Si los peones propios se ponen en esa diagonal, el mismo alfil se queda sin trabajo.',
        en: 'An active piece attacks, defends and watches important squares; a passive one is shut in behind its own pawns. The bishop in [fianchetto](fianchetto), on g2, sees the whole [long diagonal](long-diagonal) up to a8 with nothing in the way. If your own pawns stand on that diagonal, the same bishop is left with nothing to do.',
      },
      board: {
        fen: '6k1/8/8/8/8/6P1/5PBP/6K1 w - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'g2', to: 'a8' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Qué pieza mejoras? Ojo: las torres se miran en la columna c, y la tuya no tiene defensa. Cada opción mueve una pieza distinta: la torre a la columna d, el caballo de a4 a c5 o el rey a f1.',
        en: 'Which piece do you improve? Careful: the rooks face each other on the c-file, and yours is undefended. Each option moves a different piece: the rook to the d-file, the knight from a4 to c5 or the king to f1.',
      },
      board: { fen: '2r3k1/pp3ppp/4b3/8/N7/1P6/P4PPP/2R3K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Rd1', 'Nc5', 'Kf1'], correct: 1 },
      whyWrong: [
        {
          es: 'La torre ya estaba bien: en la columna c frena a la torre negra. Si se va, la columna c es de la torre negra: entra en c2 y ataca tus peones, y tu caballo sigue en el borde.',
          en: 'The rook was already well placed: on the c-file it holds back the black rook. If it leaves, the c-file belongs to the black rook: it gets in to c2 and attacks your pawns, and your knight is still on the edge.',
        },
        null,
        {
          es: 'Acercar el rey al centro es buena idea en el final, pero ahora deja sola tu torre de c1: la torre negra la captura con [jaque](check).',
          en: 'Bringing the king towards the centre is a good idea in the endgame, but right now it leaves your rook on c1 alone: the black rook takes it with [check](check).',
        },
      ],
      explanation: {
        es: 'Eso es: el caballo de a4, en el borde, era tu peor pieza. Desde c5 ataca el peón de b7 y el alfil de e6, y además se pone en medio de la columna c: tu torre ya no está atacada. Cambiar las torres en c8 también mantiene el equilibrio, pero no mejora ninguna pieza. Antes de mover, pregúntate qué pieza hace menos, y llévala adonde haga más.',
        en: 'That is it: the knight on a4, on the edge, was your worst piece. From c5 it attacks the pawn on b7 and the bishop on e6, and it also steps into the c-file: your rook is no longer attacked. Trading rooks on c8 keeps the balance too, but it improves no piece. Before you move, ask which piece does least, and take it where it does more.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cada pieza tiene su sitio. La torre busca [columnas](file) sin peones, por donde puede entrar en el campo rival. Y en el final, cuando quedan pocas piezas, el rey deja de esconderse: sale al centro y pelea como una pieza más. Aquí la torre blanca entra por la columna d hasta la séptima fila, y el rey blanco en e4 está mucho más activo que el negro en g7.',
        en: 'Each piece has its place. The rook looks for [files](file) without pawns, through which it can get into the rival camp. And in the endgame, when few pieces are left, the king stops hiding: he comes out to the centre and fights like any other piece. Here the white rook gets in along the d-file to the seventh rank, and the white king on e4 is far more active than the black one on g7.',
      },
      board: {
        fen: '1r6/5pk1/6p1/8/4K3/8/5P2/3R4 w - - 0 1',
        orientation: 'white',
        highlights: ['e4'],
        arrows: [{ from: 'd1', to: 'd7' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Final de peones. El rey negro ya está en el centro. ¿Llevas tu rey al centro o avanzas un peón?',
        en: 'Pawn endgame. The black king is already in the centre. Do you bring your king to the centre or push a pawn?',
      },
      board: { fen: '8/pp6/8/8/3k4/8/PP6/5K2 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['a4', 'Ke2', 'b4'], correct: 1 },
      whyWrong: [
        {
          es: 'El peón avanza, pero tu rey se queda lejos. El rey negro llega primero a tus peones y se los come.',
          en: 'The pawn moves on, but your king stays far away. The black king reaches your pawns first and eats them.',
        },
        null,
        {
          es: 'El peón avanza solo y sin apoyo, y tu rey sigue lejos. El rey negro gana la carrera y se come tus peones.',
          en: 'The pawn moves on alone and without support, and your king is still far away. The black king wins the race and eats your pawns.',
        },
      ],
      explanation: {
        es: 'Bien: en el final el rey es una pieza más. Desde e2 llega a tiempo de defender sus peones y la partida queda en tablas. Si avanzas un peón, el rey negro entra antes.',
        en: 'Well done: in the endgame the king is one more piece. From e2 he arrives in time to defend his pawns and the game is a draw. If you push a pawn, the black king gets in first.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Quien tiene las piezas más activas suele llevar la [iniciativa](initiative): hace amenazas, y el rival tiene que contestarlas en lugar de seguir su plan. La [iniciativa](initiative) no es ventaja material, pero muchas veces termina en ella. Aquí el material está igualado, pero la torre blanca en la séptima ya ataca el peón de f7 y el rey blanco está en el centro: las blancas llevan la [iniciativa](initiative). Las negras aguantan, pero solo si activan su torre a tiempo, por ejemplo con [jaques](check) desde atrás.',
        en: 'Whoever has the more active pieces usually holds the [initiative](initiative): he makes threats, and the rival has to answer them instead of following his own plan. The [initiative](initiative) is not a material advantage, but it often ends in one. Here material is level, but the white rook on the seventh already attacks the pawn on f7 and the white king stands in the centre: White holds the [initiative](initiative). Black holds, but only if his rook gets active in time, for instance with [checks](check) from behind.',
      },
      board: {
        fen: '1r4k1/3R1ppp/8/8/4K3/8/5PPP/8 w - - 0 1',
        orientation: 'white',
        highlights: ['d7', 'e4'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El peón negro de a6 ataca tu caballo de b5. Casi todas sus casillas están vigiladas. Encuentra la única jugada que no te deja sin caballo.',
        en: 'The black pawn on a6 attacks your knight on b5. Nearly all of its squares are watched. Find the only move that does not leave you without your knight.',
      },
      board: {
        fen: 'r1q2rk1/1p2ppbp/p3bnp1/1N6/8/P1P2N2/1PQ1BPPP/R4RK1 w - - 0 1',
        orientation: 'white',
      },
      // Keeps the balance (about -0.4), so it is not decisive: it is the only move that holds.
      check: { by: 'engine', solution: ['Nbd4'], onlyMove: true },
      wrong: {
        Nd6: {
          es: 'En d6 lo captura el peón de e7.',
          en: 'On d6 the pawn on e7 takes it.',
        },
        Nc7: {
          es: 'En c7 lo captura la dama negra.',
          en: 'On c7 the black queen takes it.',
        },
        Na7: {
          es: 'En a7 lo captura la torre de a8.',
          en: 'On a7 the rook on a8 takes it.',
        },
      },
      hint: {
        es: 'Repasa las casillas del caballo una a una. Solo una está defendida por un peón tuyo y no la ataca ningún peón negro.',
        en: 'Go through the knight’s squares one by one. Only one is defended by a pawn of yours and attacked by no black pawn.',
      },
      explanation: {
        es: 'Eso es: en d4 el caballo está defendido por el peón de c3 y por el otro caballo, y desde el centro tiene buena [movilidad](mobility). Las demás casillas estaban vigiladas: cualquier otra jugada pierde el caballo.',
        en: 'That is it: on d4 the knight is defended by the pawn on c3 and by the other knight, and from the centre it has good [mobility](mobility). The other squares were watched: any other move loses the knight.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: una pieza vale por su [movilidad](mobility), por las casillas útiles que ve. Lleva tu peor pieza adonde haga más: el caballo al centro, el alfil a una diagonal abierta como la [gran diagonal](long-diagonal), la torre a una columna sin peones y, en el final, el rey al centro. Quien tiene las piezas activas suele tener la [iniciativa](initiative).',
        en: 'Summary: a piece is worth its [mobility](mobility), the useful squares it sees. Take your worst piece where it does more: the knight to the centre, the bishop to an open diagonal such as the [long diagonal](long-diagonal), the rook to a file without pawns and, in the endgame, the king to the centre. Whoever has the active pieces usually has the [initiative](initiative).',
      },
      board: { fen: '7k/8/8/8/3N4/8/8/N6K w - - 0 1', orientation: 'white', highlights: ['d4'] },
    },
  ],
};
