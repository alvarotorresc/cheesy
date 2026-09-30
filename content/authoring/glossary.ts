// The glossary: chess terms in plain words, each with a small board and the sources it was checked
// against. Definitions are written from scratch, never copied. The closed list of ids lives in
// content/tests/fast/glossary.test.ts.
import type { GlossarySpec } from '../types.ts';

const FIDE_LAWS = 'https://handbook.fide.com/chapter/E012023';
const WIKI_GLOSSARY = 'https://en.wikipedia.org/wiki/Glossary_of_chess';
const WIKI = 'https://en.wikipedia.org/wiki/';
const WIKI_MATES = `${WIKI}Checkmate_pattern`;
const WIKI_PAWN_STRUCTURE = `${WIKI}Pawn_structure`;
const WIKI_KP_ENDGAME = `${WIKI}King_and_pawn_versus_king_endgame`;
const WIKI_ROOK_ENDGAME = `${WIKI}Rook_and_pawn_versus_rook_endgame`;
const WIKI_LUCENA = `${WIKI}Lucena_position`;
const LICHESS_MATES_I = 'https://lichess.org/practice/checkmates/checkmate-patterns-i/fE4k21MW';
const LICHESS_MATES_II = 'https://lichess.org/practice/checkmates/checkmate-patterns-ii/8yadFPpU';
const LICHESS_MATES_IV = 'https://lichess.org/practice/checkmates/checkmate-patterns-iv/96Lij7wH';
const LICHESS_ROOK_ENDGAMES =
  'https://lichess.org/practice/rook-endgames/basic-rook-endgames/pqUSUw8Y';
