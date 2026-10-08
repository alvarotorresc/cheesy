// Curated tactical positions. Positions taken from games are rebuilt by replaying the game moves
// with chessops (see build.ts), so the stored FEN can never drift from the move record.
import type { CuratedPosition, Localized } from '../types.ts';

export type PositionSpec = Omit<CuratedPosition, 'fen' | 'explanation'> & {
  explanation: Localized;
  /** Longer text of the position page, 80 to 200 words per language (see `About`). */
  about: Localized;
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
    about: {
      es: 'Es una de las [trampas de apertura](opening-trap) más antiguas que se conocen. Lleva el nombre de Légal, un jugador francés del siglo XVIII. Su partida más citada la ganó en París a un rival llamado Saint Brie, y se suele fechar en 1750, aunque esa fecha es dudosa. La idea es atrevida: las blancas dejan su dama atacada y, a cambio, lanzan las piezas menores contra el rey negro, que sigue en el centro. Si las negras se llevan la dama sin mirar, pierden enseguida. Sale en aperturas abiertas, cuando el rey negro todavía no se ha enrocado y las piezas menores blancas ya están en juego. Lo que hay que recordar, sobre todo con negras: antes de capturar una pieza grande, pregúntate por qué el rival te la deja.',
      en: 'It is one of the oldest known [opening traps](opening-trap). It is named after Légal, a French player of the 18th century. His best-known game was a win in Paris against an opponent called Saint Brie, usually dated 1750, though that date is doubtful. The idea is bold: White lets the queen be taken and, in return, throws the minor pieces at the black king, which is still in the centre. If Black grabs the queen without looking, the game is over at once. It comes up in open games, while the black king has not castled yet and the white minor pieces are already out. What to remember, above all with Black: before you take a big piece, ask yourself why your opponent is letting you have it.',
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
    about: {
      es: 'Esta posición sale de una partida entre Richard Réti y Savielly Tartakower, jugada en Viena en 1910. Duró once jugadas y todavía se enseña como ejemplo de lo que cuesta dejar el rey en el centro. Empezó con una defensa Caro-Kann, en la que las negras responden al avance del peón de rey blanco moviendo una casilla su peón de alfil de dama. Las negras sacaron la dama pronto y acaban de comerse un caballo, pero su rey sigue en el centro, sin [enrocar](castling). Las blancas, en cambio, ya han enrocado y tienen sus piezas en juego. Lo que enseña: cuando el rey rival se queda en el centro y tus piezas ya están fuera, busca [jugadas forzadas](forcing-move), aunque te cuesten material. Contar piezas sirve de poco si el rey contrario no tiene adónde ir.',
      en: 'This position comes from a game between Richard Réti and Savielly Tartakower, played in Vienna in 1910. It lasted eleven moves and is still taught as an example of what it costs to leave the king in the centre. It began with a Caro-Kann Defence, where Black answers White’s king pawn advance by moving the queen’s bishop pawn one square. Black brought the queen out early and has just taken a knight, but the black king is still in the centre, without [castling](castling). White, on the other hand, has already castled and has the pieces in play. The lesson: when the enemy king stays in the centre and your pieces are already out, look for [forcing moves](forcing-move), even if they cost material. Counting pieces is of little use if the enemy king has nowhere to go.',
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
    about: {
      es: 'Paul Morphy jugó esta partida en París en 1858, en un palco de la ópera mientras en el escenario se representaba una función. Sus rivales eran dos aficionados, el duque Carlos II de Brunswick y el conde Isouard, que decidían juntos las jugadas de las negras. Empezó con la defensa Philidor, la del mismo Philidor de los finales de torre. Hoy se usa para enseñar el [desarrollo](development): Morphy saca sus piezas rápido y con amenazas, mientras las negras cambian pronto su alfil, mueven la dama dos veces y dejan el alfil de f8 y la torre de h8 sin salir. Cuando llega el ataque, las blancas entregan primero un caballo y luego una torre para abrir líneas hacia el rey negro, que sigue sin [enrocar](castling). La partida termina en la jugada 17. Lo que hay que recordar: con ventaja de desarrollo y el rey rival en el centro, abrir líneas vale más que el material.',
      en: 'Paul Morphy played this game in Paris in 1858, in a box at the opera while a performance was on stage. His opponents were two amateurs, Duke Karl II of Brunswick and Count Isouard, who chose Black’s moves together. It began with the Philidor Defence, named after the same Philidor as the rook ending. Today it is used to teach [development](development): Morphy brings his pieces out fast and with threats, while Black trades off a bishop early, moves the queen twice and leaves the f8 bishop and the h8 rook at home. When the attack comes, White gives up first a knight and then a rook to open lines towards the black king, which still has not [castled](castling). The game ends on move 17. What to remember: with a lead in development and the enemy king in the centre, opening lines is worth more than material.',
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
    about: {
      es: 'Esta trampa sale del [gambito](gambit) Budapest, una apertura en la que las negras entregan su peón de rey en la segunda jugada para desarrollar las piezas ganando tiempos. Lleva el nombre de Georg Kieninger, que la jugó en una partida informal en Viena en 1925. Las blancas han ganado material y creen que lo peor ha pasado, pero su rey sigue en el centro, rodeado de sus propias piezas y sin casillas a las que huir. Es el terreno típico de las trampas de apertura: un rey sin enrocar y una pieza propia que parece defenderlo todo, pero que puede quedar [clavada](pin). Lo que hay que recordar es que una pieza clavada no puede capturar fuera de la línea de la clavada, así que las casillas que parecía defender quedan libres. Antes de capturar material en la apertura, mira qué piezas tuyas pueden quedar clavadas contra el rey y qué casillas le quedan libres a tu rey.',
      en: 'This trap comes from the Budapest [Gambit](gambit), an opening where Black gives up the king pawn on the second move to develop the pieces with gain of time. It is named after Georg Kieninger, who played it in a casual game in Vienna in 1925. White has won material and thinks the worst is over, but the white king is still in the centre, surrounded by its own pieces and with no squares to run to. That is typical ground for opening traps: an uncastled king and one of its own pieces that seems to guard everything, but can end up [pinned](pin). What to remember is that a pinned piece cannot capture off the line of the pin, so the squares it seemed to guard are open. Before you grab material in the opening, check which of your pieces could end up pinned to the king and which squares your king has left.',
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
    about: {
      es: 'En español se llama mate de la coz porque lo da el caballo, como una coz, contra un rey rodeado de sus propias piezas. Es un patrón muy antiguo: ya aparece en el libro de Luis Ramírez de Lucena de 1497. En inglés, una de sus versiones más conocidas se llama el legado de Philidor, aunque Lucena la recogió siglos antes. Suele darse contra un rey que se ha ido a la esquina después de [enrocar](castling) corto, con los peones de delante sin mover y sus propias piezas cerrándole las salidas. Las señales que hay que buscar son un rey sin casillas libres y un caballo rival que puede llegar a darle jaque. Para defenderte, dale a tiempo una salida a tu rey: un peón movido delante del enroque basta muchas veces para que el caballo no pueda rematar.',
      en: 'In Spanish it is called the kick mate, because the knight delivers it like a horse’s kick against a king hemmed in by its own pieces. It is a very old pattern: it already appears in Luis Ramírez de Lucena’s book of 1497. In English, one of its best-known versions is called Philidor’s Legacy, although Lucena recorded it centuries earlier. It usually happens to a king that has gone to the corner after [castling](castling) short, with the pawns in front unmoved and its own pieces blocking the exits. The signs to look for are a king with no free squares and an enemy knight that can reach a checking square. To defend, give your king a way out in time: one pawn moved in front of the castled king is often enough to stop the knight from finishing.',
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
    about: {
      es: 'Adolf Anderssen ganó esta partida a Jean Dufresne en 1852, probablemente en Berlín y en una partida amistosa. Wilhelm Steinitz, el primer campeón del mundo, la llamó evergreen (perenne) como homenaje a Anderssen, y en español se conoce como la Siempreviva. Empezó con un [gambito](gambit) Evans, una apertura de ataque en la que las blancas entregan un peón para ganar tiempo y abrir el centro. La posición es de las que asustan: las negras amenazan mate en g2, con la dama apoyada por la torre de g8. Las blancas no se defienden. Atacan con [jaques](check), porque una serie de [jugadas forzadas](forcing-move) no deja al rival tiempo para cumplir su amenaza. La partida termina en la jugada 24. Lo que hay que recordar: cuando el rey rival está al descubierto, cuenta tus jaques antes de tapar la amenaza del contrario.',
      en: 'Adolf Anderssen won this game against Jean Dufresne in 1852, probably in Berlin and in a friendly game. Wilhelm Steinitz, the first world champion, called it “evergreen” as a tribute to Anderssen, and the name stuck. It began with an Evans [Gambit](gambit), an attacking opening where White gives up a pawn to gain time and open the centre. The position is a frightening one: Black threatens mate on g2, with the queen backed by the g8 rook. White does not defend. White attacks with [checks](check), because a run of [forcing moves](forcing-move) leaves the opponent no time to carry out the threat. The game ends on move 24. What to remember: when the enemy king is exposed, count your checks before you parry the opponent’s threat.',
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
    about: {
      es: 'Este mate lleva el nombre de Samuel Boden, jugador inglés, que lo dio en esta partida contra Schulder en Londres en 1853. No fue el primero en darlo: se conoce una partida anterior, Horwitz contra Popert, jugada en Hamburgo en 1844. El patrón se reconoce enseguida: dos alfiles que se cruzan en diagonales distintas, como unas tijeras, delante de un rey [enrocado](castling) largo. Para que funcione, las casillas de alrededor del rey tienen que estar ocupadas por sus propias piezas, que le quitan las salidas en lugar de protegerlo. Lo que hay que recordar: si enrocas largo, vigila las diagonales que llegan a tu rey, y no lo rodees de piezas que le cierren el paso. A un rey con casillas libres es mucho más difícil darle mate.',
      en: 'This mate is named after Samuel Boden, an English player, who delivered it in this game against Schulder in London in 1853. He was not the first: an earlier game is known, Horwitz against Popert, played in Hamburg in 1844. The pattern is easy to spot: two bishops crossing on different diagonals, like a pair of scissors, in front of a king that has [castled](castling) long. For it to work, the squares around the king must be taken by its own pieces, which take away its exits instead of protecting it. What to remember: if you castle long, watch the diagonals that reach your king, and do not surround it with pieces that block its way. A king with free squares is much harder to mate.',
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
    about: {
      es: 'El mate del pasillo es de los primeros que hay que conocer, porque se cuela en partidas de todos los niveles. El nombre describe bien la situación: el rey está encerrado en su [última fila](back-rank) por sus propios peones, como al fondo de un pasillo, y una torre o la dama rival entra por esa fila y da [mate](checkmate). Suele aparecer en el medio juego y en los finales con torres, cuando ya se han cambiado piezas y queda poca gente vigilando esa fila. La lucha suele estar en una [columna abierta](open-file): gana quien tenga más piezas apuntando a la casilla por la que se entra en la última fila. Para prevenirlo, basta con mover a tiempo uno de los peones de delante del rey y abrirle una casilla de escape. Parece una jugada perdida, pero salva muchas partidas.',
      en: 'The back-rank mate is one of the first mates to learn, because it sneaks into games at every level. The rook or queen comes in along the [back rank](back-rank), where the king is shut in by its own pawns, and delivers [mate](checkmate). It usually turns up in the middlegame and in rook endings, once pieces have been traded and few of them are left watching that rank. The fight is usually over an [open file](open-file): whoever has more pieces aimed at the square where the file meets the back rank wins it. To prevent it, all it takes is moving one of the pawns in front of the king in time, to give it an escape square. It looks like a wasted move, but it saves a lot of games.',
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
    about: {
      es: 'El nombre viene de una novela alemana, Anastasia und das Schachspiel, de Wilhelm Heinse, en la que aparece esta posición. Heinse la tomó, al parecer, de un texto del italiano Giambattista Lolli. El patrón necesita tres piezas: un caballo que vigila dos casillas de huida del rey, un peón del propio rey que le tapa otra, y una torre que llega por la columna del borde para dar [mate](checkmate). Aparece cuando el rey se ha refugiado en la esquina y esa columna se puede abrir, a veces a cambio de mucho material. Lo que hay que recordar: un caballo cerca de un rey arrinconado es una pieza muy peligrosa, aunque no parezca atacar nada. Si tienes uno ahí, mira si puedes llevar una torre a la columna del borde. Y si el rey arrinconado es el tuyo, no dejes que esa columna se abra.',
      en: 'The name comes from a German novel, Anastasia und das Schachspiel, by Wilhelm Heinse, in which this position appears. Heinse apparently took it from a text by the Italian Giambattista Lolli. The pattern needs three pieces: a knight covering two of the king’s escape squares, one of the king’s own pawns blocking another, and a rook coming down the edge file to deliver [mate](checkmate). It turns up when the king has taken shelter in the corner and that file can be opened, sometimes at the cost of a lot of material. What to remember: a knight near a cornered king is a very dangerous piece even if it seems to attack nothing. If you have one there, see whether you can bring a rook to the edge file. And if the cornered king is yours, do not let that file open.',
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
    about: {
      es: 'Es uno de los mates más antiguos que se conocen: ya aparece en manuscritos árabes de la Edad Media, cuando se jugaba al shatranj, el antepasado directo del ajedrez moderno. En aquel juego la torre y el caballo se movían igual que hoy, así que este mate, que solo usa esas dos piezas, ha llegado sin cambios hasta nosotros. El patrón es sencillo. La torre da [jaque](check) pegada al rey, en el borde del tablero, y el caballo la protege y además vigila la casilla por la que el rey podría escapar. El rey tiene que estar en una esquina o muy cerca, sin salidas. Tener más material no sirve de nada si la próxima jugada del rival es [mate](checkmate). Lo que hay que recordar: antes de contar piezas, comprueba si tu rey está a salvo, y un caballo rival cerca de tu esquina siempre merece una mirada.',
      en: 'It is one of the oldest known mates: it already appears in medieval Arabic manuscripts, from the days of shatranj, the direct ancestor of modern chess. In that game the rook and the knight moved just as they do today, so this mate, which uses only those two pieces, has come down to us unchanged. The pattern is simple. The rook gives [check](check) right next to the king, on the edge of the board, and the knight protects it and also covers the square the king could flee to. The king has to be in a corner or very close to one, with no way out. Being ahead in material is worthless if the opponent’s next move is [mate](checkmate). What to remember: before you count pieces, check that your king is safe, and an enemy knight near your corner always deserves a look.',
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
    about: {
      es: 'La [horquilla](fork) es un ataque doble: una pieza ataca a dos piezas rivales a la vez y el rival solo puede salvar una. El caballo es la pieza que mejor lo hace, porque salta y ataca en forma de L, así que ninguna de las piezas atacadas puede devolverle el golpe, salvo otro caballo. Las horquillas más fuertes llevan [jaque](check): el rey tiene que apartarse y la otra pieza cae sin remedio. Cuando la [horquilla de caballo](knight-fork) ataca al rey y a la dama a la vez se suele llamar horquilla real, también llamada horquilla de rey y dama. Lo que hay que recordar: antes de cada jugada, mira a qué casillas puede saltar tu caballo y qué piezas rivales atacaría desde cada una. Y al revés, cuando defiendas, haz la misma cuenta con los caballos del rival.',
      en: 'A [fork](fork) is a double attack: one piece attacks two enemy pieces at once and the opponent can only save one. The knight is the best at it, because it jumps and attacks in an L shape, so none of the pieces it attacks can hit back, except another knight. The strongest forks come with [check](check): the king has to step aside and the other piece is lost. When a [knight fork](knight-fork) hits king and queen at the same time it is often called a royal fork. What to remember: before each move, look at the squares your knight can jump to and which enemy pieces it would attack from each one. And the other way round, when you defend, do the same count with your opponent’s knights.',
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
    about: {
      es: 'Hay clavada cuando una pieza no puede moverse sin dejar al descubierto otra más valiosa que está detrás. La [clavada](pin) contra el rey es la más fuerte: la pieza clavada no puede salirse de la línea, porque las reglas no permiten dejar al propio rey en [jaque](check). Solo puede moverse a lo largo de ella, y eso incluye capturar a la pieza que la clava si puede alcanzarla. Solo clavan las piezas que se mueven en línea recta: el alfil por las diagonales, la torre por filas y columnas, y la dama por todas. Las columnas abiertas y las diagonales que llevan al rey son los lugares típicos. Lo que hay que recordar: si tu dama y tu rey están en la misma línea, aunque haya piezas en medio, revisa si una torre o un alfil rival puede plantarse en ella. Y si vas a clavar algo valioso, comprueba antes que la casilla desde la que clavas está protegida.',
      en: 'A pin happens when a piece cannot move without exposing a more valuable one behind it. A [pin](pin) against the king is the strongest kind: the pinned piece cannot leave the line, because the rules do not allow you to leave your own king in [check](check). It can only move along it, which includes taking the pinning piece if it can reach it. Only pieces that move in straight lines can pin: the bishop along diagonals, the rook along ranks and files, and the queen along all of them. Open files and diagonals leading to the king are the typical places. What to remember: if your queen and your king are on the same line, even with pieces in between, check whether an enemy rook or bishop can settle on it. And when you pin something valuable, first make sure the square you pin from is protected.',
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
    about: {
      es: 'La [enfilada](skewer) es una clavada al revés. La pieza atacada es la más valiosa, normalmente el rey, y al apartarse deja al descubierto otra que estaba detrás en la misma línea. Si el ataque es un [jaque](check), el rival no tiene elección: el rey se mueve y la pieza de detrás se pierde. Como en la [clavada](pin), solo pueden hacerla las piezas que se mueven en línea recta, es decir, el alfil, la torre y la dama. Es frecuente en los finales, cuando quedan pocas piezas y el rey sale de su refugio para jugar en filas y columnas abiertas. Lo que hay que recordar: si el rey y la dama rivales están en la misma fila, columna o diagonal, busca un jaque por esa línea. Y cuando defiendas, evita poner tu rey en línea con tu dama u otra pieza valiosa.',
      en: 'A [skewer](skewer) is a pin the other way round. The piece under attack is the more valuable one, usually the king, and when it steps aside it exposes another piece standing behind it on the same line. If the attack is a [check](check), the opponent has no choice: the king moves and the piece behind it is lost. As with a [pin](pin), only pieces that move in straight lines can do it, that is, the bishop, the rook and the queen. It is common in endings, when few pieces are left and the king comes out of its shelter to play on open ranks and files. What to remember: if the enemy king and queen are on the same rank, file or diagonal, look for a check along that line. And when you defend, avoid lining up your king with your queen or another valuable piece.',
    },
    tags: ['skewer'],
  },
];
