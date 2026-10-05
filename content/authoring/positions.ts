// Curated tactical positions. Positions taken from games are rebuilt by replaying the game moves
// with chessops (see build.ts), so the stored FEN can never drift from the move record.
import type { CuratedPosition, Localized } from '../types.ts';

export type PositionSpec = Omit<CuratedPosition, 'fen' | 'explanation'> & {
  explanation: Localized;
} & ({ fen: string } | { moves: string; gameEnd?: string });

export const positions: PositionSpec[] = [
  {
    id: 'legal-mate',
    title: { es: 'Mate de Légal', en: 'Légal’s Mate' },
    moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1',
    playerSide: 'white',
    solution: ['Bxf7+', 'Ke7', 'Nd5#'],
    explanation: {
      es: 'Las negras se han llevado la dama, pero sus casillas alrededor del rey están indefensas. El alfil da [jaque](check) protegido por el caballo de e5, el rey solo puede ir a e7 y el otro caballo remata en d5.',
      en: 'Black has won the queen, but the squares around the king are undefended. The bishop [checks](check) with the support of the e5 knight, the king can only go to e7 and the other knight finishes on d5.',
    },
    tags: ['legal-mate', 'sacrifice', 'opening-trap'],
  },
  {
    id: 'reti-tartakower-1910',
    title: { es: 'Sacrificio de dama en d8', en: 'Queen sacrifice on d8' },
    source: 'Réti – Tartakower, Vienna 1910',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O Nxe4',
    gameEnd: 'Qd8+ Kxd8 Bg5+ Kc7 Bd8#',
    playerSide: 'white',
    solution: ['Qd8+', 'Kxd8', 'Bg5+', 'Kc7', 'Bd8#'],
    explanation: {
      es: 'La [dama se entrega](queen-sacrifice) para [atraer](attraction) al rey a d8, donde queda alineado con la torre de d1. Ag5 da [jaque doble](double-check) (alfil y torre) y el rey no tiene defensa: si ...Re8, Td8 es [mate](checkmate); si ...Rc7, Ad8 es mate.',
      en: 'The [queen is given up](queen-sacrifice) to [drag](attraction) the king to d8, in line with the d1 rook. Bg5 is a [double check](double-check) (bishop and rook) with no defence: after ...Ke8, Rd8 is [mate](checkmate); after ...Kc7, Bd8 is mate.',
    },
    tags: ['attraction', 'double-check', 'queen-sacrifice'],
  },
  {
    id: 'opera-game-1858',
    title: { es: 'La partida de la Ópera', en: 'The Opera Game' },
    source: 'Morphy – Duke Karl of Brunswick & Count Isouard, Paris 1858',
    moves:
      'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7',
    gameEnd: 'Qb8+ Nxb8 Rd8#',
    playerSide: 'white',
    solution: ['Qb8+', 'Nxb8', 'Rd8#'],
    explanation: {
      es: 'El caballo de d7 es el único defensor de d8. La [dama se sacrifica](queen-sacrifice) en b8 para [desviarlo](deflection) y la torre da [mate](checkmate) en la [octava fila](back-rank), apoyada por el alfil de g5.',
      en: 'The d7 knight is the only defender of d8. The [queen sacrifice](queen-sacrifice) on b8 [deflects](deflection) it and the rook [mates](checkmate) on the [back rank](back-rank), supported by the g5 bishop.',
    },
    tags: ['deflection', 'queen-sacrifice', 'back-rank'],
  },
  {
    id: 'kieninger-trap',
    title: { es: 'Trampa de Kieninger', en: 'Kieninger Trap' },
    moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4',
    playerSide: 'black',
    solution: ['Nd3#'],
    explanation: {
      es: 'Las blancas han ganado el alfil, pero el peón de e2 está [clavado](pin) por la dama de e7. El caballo salta a d3 con [jaque](check) y nadie puede capturarlo: el rey no tiene casillas libres.',
      en: 'White has won the bishop, but the e2 pawn is [pinned](pin) by the queen on e7. The knight jumps to d3 with [check](check) and nothing can take it: the king has no free squares.',
    },
    tags: ['pin', 'smothered-mate', 'opening-trap'],
  },
  {
    id: 'smothered-mate',
    title: { es: 'Mate de la coz', en: 'Smothered mate' },
    fen: '2q2r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1',
    playerSide: 'white',
    solution: ['Qg8+', 'Rxg8', 'Nf7#'],
    explanation: {
      es: 'La [dama se ofrece](queen-sacrifice) en g8, protegida por el caballo, para que la torre tape la última casilla libre del rey. El caballo da [mate](checkmate) en f7: el rey queda [ahogado](smothered-mate) por sus propias piezas.',
      en: 'The [queen is offered](queen-sacrifice) on g8, protected by the knight, so that the rook blocks the king’s last free square. The knight [mates](checkmate) on f7: the king is [smothered](smothered-mate) by its own pieces.',
    },
    tags: ['smothered-mate', 'queen-sacrifice', 'attraction'],
  },
  {
    id: 'evergreen-game-1852',
    title: { es: 'La Siempreviva', en: 'The Evergreen Game' },
    source: 'Anderssen – Dufresne, Berlin 1852',
    moves:
      'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7',
    gameEnd: 'Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
    playerSide: 'white',
    solution: ['Qxd7+', 'Kxd7', 'Bf5+', 'Ke8', 'Bd7+', 'Kf8', 'Bxe7#'],
    explanation: {
      es: 'Tras el [sacrificio de dama](queen-sacrifice), Af5 [descubre](discovered-attack) el jaque de la torre de d1: [jaque doble](double-check). Los dos alfiles y el peón de f6 cierran la red de [mate](checkmate) alrededor del rey negro.',
      en: 'After the [queen sacrifice](queen-sacrifice), Bf5 [uncovers](discovered-attack) the d1 rook: a [double check](double-check). The two bishops and the f6 pawn close the [mating](checkmate) net around the black king.',
    },
    tags: ['queen-sacrifice', 'double-check', 'discovered-attack'],
  },
  {
    id: 'boden-mate-1853',
    title: { es: 'Mate de Boden', en: 'Boden’s Mate' },
    source: 'Schulder – Boden, London 1853',
    moves:
      'e4 e5 Nf3 d6 c3 f5 Bc4 Nf6 d4 fxe4 dxe5 exf3 exf6 Qxf6 gxf3 Nc6 f4 Bd7 Be3 O-O-O Nd2 Re8 Qf3 Bf5 O-O-O d5 Bxd5',
    gameEnd: 'Qxc3+ bxc3 Ba3#',
    playerSide: 'black',
    solution: ['Qxc3+', 'bxc3', 'Ba3#'],
    explanation: {
      es: 'La [dama se sacrifica](queen-sacrifice) en c3 para abrir la diagonal a3-f8. Los dos alfiles, cruzados en diagonales, dan [mate](checkmate) al rey [enrocado](castling) largo, bloqueado por su propia torre y caballo.',
      en: 'The [queen sacrifice](queen-sacrifice) on c3 opens the a3-f8 diagonal. The two bishops on crossing diagonals [mate](checkmate) the [long-castled](castling) king, which is boxed in by its own rook and knight.',
    },
    tags: ['boden-mate', 'queen-sacrifice'],
  },
  {
    id: 'back-rank-battery',
    title: { es: 'Mate del pasillo', en: 'Back-rank mate' },
    fen: '4r1k1/3q1ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
    playerSide: 'white',
    solution: ['Qxe8+', 'Qxe8', 'Rxe8#'],
    explanation: {
      es: 'El rey negro no tiene casillas de escape porque sus peones siguen en la segunda fila. La batería en la columna e gana la lucha por e8: tras el [cambio](exchange), la torre da [mate](checkmate) en la [octava](back-rank).',
      en: 'The black king has no escape square because its pawns are still on their starting rank. The battery on the e-file wins the fight for e8: after the [exchange](exchange), the rook [mates](checkmate) on the [back rank](back-rank).',
    },
    tags: ['back-rank'],
  },
  {
    id: 'anastasia-mate',
    title: { es: 'Mate de Anastasia', en: 'Anastasia’s mate' },
    fen: 'r4r1k/pp2Nppp/8/7Q/8/3R4/Pq3PPP/6K1 w - - 0 1',
    playerSide: 'white',
    solution: ['Qxh7+', 'Kxh7', 'Rh3#'],
    explanation: {
      es: 'El caballo de e7 controla g8 y g6, y el peón de g7 tapa la otra salida del rey. La [dama se sacrifica](queen-sacrifice) en h7 para abrir la columna h y la torre da [mate](checkmate) desde h3.',
      en: 'The e7 knight covers g8 and g6, and the g7 pawn blocks the king’s other exit. The [queen sacrifice](queen-sacrifice) on h7 opens the h-file and the rook [mates](checkmate) from h3.',
    },
    tags: ['anastasia-mate', 'queen-sacrifice'],
  },
  {
    id: 'arabian-mate',
    title: { es: 'Mate árabe', en: 'Arabian mate' },
    fen: '2r4k/pp1R3p/5N2/8/8/8/1q3PPP/6K1 w - - 0 1',
    playerSide: 'white',
    solution: ['Rxh7#'],
    explanation: {
      es: 'Las negras tienen ventaja material, pero juegan las blancas. La torre captura en h7 protegida por el caballo de f6, que además controla g8; la propia torre cubre g7.',
      en: 'Black is ahead in material, but it is White’s move. The rook captures on h7 protected by the f6 knight, which also covers g8; the rook itself covers g7.',
    },
    tags: ['arabian-mate', 'back-rank'],
  },
  {
    id: 'royal-fork',
    title: { es: 'Horquilla de caballo', en: 'Knight fork' },
    fen: 'r4rk1/pp3ppp/2q5/3N4/8/8/PP1Q1PPP/5RK1 w - - 0 1',
    playerSide: 'white',
    solution: ['Ne7+', 'Kh8', 'Nxc6'],
    explanation: {
      es: 'La dama negra ataca al caballo de d5, pero el caballo salta a e7 con [jaque](check) y ataca a la vez al rey y a la dama. Tras mover el rey, el caballo captura la dama.',
      en: 'The black queen attacks the d5 knight, but the knight jumps to e7 with [check](check), hitting king and queen at once. After the king moves, the knight takes the queen.',
    },
    tags: ['fork', 'knight-fork'],
  },
  {
    id: 'pin-wins-queen',
    title: { es: 'Clavada de la dama', en: 'Pinning the queen' },
    fen: '4k2r/pppp1ppp/8/4q3/8/8/PP1Q1PPP/R5K1 w - - 0 1',
    playerSide: 'white',
    solution: ['Re1'],
    explanation: {
      es: 'La torre ocupa la columna e y [clava](pin) la dama negra contra su rey: la dama no puede apartarse. Las negras pierden la dama a cambio de la torre, porque e1 está protegida por la dama blanca.',
      en: 'The rook takes the e-file and [pins](pin) the black queen to its king: the queen cannot step aside. Black loses the queen for the rook, because e1 is protected by the white queen.',
    },
    tags: ['pin'],
  },
  {
    id: 'rook-skewer',
    title: { es: 'Enfilada', en: 'Skewer' },
    fen: '3r4/pp6/1q3k2/8/8/8/PP3PP1/2R3KR w - - 0 1',
    playerSide: 'white',
    solution: ['Rh6+'],
    explanation: {
      es: 'El rey negro y su dama están en la misma fila. La torre da [jaque](check) desde h6; el rey tiene que apartarse y, en la jugada siguiente, la torre captura la dama que quedaba detrás.',
      en: 'The black king and queen stand on the same rank. The rook [checks](check) from h6; the king has to step aside and, next move, the rook takes the queen standing behind it.',
    },
    tags: ['skewer'],
  },
];