const LICHESS_FORK = 'https://lichess.org/practice/fundamental-tactics/the-fork/Qj281y1p';
const CHESSCOM_ES = 'https://www.chess.com/es/terms/';
const CHESSCOM_EN = 'https://www.chess.com/terms/';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const glossary: GlossarySpec[] = [
  // ─── Rules and basics ────────────────────────────────────────────────────────────────────────
  {
    id: 'check',
    name: { es: 'Jaque', en: 'Check' },
    definition: {
      es: 'Ataque directo al rey. Quien está en jaque tiene que librarse de él en su jugada: moviendo el rey, tapando la línea del ataque o capturando la pieza que ataca.',
      en: 'A direct attack on the king. The side in check must get out of it with its very next move: by moving the king, blocking the line of attack or capturing the attacking piece.',
    },
    example: {
      fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1',
      orientation: 'white',
      highlights: ['e8', 'e1'],
      arrows: [{ from: 'e1', to: 'e8', move: false }],
    },
    level: 'beginner',
    sources: [FIDE_LAWS, WIKI_GLOSSARY, `${CHESSCOM_ES}jaque-ajedrez`],
  },
  {
    id: 'checkmate',
    name: { es: 'Jaque mate', en: 'Checkmate' },
    definition: {
      es: '[Jaque](check) del que el rey no puede librarse de ninguna manera. La partida termina ahí y gana quien lo da.',
      en: 'A [check](check) the king cannot get out of in any way. The game ends there, and the side that gives it wins.',
    },
    example: {
      fen: 'k7/1Q6/1K6/8/8/8/8/8 b - - 0 1',
      orientation: 'white',
      highlights: ['a8', 'b7'],
      arrows: [],
    },
    level: 'beginner',
    sources: [FIDE_LAWS, WIKI_GLOSSARY, `${CHESSCOM_ES}jaque-mate-ajedrez`],
  },
  {
    id: 'stalemate',
    name: { es: 'Ahogado', en: 'Stalemate' },
    definition: {
      es: 'Le toca mover a un jugador que no tiene ninguna jugada permitida y cuyo rey no está en [jaque](check). La partida acaba al momento en tablas, es decir, en empate.',
      en: 'The player whose turn it is has no allowed move, and their king is not in [check](check). The game ends at once in a draw.',
    },
    example: {
      fen: 'k7/8/1Q6/8/8/8/8/7K b - - 0 1',
      orientation: 'white',
      highlights: ['a8', 'a7', 'b7', 'b8'],
      arrows: [],
    },
    level: 'beginner',
    sources: [FIDE_LAWS, WIKI_GLOSSARY, `${CHESSCOM_ES}ahogado-ajedrez`],
  },
  {
    id: 'castling',
    name: { es: 'Enroque', en: 'Castling' },
    definition: {
      es: 'Jugada especial en la que el rey se desplaza dos casillas hacia una de sus torres y esa torre salta al otro lado del rey, todo en un solo turno. Solo vale si ni el rey ni esa torre se han movido, no hay nada entre ellos y el rey no está en [jaque](check) ni cruza o pisa una casilla atacada.',
      en: 'A special move in which the king slides two squares towards one of its rooks and that rook jumps over to the king’s other side, all in one turn. It is only allowed if neither of the two has moved yet, nothing stands between them, and the king is not in [check](check) and does not cross or land on an attacked square.',
    },
    example: {
      fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      orientation: 'white',
      highlights: ['e1', 'h1'],
      arrows: [
        { from: 'e1', to: 'g1', move: true },
        { from: 'h1', to: 'f1', move: false },
      ],
    },
    level: 'beginner',
    sources: [FIDE_LAWS, WIKI_GLOSSARY, `${CHESSCOM_ES}enroque-ajedrez`],
  },
  {
    id: 'promotion',
    name: { es: 'Coronación', en: 'Promotion' },
    definition: {
      es: 'Cuando un peón llega al otro extremo del tablero, en ese mismo turno se cambia por una dama, una torre, un alfil o un caballo de su color, a elección de quien juega. Casi siempre se elige la dama.',
      en: 'When a pawn reaches the far end of the board, in that same turn it is swapped for a queen, rook, bishop or knight of its colour, whichever the player chooses. The queen is nearly always the choice.',
    },
    example: {
      fen: '8/4P3/8/8/8/k7/8/K7 w - - 0 1',
      orientation: 'white',
      highlights: ['e8'],
      arrows: [{ from: 'e7', to: 'e8', move: false }],
    },
    level: 'beginner',
    sources: [FIDE_LAWS, WIKI_GLOSSARY, `${CHESSCOM_ES}coronacion-ajedrez`],
  },
  {
    id: 'queening-square',
    name: { es: 'Casilla de coronación', en: 'Queening square' },
    definition: {
      es: 'La casilla del otro extremo del tablero a la que llega un peón avanzando por su columna, donde se [corona](promotion). Para un peón blanco de la columna d es d8.',
      en: 'The square at the far end of the board that a pawn reaches by moving straight up its column, where it [promotes](promotion). For a white pawn on the d column it is d8.',
    },
    example: {
      fen: '8/8/8/3P4/8/8/k7/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['d8'],
      arrows: [{ from: 'd5', to: 'd8', move: false }],
    },
    level: 'beginner',
    sources: [WIKI_KP_ENDGAME, `${WIKI}Philidor_position`, `${WIKI}Chess_endgame`],
  },

  // ─── Opening and strategy ────────────────────────────────────────────────────────────────────
  {
    id: 'centre',
    name: { es: 'Centro', en: 'Centre' },
    definition: {
      es: 'Las cuatro casillas del medio del tablero: d4, e4, d5 y e5. Quien las ocupa o las domina con peones y piezas suele moverse con más facilidad por todo el tablero.',
      en: 'The four squares in the middle of the board: d4, e4, d5 and e5. Whoever holds or controls them with pawns and pieces usually finds it easier to move around the whole board.',
    },
    example: {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      orientation: 'white',
      highlights: ['d4', 'e4', 'd5', 'e5'],
      arrows: [],
    },
    level: 'beginner',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_EN}chess-center`],
  },
  {
    id: 'development',
    name: { es: 'Desarrollo', en: 'Development' },
    definition: {
      es: 'Sacar los caballos y los alfiles, y más tarde la dama y las torres, de sus casillas de salida para ponerlos a trabajar. Es la tarea principal de las primeras jugadas, junto con luchar por el [centro](centre) y hacer el [enroque](castling).',
      en: 'Bringing the knights and bishops, and later the queen and rooks, out of their starting squares so they can join the game. It is the main job of the first moves, along with fighting for the [centre](centre) and [castling](castling).',
    },
    example: {
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      orientation: 'white',
      highlights: ['f3', 'c6'],
      arrows: [{ from: 'f1', to: 'c4', move: true }],
    },
    level: 'beginner',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_EN}chess-openings`],
  },
  {
    id: 'exchange',
    name: { es: 'Cambio', en: 'Exchange' },
    definition: {
      es: 'Capturar una pieza del rival y dejar que él capture una propia de valor parecido, por ejemplo un alfil por un caballo. Las fuerzas siguen igualadas, pero la posición cambia.',
      en: 'Capturing an enemy piece and letting the opponent capture one of yours of similar value, such as a bishop for a knight; also called a trade. The forces stay even, but the position changes.',
    },
    example: {
      fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
      orientation: 'white',
      highlights: ['b5', 'c6'],
      arrows: [{ from: 'b5', to: 'c6', move: true }],
    },
    level: 'beginner',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_ES}el-valor-de-las-piezas-de-ajedrez`],
  },
  {
    id: 'gambit',
    name: { es: 'Gambito', en: 'Gambit' },
    definition: {
      es: 'Entregar un peón, o a veces más, al principio de la partida para conseguir a cambio tiempo, [desarrollo](development) o el [centro](centre). Es un [sacrificio](sacrifice) hecho a propósito desde las primeras jugadas.',
      en: 'Giving away a pawn, or sometimes more, at the start of the game to get time, [development](development) or the [centre](centre) in return. It is a [sacrifice](sacrifice) made on purpose in the very first moves.',
    },
    example: {
      fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
      orientation: 'white',
      highlights: ['c4'],
      arrows: [{ from: 'd5', to: 'c4', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Gambit`],
  },
  {
    id: 'fianchetto',
    name: { es: 'Fianchetto', en: 'Fianchetto' },
    definition: {
      es: 'Colocar un alfil en una [gran diagonal](long-diagonal), en la casilla que queda justo delante de la salida de su caballo, tras adelantar un paso el peón que había allí. Desde ahí el alfil apunta a través del [centro](centre) hacia la esquina contraria.',
      en: 'Placing a bishop on a [long diagonal](long-diagonal), on the square just in front of its knight’s starting square, after pushing the pawn that stood there one step. From there the bishop aims across the [centre](centre) towards the opposite corner.',
    },
    example: {
      fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/8/6P1/PPPPPPBP/RNBQK1NR w KQkq - 2 3',
      orientation: 'white',
      highlights: ['g2', 'g3'],
      arrows: [{ from: 'g2', to: 'd5', move: false }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Fianchetto`, `${CHESSCOM_ES}fianchetto-ajedrez`],
  },
  {
    id: 'long-diagonal',
    name: { es: 'Gran diagonal', en: 'Long diagonal' },
    definition: {
      es: 'Cada una de las dos diagonales que cruzan el tablero de esquina a esquina, de a1 a h8 y de h1 a a8. Son las más largas, con ocho casillas, y las dos pasan por el [centro](centre).',
      en: 'Either of the two diagonals that cross the board from corner to corner, from a1 to h8 and from h1 to a8. They are the longest, with eight squares each, and both run through the [centre](centre).',
    },
    example: {
      fen: '4k3/8/8/8/8/8/1B6/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['a1', 'h8'],
      arrows: [{ from: 'b2', to: 'h8', move: false }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Fianchetto`],
  },
  {
    id: 'flank',
    name: { es: 'Flanco', en: 'Flank' },
    definition: {
      es: 'Cada uno de los dos lados del tablero, fuera del [centro](centre). El flanco de dama son las columnas a, b y c; el flanco de rey, las columnas f, g y h.',
      en: 'Either side of the board, away from the [centre](centre). The queenside is made up of the a, b and c columns; the kingside, of the f, g and h columns.',
    },
    example: {
      fen: START,
      orientation: 'white',
      highlights: ['a2', 'b2', 'c2', 'f2', 'g2', 'h2'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_ES}fianchetto-ajedrez`],
  },
  {
    id: 'space',
    name: { es: 'Espacio', en: 'Space' },
    definition: {
      es: 'Las casillas que domina cada bando, sobre todo en la mitad del tablero del rival. Tener más espacio da sitio a las piezas propias para maniobrar y deja apretadas las del otro.',
      en: 'The squares each side controls, above all in the opponent’s half of the board. Having more space gives your pieces room to manoeuvre and leaves the other side’s pieces cramped.',
    },
    example: {
      fen: 'rnbqk2r/ppp1ppbp/3p1np1/8/2PPPP2/2N5/PP4PP/R1BQKBNR b KQkq - 0 5',
      orientation: 'white',
      highlights: ['c4', 'd4', 'e4', 'f4'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_ES}estrategia`],
  },
  {
    id: 'initiative',
    name: { es: 'Iniciativa', en: 'Initiative' },
    definition: {
      es: 'Llevar la voz cantante: hacer amenazas que el rival tiene que atender, de forma que él va respondiendo y no puede seguir sus propios planes.',
      en: 'Setting the pace of the game: making threats the opponent has to deal with, so that they keep reacting instead of carrying out their own plans.',
    },
    example: {
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
      orientation: 'white',
      highlights: ['f7'],
      arrows: [
        { from: 'g5', to: 'f7', move: false },
        { from: 'c4', to: 'f7', move: false },
      ],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Initiative_(chess)`],
  },
  {
    id: 'counterplay',
    name: { es: 'Contrajuego', en: 'Counterplay' },
    definition: {
      es: 'Juego activo del bando que se defiende: amenazas propias, a menudo en el otro [flanco](flank), que impiden al rival dedicarse solo a atacar.',
      en: 'Active play by the defending side: threats of its own, often on the other [flank](flank), that stop the opponent from simply getting on with the attack.',
    },
    example: {
      fen: '5rk1/5ppp/8/p7/1p4PP/8/PPP5/2KR3R b - - 0 1',
      orientation: 'black',
      highlights: ['a5', 'b4', 'c1'],
      arrows: [{ from: 'b4', to: 'b3', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_ES}estrategia`],
  },
  {
    id: 'pawn-structure',
    name: { es: 'Estructura de peones', en: 'Pawn structure' },
    definition: {
      es: 'Cómo están colocados los peones de los dos bandos. Como un peón nunca retrocede, esa colocación cambia despacio y marca los planes de la partida: dónde atacar, dónde defender y qué piezas estarán a gusto.',
      en: 'The way both sides’ pawns are arranged. Since a pawn can never move back, that arrangement changes slowly and shapes the plans of the game: where to attack, where to defend and which pieces will feel at home.',
    },
    example: {
      fen: '4k3/pp3ppp/2p5/3p4/3P4/4P3/PP3PPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['d4', 'e3', 'd5', 'c6'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_PAWN_STRUCTURE],
  },
  {
    id: 'pawn-chain',
    name: { es: 'Cadena de peones', en: 'Pawn chain' },
    definition: {
      es: 'Varios peones del mismo color en diagonal, cada uno protegiendo al de delante. El último de la fila, la base, es su punto débil, porque no lo protege ningún peón.',
      en: 'Several pawns of the same colour in a diagonal line, each guarding the one in front of it. The one at the back, the base, is its weak point, because no pawn guards it.',
    },
    example: {
      fen: '4k3/8/4p3/3pP3/3P4/2P5/8/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c3', 'd4', 'e5'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_PAWN_STRUCTURE],
  },
  {
    id: 'pawn-break',
    name: { es: 'Ruptura', en: 'Pawn break' },
    definition: {
      es: 'Adelantar un peón hasta donde puede capturar un peón rival o ser capturado por él, para abrir líneas o romper la [estructura de peones](pawn-structure) contraria.',
      en: 'Pushing a pawn to where it can capture an enemy pawn or be captured by it, in order to open lines or break up the opponent’s [pawn structure](pawn-structure).',
    },
    example: {
      fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
      orientation: 'black',
      highlights: ['d4'],
      arrows: [{ from: 'c7', to: 'c5', move: true }],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_PAWN_STRUCTURE],
  },
  {
    id: 'isolated-pawn',
    name: { es: 'Peón aislado', en: 'Isolated pawn' },
    definition: {
      es: 'Peón que no tiene peones de su color en las columnas de al lado. Ningún peón podrá protegerlo nunca, así que tienen que hacerlo las piezas.',
      en: 'A pawn with no pawns of its own colour on the columns next to it. No pawn can ever guard it, so pieces have to do that job.',
    },
    example: {
      fen: '4k3/pp3ppp/4p3/8/3P4/8/PP3PPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['d4'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, `${WIKI}Isolated_pawn`],
  },
  {
    id: 'doubled-pawns',
    name: { es: 'Peones doblados', en: 'Doubled pawns' },
    definition: {
      es: 'Dos peones del mismo color en la misma columna, uno delante del otro. Suele ser una debilidad: no pueden protegerse entre sí y el de delante le corta el paso al de detrás.',
      en: 'Two pawns of the same colour on the same column, one in front of the other. It is usually a weakness: they cannot guard each other, and the front one blocks the one behind.',
    },
    example: {
      fen: '4k3/pp3ppp/8/8/8/2P5/P1P2PPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c2', 'c3'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, `${WIKI}Doubled_pawns`],
  },
  {
    id: 'hanging-pawns',
    name: { es: 'Peones colgantes', en: 'Hanging pawns' },
    definition: {
      es: 'Dos peones del mismo color en columnas vecinas, sin más peones propios en las columnas de alrededor. Dan fuerza en el [centro](centre) mientras aguantan juntos, pero pueden convertirse en un blanco.',
      en: 'Two pawns of the same colour on neighbouring columns, with no other friendly pawns on the columns around them. They give strength in the [centre](centre) while they hold together, but they can turn into a target.',
    },
    example: {
      fen: '4k3/p4ppp/4p3/8/2PP4/8/P4PPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c4', 'd4'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_PAWN_STRUCTURE],
  },
  {
    id: 'bishop-pair',
    name: { es: 'Pareja de alfiles', en: 'Bishop pair' },
    definition: {
      es: 'Conservar los dos alfiles cuando el rival ya ha perdido uno de los suyos. Juntos llegan a casillas de los dos colores y, en posiciones abiertas, con pocos peones estorbando, suelen valer algo más que alfil y caballo o dos caballos.',
      en: 'Keeping both bishops when the opponent has already lost one of theirs. Together they reach squares of both colours and, in open positions with few pawns in the way, they are usually worth a little more than bishop and knight or two knights.',
    },
    example: {
      fen: '4k3/pp3ppp/2n1b3/8/8/2B5/PP2BPPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c3', 'e2'],
      arrows: [],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, `${CHESSCOM_ES}el-valor-de-las-piezas-de-ajedrez`],
  },
  {
    id: 'minority-attack',
    name: { es: 'Ataque de minorías', en: 'Minority attack' },
    definition: {
      es: 'Adelantar los peones de un [flanco](flank) donde se tienen menos que el rival, por ejemplo dos contra tres, para [cambiarlos](exchange) y dejarle a él un peón débil.',
      en: 'Advancing the pawns on a [flank](flank) where you have fewer than the opponent, for example two against three, to [trade](exchange) them off and leave the opponent with a weak pawn.',
    },
    example: {
      fen: '4k3/pp3ppp/2p5/3p4/1P1P4/4P3/P4PPP/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['b4', 'c6'],
      arrows: [{ from: 'b4', to: 'b5', move: true }],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, `${WIKI}Minority_attack`],
  },

  // ─── Tactics ─────────────────────────────────────────────────────────────────────────────────
  {
    id: 'tempo',
    name: { es: 'Tiempo', en: 'Tempo' },
    definition: {
      es: 'Una jugada vista como unidad de tiempo. Se gana un tiempo cuando el rival malgasta una jugada, por ejemplo porque tiene que retirar una pieza atacada, y se pierde cuando le pasa a uno mismo.',
      en: 'A single move seen as a unit of time. You gain a tempo when the opponent wastes a move, for example by having to pull back a piece you attacked, and you lose one when the same happens to you.',
    },
    example: {
      fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3',
      orientation: 'white',
      highlights: ['d5', 'c3'],
      arrows: [{ from: 'c3', to: 'd5', move: false }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Tempo_(chess)`],
  },
  {
    id: 'intermediate-move',
    name: { es: 'Jugada intermedia', en: 'In-between move' },
    definition: {
      es: 'En lugar de hacer la jugada que parece obligada, como recuperar una pieza, se juega antes otra que el rival tiene que atender, a menudo un [jaque](check), y solo después se hace la esperada.',
      en: 'Instead of making the move that seems forced, such as taking back a piece, you first play another one the opponent has to answer, often a [check](check), and only then make the expected move.',
    },
    example: {
      fen: '5rk1/pp4pp/5p2/8/8/2b5/PP3PPP/3Q1RK1 w - - 0 1',
      orientation: 'white',
      highlights: ['c3', 'g8'],
      arrows: [{ from: 'd1', to: 'b3', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      `${WIKI}Zwischenzug`,
      'https://lichess.org/practice/fundamental-tactics/zwischenzug/ITWY4GN2',
      `${CHESSCOM_ES}jugada-intermedia-ajedrez`,
    ],
  },
  {
    id: 'pin',
    name: { es: 'Clavada', en: 'Pin' },
    definition: {
      es: 'Una pieza no puede moverse, o no le conviene, porque detrás de ella, en la misma línea, hay otra más valiosa que quedaría atacada. Si la de detrás es el rey, moverse ni siquiera está permitido.',
      en: 'A piece cannot move, or should not, because behind it on the same line stands a more valuable piece that would then be under attack. If the piece behind is the king, moving is not even allowed.',
    },
    example: {
      fen: '8/8/5k2/8/8/2n5/8/B3K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c3', 'f6'],
      arrows: [{ from: 'a1', to: 'f6', move: false }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/fundamental-tactics/the-pin/9ogFv8Ac',
      `${CHESSCOM_ES}clavada`,
    ],
  },
  {
    id: 'fork',
    name: { es: 'Ataque doble', en: 'Fork' },
    definition: {
      es: 'Una sola pieza ataca a la vez a dos o más piezas del rival, que no puede salvarlas todas en una jugada.',
      en: 'A single piece attacks two or more enemy pieces at the same time, and the opponent cannot save them all in one move.',
    },
    example: {
      fen: 'r5k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1',
      orientation: 'white',
      highlights: ['a8', 'g8'],
      arrows: [{ from: 'd1', to: 'd5', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, LICHESS_FORK, `${CHESSCOM_ES}ataque-doble`],
  },
  {
    id: 'knight-fork',
    name: { es: 'Horquilla de caballo', en: 'Knight fork' },
    definition: {
      es: '[Ataque doble](fork) hecho por un caballo. Es muy frecuente porque el caballo salta y ataca de una forma que no comparte ninguna otra pieza, así que las piezas atacadas no pueden devolverle el golpe, salvo que una de ellas sea otro caballo.',
      en: 'A [fork](fork) made by a knight. It is very common because the knight jumps and attacks in a pattern no other piece shares, so the pieces it hits cannot hit it back unless one of them is also a knight.',
    },
    example: {
      fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
      orientation: 'white',
      highlights: ['a8', 'e8'],
      arrows: [{ from: 'b5', to: 'c7', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, LICHESS_FORK, `${WIKI}Fork_(chess)`],
  },
  {
    id: 'skewer',
    name: { es: 'Ensartada', en: 'Skewer' },
    definition: {
      es: 'Se ataca a una pieza valiosa que, al apartarse, deja al descubierto otra que estaba detrás en la misma línea, y esa es la que cae. Es como una [clavada](pin) al revés: la pieza de delante es la que más vale.',
      en: 'A valuable piece is attacked and, when it steps aside, it uncovers another piece behind it on the same line, which is then taken. It is like a [pin](pin) turned around: the piece in front is the more valuable one.',
    },
    example: {
      fen: '8/8/8/2k3q1/8/8/8/R3K3 w - - 0 1',
      orientation: 'white',
      highlights: ['c5', 'g5'],
      arrows: [{ from: 'a1', to: 'a5', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/fundamental-tactics/the-skewer/tuoBxVE5',
      `${WIKI}Skewer_(chess)`,
    ],
  },
  {
    id: 'double-check',
    name: { es: 'Jaque doble', en: 'Double check' },
    definition: {
      es: '[Jaque](check) de dos piezas a la vez: una se mueve y da jaque y, al apartarse, destapa el de otra. Como no se pueden tapar ni capturar las dos a la vez, el rey está obligado a moverse.',
      en: 'A [check](check) from two pieces at once: one piece moves and gives check and, by stepping aside, uncovers a check from another. Since both cannot be blocked or captured together, the king is forced to move.',
    },
    example: {
      fen: '4k3/8/8/8/4B3/8/8/4RK2 w - - 0 1',
      orientation: 'white',
      highlights: ['e8', 'e1'],
      arrows: [{ from: 'e4', to: 'g6', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/fundamental-tactics/double-check/RUQASaZm',
      `${WIKI}Double_check`,
    ],
  },
  {
    id: 'discovered-attack',
    name: { es: 'Ataque a la descubierta', en: 'Discovered attack' },
    definition: {
      es: 'Una pieza se aparta y deja libre la línea de otra pieza de su mismo bando (dama, torre o alfil), que pasa a atacar. Si la que se mueve también amenaza algo, el rival tiene dos problemas a la vez.',
      en: 'A piece moves out of the way and opens the line of another piece of the same side (a queen, rook or bishop), which now attacks. If the piece that moved also threatens something, the opponent has two problems at once.',
    },
    example: {
      fen: '3q1k2/8/8/8/3N4/8/8/3QK3 w - - 0 1',
      orientation: 'white',
      highlights: ['d8', 'f8'],
      arrows: [
        { from: 'd4', to: 'e6', move: true },
        { from: 'd1', to: 'd8', move: false },
      ],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/fundamental-tactics/discovered-attacks/MnsJEWnI',
      `${WIKI}Discovered_attack`,
    ],
  },
  {
    id: 'deflection',
    name: { es: 'Desviación', en: 'Deflection' },
    definition: {
      es: 'Obligar a una pieza rival a abandonar su tarea de defensa, normalmente ofreciéndole algo que capturar o atacándola, para aprovechar lo que deja sin proteger.',
      en: 'Forcing an enemy piece to give up its defensive job, usually by offering it something to capture or by attacking it, so as to exploit whatever it leaves unguarded.',
    },
    example: {
      fen: '1r6/1P4k1/P7/8/8/8/8/2R3K1 w - - 0 1',
      orientation: 'white',
      highlights: ['b8', 'b7'],
      arrows: [{ from: 'c1', to: 'c8', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/advanced-tactics/deflection/kdKpaYLW',
      `${WIKI}Deflection_(chess)`,
    ],
  },
  {
    id: 'attraction',
    name: { es: 'Atracción', en: 'Attraction' },
    definition: {
      es: 'Obligar a una pieza rival, a menudo el rey, a ir a una casilla concreta mediante un [sacrificio](sacrifice), porque allí se la puede atacar mejor, por ejemplo con un [ataque doble](fork).',
      en: 'Luring an enemy piece, often the king, onto a particular square by means of a [sacrifice](sacrifice), because there it can be hit harder, for instance with a [fork](fork).',
    },
    example: {
      fen: '6k1/6pp/1q6/4N3/8/8/6PP/5R1K w - - 0 1',
      orientation: 'white',
      highlights: ['f8', 'd7'],
      arrows: [{ from: 'f1', to: 'f8', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      'https://lichess.org/practice/advanced-tactics/attraction/jOZejFWk',
      `${WIKI}Decoy_(chess)`,
    ],
  },
  {
    id: 'back-rank',
    name: { es: 'Última fila', en: 'Back rank' },
    definition: {
      es: 'La fila del borde del tablero en el lado de cada jugador, donde empiezan sus piezas. Si el rey se queda en ella detrás de sus peones sin salida, una torre o la dama rival puede darle [jaque mate](checkmate) a lo largo de esa fila.',
      en: 'The row (rank) along each player’s own edge of the board, where their pieces start. If the king stays there behind its pawns with no way out, an enemy rook or queen can deliver [checkmate](checkmate) along that row.',
    },
    example: {
      fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      orientation: 'white',
      highlights: ['g8', 'f7', 'g7', 'h7'],
      arrows: [{ from: 'd1', to: 'd8', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      `${WIKI}Back-rank_checkmate`,
      LICHESS_MATES_I,
      `${CHESSCOM_ES}mate-pasillo-ajedrez`,
    ],
  },
  {
    id: 'sacrifice',
    name: { es: 'Sacrificio', en: 'Sacrifice' },
    definition: {
      es: 'Entregar a propósito un peón o una pieza a cambio de otra clase de ventaja: un ataque, tiempo o una posición mejor. Si sale bien, se recupera más de lo que se dio.',
      en: 'Giving up a pawn or a piece on purpose in return for another kind of advantage: an attack, time or a better position. If it works, you get back more than you gave.',
    },
    example: {
      fen: '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1',
      orientation: 'white',
      highlights: ['b6'],
      arrows: [{ from: 'b5', to: 'b6', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}Sacrifice_(chess)`, `${CHESSCOM_ES}sacrificio`],
  },
  {
    id: 'queen-sacrifice',
    name: { es: 'Sacrificio de dama', en: 'Queen sacrifice' },
    definition: {
      es: '[Sacrificio](sacrifice) de la dama, la pieza más valiosa después del rey. Suele llevar a un [jaque mate](checkmate) o a recuperar todavía más de lo entregado.',
      en: 'A [sacrifice](sacrifice) of the queen, the most valuable piece after the king. It usually leads to [checkmate](checkmate) or to winning back even more than was given.',
    },
    example: {
      fen: '2kr4/pp1nqppp/2n5/8/5B2/5Q2/PPP1BPPP/6K1 w - - 0 1',
      orientation: 'white',
      highlights: ['c6', 'c8'],
      arrows: [{ from: 'f3', to: 'c6', move: true }],
    },
    level: 'intermediate',
    sources: [`${WIKI}Queen_sacrifice`, WIKI_GLOSSARY, `${CHESSCOM_ES}sacrificio`],
  },
  {
    id: 'opening-trap',
    name: { es: 'Trampa de apertura', en: 'Opening trap' },
    definition: {
      es: 'Serie de jugadas del principio de la partida en la que una respuesta natural pero mala del rival le hace perder piezas o recibir [jaque mate](checkmate) enseguida.',
      en: 'A sequence of moves early in the game in which a natural-looking but bad reply quickly costs the opponent pieces or gets them [checkmated](checkmate).',
    },
    example: {
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
      orientation: 'white',
      highlights: ['f7', 'f6'],
      arrows: [{ from: 'h5', to: 'f7', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_GLOSSARY, `${WIKI}List_of_chess_traps`, `${CHESSCOM_ES}mate-del-pastor`],
  },
  {
    id: 'smothered-mate',
    name: { es: 'Mate de la coz', en: 'Smothered mate' },
    definition: {
      es: '[Jaque mate](checkmate) dado por un caballo a un rey que no puede escapar porque sus propias piezas le ocupan todas las casillas de alrededor.',
      en: '[Checkmate](checkmate) given by a knight to a king that cannot escape because its own pieces fill every square around it.',
    },
    example: {
      fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
      orientation: 'white',
      highlights: ['h8', 'g8', 'g7', 'h7'],
      arrows: [{ from: 'g5', to: 'f7', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      `${WIKI}Smothered_mate`,
      LICHESS_MATES_I,
      `${CHESSCOM_ES}mate-de-la-coz`,
    ],
  },
  {
    id: 'legal-mate',
    name: { es: 'Mate de Légal', en: 'Légal’s mate' },
    definition: {
      es: '[Trampa de apertura](opening-trap) en la que se ofrece la dama: si el rival la captura, dos caballos y un alfil le dan [jaque mate](checkmate) pocas jugadas después. Lleva el nombre de Légal, un jugador francés del siglo XVIII.',
      en: 'An [opening trap](opening-trap) in which the queen is offered: if the opponent takes it, two knights and a bishop give [checkmate](checkmate) a few moves later. It is named after Légal, a French player of the 18th century.',
    },
    example: {
      fen: 'r2q1bnr/ppp1kBpp/2np4/4N3/4P3/2N4P/PPPP1PP1/R1BbK2R w KQ - 1 8',
      orientation: 'white',
      highlights: ['e7', 'd1'],
      arrows: [{ from: 'c3', to: 'd5', move: true }],
    },
    level: 'intermediate',
    sources: [`${WIKI}Legal_Trap`, LICHESS_MATES_IV, `${CHESSCOM_ES}mate-de-legal`],
  },
  {
    id: 'boden-mate',
    name: { es: 'Mate de Boden', en: 'Boden’s mate' },
    definition: {
      es: '[Jaque mate](checkmate) de dos alfiles cuyas diagonales se cruzan delante del rey, que casi siempre se ha [enrocado](castling) en el lado de la dama y está encerrado por sus propias piezas. Suele llegar después de un [sacrificio de dama](queen-sacrifice).',
      en: '[Checkmate](checkmate) by two bishops whose diagonals cross in front of the king, which has usually [castled](castling) on the queen’s side and is boxed in by its own pieces. It often comes right after a [queen sacrifice](queen-sacrifice).',
    },
    example: {
      fen: '2kr4/p2nqppp/2p5/8/5B2/8/PPP1BPPP/6K1 w - - 0 2',
      orientation: 'white',
      highlights: ['c8', 'f4'],
      arrows: [{ from: 'e2', to: 'a6', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_MATES, LICHESS_MATES_II, `${CHESSCOM_EN}bodens-mate-chess`],
  },
  {
    id: 'anastasia-mate',
    name: { es: 'Mate de Anastasia', en: 'Anastasia’s mate' },
    definition: {
      es: '[Jaque mate](checkmate) en el que un caballo y una torre encierran al rey contra un lado del tablero: el caballo le corta la huida y la torre da el jaque por la columna del borde. Un peón del propio rey suele taparle la última salida.',
      en: '[Checkmate](checkmate) in which a knight and a rook trap the king against one side of the board: the knight cuts off its escape and the rook gives check along the edge column. One of the king’s own pawns usually blocks the last way out.',
    },
    example: {
      fen: 'r7/4N1pk/8/3R4/8/8/5PPP/6K1 w - - 0 1',
      orientation: 'white',
      highlights: ['h7', 'e7', 'g7'],
      arrows: [{ from: 'd5', to: 'h5', move: true }],
    },
    level: 'intermediate',
    sources: [WIKI_MATES, LICHESS_MATES_I, `${CHESSCOM_EN}anastasias-mate-chess`],
  },
  {
    id: 'arabian-mate',
    name: { es: 'Mate árabe', en: 'Arabian mate' },
    definition: {
      es: '[Jaque mate](checkmate) de torre y caballo contra un rey arrinconado en una esquina: la torre, pegada al rey, da el jaque, y el caballo la protege y vigila la casilla de escape que queda. Ya aparece en antiguos manuscritos árabes.',
      en: '[Checkmate](checkmate) by a rook and a knight against a king stuck in a corner: the rook, right next to the king, gives check, and the knight protects it and covers the one escape square left. It already appears in old Arabic manuscripts.',
    },
    example: {
      fen: '7k/R7/5N2/8/8/8/5PPP/6K1 w - - 0 1',
      orientation: 'white',
      highlights: ['h8', 'f6'],
      arrows: [{ from: 'a7', to: 'h7', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_MATES,
      `${WIKI}Arabian_mate`,
      LICHESS_MATES_II,
      `${CHESSCOM_EN}arabian-mate-chess`,
    ],
  },

  // ─── Endgames ────────────────────────────────────────────────────────────────────────────────
  {
    id: 'opposition',
    name: { es: 'Oposición', en: 'Opposition' },
    definition: {
      es: 'Los dos reyes están en la misma columna o fila con una sola casilla entre ellos. Como no pueden acercarse más, el que tiene que mover debe ceder el paso, y se dice que el otro tiene la oposición.',
      en: 'The two kings stand on the same column or row with exactly one square between them. Since they cannot come any closer, the one who has to move must give way, and the other side is said to have the opposition.',
    },
    example: {
      fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1',
      orientation: 'white',
      highlights: ['e4', 'e6'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      `${WIKI}Opposition_(chess)`,
      'https://lichess.org/practice/pawn-endgames/opposition/A4ujYOer',
    ],
  },
  {
    id: 'key-squares',
    name: { es: 'Casillas clave', en: 'Key squares' },
    definition: {
      es: 'En los finales con solo reyes y peones, casillas que, si el rey del bando más fuerte llega a una de ellas, le aseguran un objetivo, normalmente [coronar](promotion) su peón, haga lo que haga el rival.',
      en: 'In endgames with only kings and pawns, squares that guarantee a goal, usually [promoting](promotion) the pawn, once the stronger side’s king reaches one of them, whatever the opponent does.',
    },
    example: {
      fen: '4k3/8/3K4/8/4P3/8/8/8 b - - 0 1',
      orientation: 'white',
      highlights: ['d6', 'e6', 'f6'],
      arrows: [],
    },
    level: 'intermediate',
    sources: [
      WIKI_GLOSSARY,
      `${WIKI}Key_square`,
      'https://lichess.org/practice/pawn-endgames/key-squares/xebrDvFe',
    ],
  },
  {
    id: 'rule-of-the-square',
    name: { es: 'Regla del cuadrado', en: 'Rule of the square' },
    definition: {
      es: 'Truco para saber si un rey alcanza a un peón que corre solo a [coronar](promotion): se imagina un cuadrado cuyo lado va del peón a su [casilla de coronación](queening-square). Si el rey puede entrar en él en su turno, lo alcanza; si no, el peón corona.',
      en: 'A shortcut to tell whether a king can catch a lone pawn racing to [promote](promotion): picture a square whose side runs from the pawn to its [queening square](queening-square). If the king can step inside it on its turn, it catches the pawn; if not, the pawn promotes.',
    },
    example: {
      fen: '8/8/6k1/8/1P6/8/8/7K b - - 0 1',
      orientation: 'black',
      highlights: ['b4', 'b8', 'f8', 'f4'],
      arrows: [{ from: 'g6', to: 'f6', move: true }],
    },
    level: 'intermediate',
    sources: [
      WIKI_KP_ENDGAME,
      'https://es.wikipedia.org/wiki/Regla_del_cuadrado_(ajedrez)',
      `${CHESSCOM_EN}square-rule-chess`,
    ],
  },
  {
    id: 'lucena-position',
    name: { es: 'Posición de Lucena', en: 'Lucena position' },
    definition: {
      es: 'Final de torre y peón contra torre que gana el bando del peón: el peón está a un paso de [coronar](promotion), su rey está delante de él y su torre mantiene alejado al rey rival. Se gana [construyendo un puente](building-a-bridge) con la torre.',
      en: 'A rook and pawn against rook endgame that the side with the pawn wins: the pawn is one step from [promoting](promotion), its king stands in front of it and its rook keeps the enemy king away. The win comes from [building a bridge](building-a-bridge) with the rook.',
    },
    example: {
      fen: '3K4/3P2k1/8/8/8/8/2r5/5R2 w - - 0 1',
      orientation: 'white',
      highlights: ['d8', 'd7'],
      arrows: [{ from: 'f1', to: 'f4', move: true }],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_LUCENA, WIKI_ROOK_ENDGAME, LICHESS_ROOK_ENDGAMES],
  },
  {
    id: 'philidor-position',
    name: { es: 'Posición de Philidor', en: 'Philidor position' },
    definition: {
      es: 'Final de torre y peón contra torre que el bando que defiende consigue empatar: su rey está en la [casilla de coronación](queening-square) y su torre, en la tercera fila desde su lado, no deja avanzar al rey rival. Cuando el peón pisa esa fila, la torre se va al otro extremo del tablero y da [jaques](check) por detrás.',
      en: 'A rook and pawn against rook endgame that the defending side draws: its king sits on the [queening square](queening-square) and its rook, on the third row from its own side, keeps the enemy king from coming forward. Once the pawn steps onto that row, the rook goes to the far end of the board and gives [checks](check) from behind.',
    },
    example: {
      fen: '4k3/R7/1r6/3KP3/8/8/8/8 w - - 0 1',
      orientation: 'black',
      highlights: ['e8', 'b6'],
      arrows: [{ from: 'b6', to: 'h6', move: false }],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, `${WIKI}Philidor_position`, WIKI_ROOK_ENDGAME, LICHESS_ROOK_ENDGAMES],
  },
  {
    id: 'building-a-bridge',
    name: { es: 'Construir un puente', en: 'Building a bridge' },
    definition: {
      es: 'La forma de ganar la [posición de Lucena](lucena-position): la torre se coloca en la cuarta fila para que, cuando el rey salga de delante del peón, pueda interponerse y cortar los [jaques](check) de la torre rival.',
      en: 'The way to win the [Lucena position](lucena-position): the rook goes to the fourth row so that, once the king walks out from in front of the pawn, it can step in between and stop the enemy rook’s [checks](check).',
    },
    example: {
      fen: '8/3P2k1/8/3K4/5R2/8/8/3r4 w - - 10 6',
      orientation: 'white',
      highlights: ['d5', 'd4'],
      arrows: [{ from: 'f4', to: 'd4', move: true }],
    },
    level: 'advanced',
    sources: [WIKI_GLOSSARY, WIKI_LUCENA, LICHESS_ROOK_ENDGAMES],
  },
];
