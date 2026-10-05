// Lesson 3 for advanced players: isolated, doubled and backward pawns, pawn chains and pawn breaks.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_ADVANCED, CHESSKID, WIKI_PAWN_STRUCTURE } from './sources.ts';

export const pawnStructure: LessonSpec = {
  id: 'pawn-structure',
  level: 'advanced',
  order: 3,
  title: { es: 'La estructura de peones', en: 'Pawn structure' },
  summary: {
    es: 'Peones aislados, doblados y retrasados, cadenas y rupturas: lo que dura toda la partida.',
    en: 'Isolated, doubled and backward pawns, chains and breaks: what lasts the whole game.',
  },
  terms: [
    'pawn-structure',
    'isolated-pawn',
    'doubled-pawns',
    'backward-pawn',
    'pawn-chain',
    'pawn-break',
  ],
  sources: [WIKI_PAWN_STRUCTURE, CHESSKID, CHESSCOM_ADVANCED],
  next: { kind: 'openings' },
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Las piezas van y vienen, pero un peón nunca vuelve atrás. Por eso la [estructura de peones](pawn-structure), cómo están colocados los peones de cada bando, cambia poco y decide los planes. Una debilidad de peones suele durar toda la partida.',
        en: 'Pieces come and go, but a pawn never moves back. That is why the [pawn structure](pawn-structure), how each side’s pawns are placed, changes little and decides the plans. A pawn weakness usually lasts the whole game.',
      },
      board: {
        fen: '6k1/pp3ppp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un [peón aislado](isolated-pawn) no tiene peones propios en las columnas de al lado, así que ningún peón puede defenderlo. Los [peones doblados](doubled-pawns) están en la misma columna y se estorban. En la partida Bogoliúbov contra Rosenthal, de 1914, las negras tienen dos peones en la columna d: doblados y, además, aislados. El caballo blanco salta a b5: ataca el peón de d4, que ningún peón negro puede defender, y destapa el alfil de b2, que también apunta a d4. Con esa jugada las blancas consiguieron bloquear los peones negros: ganan el peón de d4 y plantan una pieza en esa casilla, delante del de d5, que ya no avanza.',
        en: 'An [isolated pawn](isolated-pawn) has no pawns of its own on the files next to it, so no pawn can defend it. [Doubled pawns](doubled-pawns) stand on the same file and get in each other’s way. In the game Bogoljubov against Rosenthal, from 1914, Black has two pawns on the d-file: doubled and isolated as well. The white knight jumps to b5: it attacks the pawn on d4, which no black pawn can defend, and uncovers the bishop on b2, which also aims at d4. With that move White managed to blockade the black pawns: he wins the pawn on d4 and settles a piece on that square, in front of the one on d5, which advances no more.',
      },
      board: {
        fen: '2rqkb1r/pp3pp1/2n1bn1p/3p4/3p4/1PN2NP1/PB2PPBP/R2Q1RK1 w - - 0 11',
        orientation: 'white',
        highlights: ['d5', 'd4'],
        moves: ['Nb5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Cuál de estos peones blancos está aislado?',
        en: 'Which of these white pawns is isolated?',
      },
      board: { fen: '6k1/pp3ppp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'El de b2', en: 'The one on b2' },
          { es: 'El de d4', en: 'The one on d4' },
          { es: 'El de f2', en: 'The one on f2' },
        ],
        correct: 1,
      },
      whyWrong: [
        {
          es: 'El peón de b2 tiene un peón blanco en la columna de al lado, el de a2: no está aislado.',
          en: 'The pawn on b2 has a white pawn on the file next to it, the one on a2: it is not isolated.',
        },
        null,
        {
          es: 'El peón de f2 tiene en la columna de al lado el de g2.',
          en: 'The pawn on f2 has the one on g2 on the file next to it.',
        },
      ],
      explanation: {
        es: 'Eso es: no hay peones blancos en las columnas c ni e, así que el de d4 está aislado. Ningún peón podrá defenderlo, y la casilla de delante, d5, es un buen sitio para una pieza negra.',
        en: 'That is it: there are no white pawns on the c-file or the e-file, so the one on d4 is isolated. No pawn will ever defend it, and the square in front of it, d5, is a good spot for a black piece.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un [peón retrasado](backward-pawn) se ha quedado detrás de los peones de las columnas de al lado y no puede avanzar sin perderse. Aquí el peón negro de d6 no puede avanzar: en d5 está el caballo blanco, protegido por el peón de e4, y ningún peón negro puede echarlo. Además, la [columna](file) d queda semiabierta para las blancas: en cuanto el caballo se aparte, su torre atacará ese peón por ella.',
        en: 'A [backward pawn](backward-pawn) has been left behind the pawns on the files next to it and cannot advance without being lost. Here the black pawn on d6 cannot advance: the white knight stands on d5, protected by the pawn on e4, and no black pawn can chase it away. And the d-[file](file) is half-open for White: as soon as the knight steps aside, his rook will attack that pawn along it.',
      },
      board: {
        fen: '6k1/pp3ppp/3p4/3Np3/4P3/8/PPP2PPP/3R2K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d6'],
        arrows: [{ from: 'd1', to: 'd5' }],
      },
    },
    {
      kind: 'choice',
      text: {
        es: '¿Qué peones blancos están doblados?',
        en: 'Which white pawns are doubled?',
      },
      board: { fen: '6k1/pp3ppp/4p3/8/8/2P5/P1P2PPP/6K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'Los de a2 y c2', en: 'The ones on a2 and c2' },
          { es: 'Los de f2 y g2', en: 'The ones on f2 and g2' },
          { es: 'Los de c2 y c3', en: 'The ones on c2 and c3' },
        ],
        correct: 2,
      },
      whyWrong: [
        {
          es: 'Están en columnas distintas, la a y la c. Doblados son dos peones en la misma columna.',
          en: 'They are on different files, a and c. Doubled means two pawns on the same file.',
        },
        {
          es: 'Están en columnas distintas, la f y la g: no están doblados.',
          en: 'They are on different files, f and g: they are not doubled.',
        },
        null,
      ],
      explanation: {
        es: 'Bien: los dos están en la columna c. El de delante tapa al de detrás, y ninguno de los dos puede defender al otro. Suelen aparecer tras una captura con peón.',
        en: 'Well done: both are on the c-file. The front one blocks the back one, and neither can defend the other. They usually appear after a capture with a pawn.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una [cadena de peones](pawn-chain) es una fila diagonal de peones que se protegen unos a otros. Su punto débil es la base, el peón de atrás, que nadie protege. Se ataca con una [ruptura](pawn-break): avanzar un peón contra ella. Aquí la cadena blanca es e4 y d5, con la base en e4, y las negras la atacan avanzando el peón de f7 a f5.',
        en: 'A [pawn chain](pawn-chain) is a diagonal line of pawns that protect one another. Its weak point is the base, the rear pawn, which nothing protects. You attack it with a [pawn break](pawn-break): pushing a pawn against it. Here the white chain is e4 and d5, with its base on e4, and Black attacks it by pushing the pawn from f7 to f5.',
      },
      board: {
        fen: '6k1/ppp2ppp/3p4/3Pp3/4P3/8/PPP2PPP/6K1 b - - 0 1',
        orientation: 'white',
        highlights: ['e4'],
        moves: ['f5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'La cadena blanca es d4 y e5. Juegas con negras. Tres rupturas candidatas: avanzar el peón de f7 a f6, el de c7 a c5 o el de b7 a b5. ¿Cuál ataca la base de la cadena?',
        en: 'The white chain is d4 and e5. You play Black. Three candidate pawn breaks: push the pawn from f7 to f6, the one from c7 to c5 or the one from b7 to b5. Which one attacks the base of the chain?',
      },
      board: {
        fen: 'r1bq1rk1/1pp2ppp/4p3/3pP3/3Pn3/3B1N2/PP3PPP/R2Q1RK1 b - - 0 1',
        orientation: 'black',
      },
      answer: { by: 'engine', options: ['f6', 'c5', 'b5'], correct: 1 },
      whyWrong: [
        {
          es: 'Ese peón ataca el de e5, la cabeza de la cadena, no la base: el de d4 lo sigue protegiendo. Y además tu peón de e6 se queda sin el apoyo del de f7.',
          en: 'That pawn attacks the one on e5, the head of the chain, not its base: the one on d4 still protects it. And your pawn on e6 loses the support of the one on f7.',
        },
        null,
        {
          es: 'En b5 el peón no ataca ningún peón de la cadena, y además nadie lo defiende: el alfil blanco de d3 se lo come.',
          en: 'On b5 the pawn attacks no pawn of the chain, and nothing defends it: the white bishop on d3 takes it.',
        },
      ],
      explanation: {
        es: 'Eso es: la base es el peón de d4, el que ningún peón protege, y el peón en c5 lo ataca. Si cae la base, el peón de e5 se queda sin apoyo. Además, tu caballo de e4 ya presiona desde el centro.',
        en: 'That is it: the base is the pawn on d4, the one no pawn protects, and the pawn on c5 attacks it. If the base falls, the pawn on e5 is left without support. And your knight on e4 is already pressing from the centre.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una [ruptura](pawn-break) también sirve para abrir el juego cuando tus piezas están mejor. En la partida Magerramov contra Kaspárov, de 1977, Kaspárov avanza su [peón aislado](isolated-pawn) de d5 a d4 aunque pueda perderlo: abre líneas para sus piezas y consigue un ataque demoledor.',
        en: 'A [pawn break](pawn-break) also serves to open the game when your pieces are better placed. In the game Magerramov against Kasparov, from 1977, Kasparov pushes his [isolated pawn](isolated-pawn) from d5 to d4 even though he may lose it: he opens lines for his pieces and gets a crushing attack.',
      },
      board: {
        fen: 'r2q1rk1/p4pp1/1pb1n2p/3p4/8/2N1P3/PP1R1PPP/3QKB1R b - - 0 17',
        orientation: 'black',
        moves: ['d4'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: la [estructura de peones](pawn-structure) dura toda la partida. Vigila los [peones aislados](isolated-pawn), los [doblados](doubled-pawns) y los [retrasados](backward-pawn): son blancos fáciles. Una [cadena de peones](pawn-chain) se ataca por la base con una [ruptura](pawn-break), y una [ruptura](pawn-break) también abre el juego cuando tus piezas están mejor.',
        en: 'Summary: the [pawn structure](pawn-structure) lasts the whole game. Watch out for [isolated](isolated-pawn), [doubled](doubled-pawns) and [backward pawns](backward-pawn): they are easy targets. A [pawn chain](pawn-chain) is attacked at its base with a [pawn break](pawn-break), and a [break](pawn-break) also opens the game when your pieces are better.',
      },
      board: {
        fen: '6k1/ppp2ppp/4p3/3pP3/3P4/8/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d4'],
      },
    },
  ],
};
