import type { EndgameSpec, Localized } from '../types.ts';

const KP: Localized = { es: 'Rey y peón', en: 'King and pawn' };
const RP: Localized = { es: 'Torre y peón', en: 'Rook and pawn' };
const QP: Localized = { es: 'Dama contra peón', en: 'Queen against pawn' };
const MATE: Localized = { es: 'Mates básicos', en: 'Basic mates' };

export const endgames: EndgameSpec[] = [
  {
    id: 'kp-opposition-defence',
    name: { es: 'La oposición: defensa', en: 'The opposition: defence' },
    category: KP,
    fen: '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'Solo 1...Re7 hace tablas: el rey negro toma la [oposición](opposition) frente al rey blanco. Cualquier otra jugada permite al rey blanco llegar a una [casilla clave](key-squares) (d6, e6 o f6) y el peón [corona](promotion). Mantén la oposición y, cuando el peón avance, retrocede en línea recta hacia la [casilla de coronación](queening-square).',
      en: 'Only 1...Ke7 draws: the black king takes the [opposition](opposition) against the white king. Any other move lets the white king reach a [key square](key-squares) (d6, e6 or f6) and the pawn [queens](promotion). Keep the opposition and, when the pawn advances, step straight back towards the [queening square](queening-square).',
    },
    about: {
      es: 'Este final sale a menudo cuando se cambian todas las piezas: queda un rey con un peón contra el rey solo. Quien defiende no necesita capturar el peón para salvarse. Le basta con plantar su rey delante y no dejarse apartar, y para eso usa la [oposición](opposition): los dos reyes frente a frente con una casilla en medio, de modo que el que tiene el turno debe ceder el paso. Conviene saber también cuándo ya no hay nada que hacer. Si el rey atacante llega a la sexta fila justo delante de su peón, gana mueva quien mueva. Con un peón de torre las cosas cambian, y por eso tiene su propio ejercicio. La defensa, por tanto, empieza pronto: cuanto antes se coloque tu rey delante del peón, más fácil es aguantar. Aquí juegas con negras y de todas tus jugadas solo una salva la partida.',
      en: 'This endgame comes up often once all the pieces have been traded: a king and a pawn against a lone king. The defender does not need to capture the pawn to survive. It is enough to plant the king in front of it and refuse to be pushed aside, and the tool for that is the [opposition](opposition): the two kings face to face with one square between them, so whoever has to move must give way. It also helps to know when nothing can be done. If the attacking king reaches the sixth rank right in front of its pawn, it wins whoever is to move. A rook pawn changes things, which is why it has its own exercise. So the defence starts early: the sooner your king stands in front of the pawn, the easier it is to hold. Here you play Black, and only one of your moves saves the game.',
    },
  },
  {
    id: 'kp-key-squares',
    name: { es: 'Casillas clave', en: 'Key squares' },
    category: KP,
    fen: '3k4/8/8/4K3/4P3/8/8/8 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'Las [casillas clave](key-squares) del peón de e4 son d6, e6 y f6: si el rey blanco llega a una de ellas, el peón [corona](promotion) con cualquier defensa. Con 1.Rd6, 1.Re6 o 1.Rf6 se llega de inmediato. En cambio, 1.Rd5?, 1.Rd4? o 1.Rf4? dejan escapar la victoria.',
      en: 'The [key squares](key-squares) of the e4 pawn are d6, e6 and f6: once the white king reaches one of them, the pawn [queens](promotion) against any defence. 1.Kd6, 1.Ke6 or 1.Kf6 gets there at once. By contrast, 1.Kd5?, 1.Kd4? or 1.Kf4? let the win slip.',
    },
    about: {
      es: 'Es el mismo tablero que el ejercicio de la oposición, visto desde el bando que ataca. Las [casillas clave](key-squares) responden a una pregunta práctica: dónde tiene que estar mi rey para que el peón corone pase lo que pase. Para un peón que todavía está en su mitad del tablero, y que no sea de torre, son las tres casillas situadas dos filas por delante de él. Si tu rey pisa una, ganas aunque el rival juegue perfecto. Así te ahorras cálculo: en vez de contar jugadas de peón, cuentas cuántas le faltan a tu rey para llegar a esa fila. El error típico es empujar el peón demasiado pronto. El peón no se va a escapar, así que primero va el rey, abriendo camino, y el peón le sigue después. En esta posición, de las siete jugadas de rey que tienes, cuatro ganan y tres dejan escapar la victoria.',
      en: 'This is the same board as the opposition exercise, seen from the attacking side. [Key squares](key-squares) answer a practical question: where does my king have to stand so that the pawn queens no matter what? For a pawn still on its own half of the board, and not a rook pawn, they are the three squares two ranks in front of it. If your king steps on one, you win even against perfect defence. That saves calculation: instead of counting pawn moves, you count how many moves your king needs to reach that rank. The usual mistake is pushing the pawn too soon. The pawn is not going anywhere, so the king goes first and clears the way, and the pawn follows. In this position you have seven king moves: four win and three let the win slip.',
    },
  },
  {
    id: 'kp-square-rule-defence',
    name: { es: 'Regla del cuadrado: defensa', en: 'Rule of the square: defence' },
    category: KP,
    fen: '8/8/8/6k1/1P6/8/8/7K b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'Traza el [cuadrado](rule-of-the-square) desde el peón hasta su [casilla de coronación](queening-square): b4-f4-f8-b8. Si el rey defensor puede entrar en él con su jugada, alcanza al peón. 1...Rf4, 1...Rf5 o 1...Rf6 hacen tablas; cualquier otra jugada pierde, porque el rey blanco está demasiado lejos para ayudar.',
      en: 'Draw the [square](rule-of-the-square) from the pawn to its [queening square](queening-square): b4-f4-f8-b8. If the defending king can step into it on its move, it catches the pawn. 1...Kf4, 1...Kf5 or 1...Kf6 draws; any other move loses, since the white king is too far away to help.',
    },
    about: {
      es: 'La [regla del cuadrado](rule-of-the-square) sirve cuando un peón se escapa y ningún rey puede ayudarle. Antes de mover, imagina el cuadrado: un lado va del peón a su [casilla de coronación](queening-square) y el resto se completa hacia tu rey. Si con tu jugada entras en él, llegas a tiempo; si no, el peón corona. Es una cuenta de un segundo y evita perder partidas igualadas por un peón que nadie estaba mirando. Hay un detalle que suele confundir. Si el peón está todavía en su casilla de salida, puede avanzar dos casillas de golpe, así que el cuadrado se dibuja como si ya estuviera una fila más adelante. La regla vale igual con más piezas en el tablero, siempre que ninguna de ellas pueda frenar o ayudar al peón. En este ejercicio hay tres casillas buenas para tu rey, y las tres están en la misma columna.',
      en: 'The [rule of the square](rule-of-the-square) is for a pawn that breaks away when no king can help it. Before you move, picture the square: one side runs from the pawn to its [queening square](queening-square) and the rest is drawn towards your king. If your move takes you inside it, you are in time; if not, the pawn queens. The count takes a second and saves level games from a pawn nobody was watching. One detail often confuses people. If the pawn is still on its starting square, it can advance two squares at once, so the square is drawn as if the pawn were already one rank further up. The rule works just the same with more pieces on the board, as long as none of them can stop or help the pawn. In this exercise your king has three good squares, and all three are on the same file.',
    },
  },
  {
    id: 'kp-square-rule-race',
    name: { es: 'Regla del cuadrado: carrera', en: 'Rule of the square: the race' },
    category: KP,
    fen: '8/8/8/6k1/1P6/8/8/7K w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'Con 1.b5 el [cuadrado](rule-of-the-square) del peón se reduce a b5-e5-e8-b8 y el rey negro, en g5, ya no puede entrar: el peón [corona](promotion) solo. Cualquier jugada de rey permite al negro entrar en el cuadrado y hacer tablas.',
      en: 'After 1.b5 the [square](rule-of-the-square) shrinks to b5-e5-e8-b8 and the black king on g5 can no longer enter it: the pawn [queens](promotion) on its own. Any king move lets Black step into the square and draw.',
    },
    about: {
      es: 'Mismo tablero, pero ahora mueven las blancas. Aquí la [regla del cuadrado](rule-of-the-square) se usa desde el otro lado: te dice si tu peón puede correr solo. Cada vez que el peón avanza, el cuadrado encoge una fila y una columna, y el rey rival tiene que estar dentro después de su jugada para alcanzarlo. Por eso no tiene sentido traer tu rey: está en la otra punta del tablero y, mientras tanto, el rey negro entra en el cuadrado. Es una situación típica de los finales de peones con un [peón pasado](passed-pawn) lejos de los reyes. Un [peón pasado alejado](outside-passed-pawn) obliga al rey rival a ir a por él, y a veces ni siquiera llega. Antes de cambiar las últimas piezas y pasar a un final de peones, mira el cuadrado: a menudo te dice si ese final está ganado sin calcular una sola jugada.',
      en: 'Same board, but now it is White to move. Here the [rule of the square](rule-of-the-square) works from the other side: it tells you whether your pawn can run on its own. Every time the pawn advances, the square shrinks by one rank and one file, and the enemy king has to be inside it after its move to catch the pawn. That is why bringing your king makes no sense: it stands at the far end of the board and, meanwhile, the black king steps into the square. This is a typical situation in pawn endings with a [passed pawn](passed-pawn) far from the kings. An [outside passed pawn](outside-passed-pawn) drags the enemy king towards it, and sometimes the king does not even get there. Before trading the last pieces into a pawn ending, look at the square: it often tells you whether that ending is won without calculating a single move.',
    },
  },
  {
    id: 'kp-rook-pawn-corner',
    name: { es: 'Peón de torre: a la esquina', en: 'Rook pawn: head for the corner' },
    category: KP,
    fen: '8/8/4k3/8/7P/8/6K1/8 b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'Con un peón de torre, si el rey defensor alcanza la [casilla de coronación](queening-square) (h8) o se queda delante del peón, es tablas: el rey blanco no puede expulsarlo sin [ahogarlo](stalemate). Dirige el rey hacia f8, g8 y h8 y quédate allí.',
      en: 'Against a rook pawn, once the defending king reaches the [queening square](queening-square) (h8) or stays in front of the pawn, it is a draw: the white king cannot drive it out without [stalemating](stalemate) it. Head for f8, g8 and h8 and stay there.',
    },
    about: {
      es: 'El peón de torre, el de la columna a o la h, es la gran excepción de los finales de rey y peón. Con cualquier otro peón, un rey atacante bien colocado gana a menudo; con este, el defensor se salva casi siempre que su rey llegue a la esquina de coronación. El motivo es la falta de espacio. El rey atacante no puede rodear al defensor por fuera, porque por fuera no hay tablero, y si intenta sacarlo de la esquina lo deja [ahogado](stalemate). Hay otra forma de hacer tablas que conviene conocer. Si el rey atacante se mete en la esquina, delante de su propio peón, el defensor puede dejarlo atrapado: con el peón en la columna h, el rey defensor en f7 le cierra la salida por la columna g y la partida es tablas. Con un peón de torre en contra, no pienses en ganarlo: piensa en llegar a la esquina.',
      en: 'The rook pawn, the one on the a- or h-file, is the big exception in king and pawn endings. With any other pawn, a well-placed attacking king often wins; with this one, the defender is nearly always saved once their king reaches the queening corner. The reason is lack of room. The attacking king cannot go round the defender on the outside, because there is no board out there, and if it tries to drive the defender out of the corner it [stalemates](stalemate) them. There is another draw worth knowing. If the attacking king walks into the corner, in front of its own pawn, the defender can trap it there: with the pawn on the h-file, the defending king on f7 shuts the way out along the g-file and the game is a draw. Facing a rook pawn, do not think about winning it: think about reaching the corner.',
    },
  },
  {
    id: 'lucena-position',
    name: { es: 'Posición de Lucena', en: 'Lucena position' },
    category: RP,
    fen: '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'El rey blanco está en la [casilla de coronación](queening-square) y el negro, cortado por la torre en la columna d. El plan es «[construir el puente](building-a-bridge)»: la torre sube a la cuarta fila (1.Td4), el rey sale de la casilla de coronación y, cuando lleguen los [jaques](check), la torre los tapa desde la cuarta fila.',
      en: 'The white king sits on the [queening square](queening-square) and the black king is cut off by the rook on the d-file. The plan is “[building a bridge](building-a-bridge)”: the rook goes to the fourth rank (1.Rd4), the king leaves the queening square and, when the [checks](check) come, the rook blocks them from the fourth rank.',
    },
    about: {
      es: 'Es la posición ganadora más importante de los finales de torre y peón, que son los más frecuentes del ajedrez. Su nombre es un error histórico. Luis Ramírez de Lucena publicó en Salamanca, en 1497, el libro de ajedrez impreso más antiguo que se conserva, pero la posición no aparece en él: el primer análisis conocido es de Alessandro Salvio, en 1634. Aun así, el nombre se quedó. Para que haya Lucena hacen falta tres cosas: tu peón a un paso de [coronar](promotion), tu rey delante de él y el rey rival [cortado](cutting-off-the-king) por tu torre al menos a una columna de distancia. Si se dan, ganas [construyendo el puente](building-a-bridge). Con un peón de torre no funciona. Si el defensor llega a tiempo delante del peón, en cambio, buscará la [posición de Philidor](philidor-position). Las dos posiciones van juntas: una dice cuándo se gana y la otra, cómo se defiende el resto.',
      en: 'It is the most important winning position in rook and pawn endings, which are the most common endings in chess. Its name is a historical mistake. Luis Ramírez de Lucena published the oldest printed chess book that survives, in Salamanca in 1497, but the position is not in it: the earliest known analysis is by Alessandro Salvio, in 1634. The name stuck anyway. A Lucena needs three things: your pawn one step from [queening](promotion), your king in front of it, and the enemy king [cut off](cutting-off-the-king) by your rook at least one file away. When all three are there, you win by [building a bridge](building-a-bridge). It does not work with a rook pawn. If instead the defender gets in front of the pawn in time, they will aim for the [Philidor position](philidor-position). The two go together: one tells you when the ending is won, the other how to defend the rest.',
    },
  },
  {
    id: 'philidor-position',
    name: { es: 'Posición de Philidor', en: 'Philidor position' },
    category: RP,
    fen: '4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'El rey negro está en la [casilla de coronación](queening-square) y la torre corta al rey blanco en la sexta fila (por ejemplo, 1...Tb6 o 1...Tg6). Si el peón avanza a e6, el rey blanco se queda sin refugio y la torre pasa a dar [jaques](check) desde atrás. No abandones la sexta fila antes de tiempo.',
      en: 'The black king holds the [queening square](queening-square) and the rook keeps the white king off the sixth rank (for example 1...Rb6 or 1...Rg6). Once the pawn advances to e6 the white king has no shelter, and the rook switches to [checking](check) from behind. Do not leave the sixth rank too early.',
    },
    about: {
      es: 'Es la defensa básica de los finales de torre y peón, la primera que hay que aprender. Lleva el nombre de François-André Danican Philidor, el gran jugador francés del siglo XVIII, que además fue compositor de óperas. La analizó en 1777. Aparece cuando el rey defensor ha llegado a tiempo delante del peón rival, y se juega en dos fases. Mientras el peón no avanza, tu torre se queda en tu tercera fila y el rey atacante no puede subir sin recibir [jaque](check). Cuando el peón pisa esa fila, ya no puede servir de refugio a su rey, y tu torre se va al otro extremo del tablero para dar jaques por detrás, desde lejos. El error clásico es la defensa pasiva, con la torre esperando en tu [última fila](back-rank): en esta misma posición, esa jugada pierde. Bien jugada, la posición de Philidor es tablas.',
      en: 'This is the basic defence in rook and pawn endings, the first one to learn. It is named after François-André Danican Philidor, the great French player of the 18th century, who was also an opera composer. He analysed it in 1777. It comes up when the defending king has reached the square in front of the enemy pawn in time, and it is played in two stages. While the pawn stays back, your rook holds your third rank and the attacking king cannot step up without being [checked](check). Once the pawn steps onto that rank, it can no longer shelter its king, and your rook goes to the far end of the board to check from behind, from a distance. The classic mistake is the passive defence, with the rook waiting on your [back rank](back-rank): in this very position, that move loses. Played correctly, the Philidor position is a draw.',
    },
  },
  {
    id: 'vancura-position',
    name: { es: 'Defensa Vancura', en: 'Vančura defence' },
    category: RP,
    fen: 'R7/6k1/P4r2/8/8/8/8/6K1 b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'Contra el peón de torre con la torre delante de él, la torre negra ataca el peón de lado desde f6 y el rey se queda en g7 o h7. Así la torre blanca no puede abandonar a8 sin perder el peón, y si el rey blanco se acerca, recibe [jaques](check) laterales. El rey debe quedarse cerca: 1...Rf7?, 1...Rg6? o 1...Rh6? pierden.',
      en: 'Against a rook pawn with the rook in front of it, the black rook attacks the pawn sideways from f6 while the king stays on g7 or h7. The white rook cannot leave a8 without dropping the pawn, and if the white king approaches it gets [checked](check) from the side. The king must stay put: 1...Kf7?, 1...Kg6? or 1...Kh6? lose.',
    },
    about: {
      es: 'Cuando el peón es de torre y la torre atacante está delante de él, la defensa cambia: tu torre no corta al rey, ataca el peón de lado. Esta posición lleva el nombre de Josef Vančura, que la estudió a principios del siglo XX. Desde f6, la torre negra ataca el peón de a6 y obliga a la torre blanca a quedarse en a8 para protegerlo. Si el rey blanco se acerca a su peón, recibe [jaques](check) desde el lado y no encuentra dónde esconderse. Lo que hay que recordar es dónde va cada pieza. Tu rey se queda en g7 o h7, lejos del peón, para no estorbar a tu torre. Tu torre ataca el peón de lado y, cuando el peón llega a la [séptima fila](seventh-rank), se coloca detrás de él. Y no te lo comas: la torre de a8 te capturaría la torre por la columna a.',
      en: 'When the pawn is a rook pawn and the attacking rook stands in front of it, the defence changes: your rook does not cut off the king, it attacks the pawn from the side. This position is named after Josef Vančura, who studied it in the early 20th century. From f6 the black rook attacks the a6 pawn and ties the white rook to a8 to protect it. If the white king walks towards its pawn, it gets [checked](check) from the side and finds nowhere to hide. What to remember is where each piece goes. Your king stays on g7 or h7, far from the pawn, so it does not get in your rook’s way. Your rook attacks the pawn from the side and, once the pawn reaches the [seventh rank](seventh-rank), gets behind it. And do not grab the pawn: the a8 rook would take your rook along the a-file.',
    },
  },
  {
    id: 'rook-cuts-king',
    name: { es: 'Corte del rey', en: 'Cutting off the king' },
    category: RP,
    fen: 'r7/8/8/6k1/3P4/3K4/8/5R2 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'La torre en la columna f corta al rey negro, que no puede volver a frenar el peón. Avanza el peón acompañado por el rey (1.d5, 1.Rc4 o 1.Re4 ganan) y mantén el corte: si la torre abandona la columna f (1.Tb1? o 1.Te1?), el rey negro regresa y es tablas.',
      en: 'The rook on the f-file cuts off the black king, which cannot get back to stop the pawn. Advance the pawn escorted by the king (1.d5, 1.Kc4 or 1.Ke4 all win) and keep the cut: if the rook leaves the f-file (1.Rb1? or 1.Re1?), the black king returns and it is a draw.',
    },
    about: {
      es: '[Cortar al rey](cutting-off-the-king) es una de las ideas que más partidas ganan en los finales de torre. La torre se coloca en una columna, o en una fila, que el rey rival no puede cruzar sin quedar en [jaque](check), y lo deja fuera de la lucha por el peón. Aquí la torre de f1 encierra al rey negro en las columnas g y h, mientras tu rey y tu peón avanzan por el otro lado. Cuanto más lejos quede el rey cortado, mejor: cada columna de distancia es una jugada más que necesita para volver. El plan tiene un orden. Primero el corte; después, el rey delante o al lado de su peón, y el peón avanzando con su protección. Si el peón llega a la [séptima fila](seventh-rank) con tu rey delante, buscarás la [posición de Lucena](lucena-position). Ojo con las casillas de la torre: en f4, f5 o f6, el rey negro se la come.',
      en: '[Cutting off the king](cutting-off-the-king) is one of the ideas that win the most rook endings. The rook takes a file, or a rank, that the enemy king cannot cross without walking into [check](check), and keeps it out of the fight for the pawn. Here the f1 rook shuts the black king in on the g- and h-files while your king and pawn advance on the other side. The further away the king is cut off, the better: every file of distance is one more move it needs to come back. The plan has an order. First the cut; then the king in front of or beside its pawn, with the pawn advancing under its protection. If the pawn reaches the [seventh rank](seventh-rank) with your king in front of it, you will be heading for the [Lucena position](lucena-position). Mind the rook’s squares: on f4, f5 or f6, the black king takes it.',
    },
  },
  {
    id: 'queen-vs-central-pawn',
    name: {
      es: 'Dama contra peón central en séptima',
      en: 'Queen against a central pawn on the seventh',
    },
    category: QP,
    fen: '8/8/8/8/8/K7/3pk3/7Q w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'Contra un peón central o de caballo en séptima, la dama gana: con [jaques](check) y [clavadas](pin) obliga al rey negro a ponerse delante de su peón, en d1, y cada vez que eso ocurre el rey blanco gana un [tiempo](tempo) para acercarse. Empieza con jaques como 1.De4+ o 1.Dg2+.',
      en: 'Against a centre or knight pawn on the seventh rank the queen wins: with [checks](check) and [pins](pin) it forces the black king in front of its pawn, onto d1, and each time that happens the white king gains a [tempo](tempo) to approach. Start with checks such as 1.Qe4+ or 1.Qg2+.',
    },
    about: {
      es: 'Este final suele salir de una carrera de peones: un bando corona y el otro se queda con un peón a un paso de la última fila. Parece peligroso, pero contra un peón central o de caballo la dama gana. El método se repite siempre igual. La dama da jaques y se acerca hasta que el rey negro no tiene más remedio que meterse delante de su propio peón. En ese momento el peón está tapado por su rey y no puede coronar, así que el rey blanco tiene un [tiempo](tempo) libre para dar un paso. El ciclo se repite hasta que el rey llega, y entonces se captura el peón o se da [mate](checkmate). Con el mejor juego, aquí las blancas dan mate en 11 jugadas. Contra un peón de alfil o de torre, en cambio, el defensor tiene un recurso de [ahogado](stalemate) que salva la partida si el rey blanco está lejos.',
      en: 'This ending usually comes out of a pawn race: one side queens and the other is left with a pawn one step from the last rank. It looks dangerous, but against a centre or knight pawn the queen wins. The method is always the same. The queen gives checks and closes in until the black king has no choice but to step in front of its own pawn. At that moment the pawn is blocked by its own king and cannot queen, so the white king has a free [tempo](tempo) to take one step. The cycle repeats until the king arrives, and then the pawn is captured or the king is [mated](checkmate). With best play, White mates here in 11 moves. Against a bishop or rook pawn, though, the defender has a [stalemate](stalemate) resource that saves the game if the white king is far away.',
    },
  },
  {
    id: 'queen-vs-bishop-pawn',
    name: {
      es: 'Dama contra peón de alfil en séptima',
      en: 'Queen against a bishop pawn on the seventh',
    },
    category: QP,
    fen: 'K7/8/8/8/8/1Q6/2p5/1k6 b - - 0 1',
    goal: 'draw',
    playerSide: 'black',
    explanation: {
      es: 'Con peón de alfil en séptima y el rey blanco lejos, el defensor se salva gracias al [ahogado](stalemate): 1...Ra1! y si 2.Dxc2, el rey negro queda ahogado. 1...Rc1 también hace tablas.',
      en: 'With a bishop pawn on the seventh and the white king far away, the defender is saved by [stalemate](stalemate): 1...Ka1! and if 2.Qxc2, the black king is stalemated. 1...Kc1 also draws.',
    },
    about: {
      es: 'Es la excepción del ejercicio anterior. Con un peón de alfil en la [séptima fila](seventh-rank), el método de la dama falla: cuando la dama se acerca, el rey negro se va a la esquina en lugar de ponerse delante del peón. Si la dama captura el peón, el rey se queda sin jugadas y sin estar en [jaque](check), y eso es [ahogado](stalemate): tablas. Contra un peón de torre el defensor también se salva cuando el rey blanco está lejos, porque su rey se esconde en la esquina delante del peón. Lo que hay que recordar es que el recurso solo funciona si el rey blanco está lejos. Con el rey blanco en d3, junto al peón, las blancas ganarían. Por eso, en una carrera de peones, cuenta también dónde queda tu rey cuando el rival corona: a veces una sola casilla decide si el final es tablas o se pierde.',
      en: 'This is the exception to the previous exercise. With a bishop pawn on the [seventh rank](seventh-rank), the queen’s method fails: as the queen closes in, the black king heads for the corner instead of stepping in front of the pawn. If the queen takes the pawn, the king has no moves and is not in [check](check), and that is [stalemate](stalemate): a draw. Against a rook pawn the defender is also saved when the white king is far away, because the king hides in the corner in front of the pawn. What to remember is that the resource only works when the white king is far away. With the white king on d3, next to the pawn, White would win. So in a pawn race, also count where your king will be when the opponent queens: sometimes a single square decides between a draw and a loss.',
    },
  },
  {
    id: 'mate-queen',
    name: { es: 'Mate con dama', en: 'Queen mate' },
    category: MATE,
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'La dama reduce el espacio del rey negro hasta llevarlo al borde; después se acerca el rey blanco y se da [mate](checkmate). Cuidado con el [ahogado](stalemate): deja siempre al rey negro al menos una casilla libre hasta el mate.',
      en: 'The queen shrinks the black king’s space until it reaches the edge; then the white king comes closer and delivers [mate](checkmate). Watch out for [stalemate](stalemate): always leave the black king at least one free square until the mate.',
    },
    about: {
      es: 'Es el primer mate que hay que saber, porque aparece cada vez que un peón corona y al rival no le quedan piezas. Desde aquí, con el mejor juego, las blancas dan mate en 7 jugadas, pero no hace falta jugar perfecto: hace falta un método. La dama se coloca a un salto de caballo del rey negro y lo va encerrando en un rectángulo cada vez más pequeño, sin darle jaque. Cuando el rey llega al borde, la dama se detiene y entra el rey blanco, porque la dama sola no puede dar [mate](checkmate). El peligro es el [ahogado](stalemate). La trampa típica es justo esa distancia de caballo cuando el rey ya está en la esquina: no puede moverse y no está en jaque. Tampoco des jaques al tuntún. En esta posición hay tres jaques que dejan la dama donde el rey negro se la come.',
      en: 'It is the first mate to learn, because it comes up every time a pawn queens and the opponent has no pieces left. From here, with best play, White mates in 7 moves, but you do not need perfect play: you need a method. The queen stands a knight’s move away from the black king and boxes it into a smaller and smaller rectangle, without giving check. Once the king is on the edge, the queen stops and the white king comes in, because the queen cannot [mate](checkmate) on its own. The danger is [stalemate](stalemate). The typical trap is that same knight’s-move distance once the king is already in the corner: it cannot move and is not in check. And do not give random checks either. In this position three of them put the queen where the black king can take it.',
    },
  },
  {
    id: 'mate-rook',
    name: { es: 'Mate con torre', en: 'Rook mate' },
    category: MATE,
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'La torre corta al rey negro en una fila o columna y el rey blanco se acerca. Cuando los reyes quedan enfrentados, el [jaque](check) de torre empuja al rey negro una fila hacia el borde; repite hasta dar [mate](checkmate) en la última fila o columna.',
      en: 'The rook cuts off the black king along a rank or file while the white king approaches. When the kings face each other, a rook [check](check) pushes the black king one line towards the edge; repeat until [mate](checkmate) on the last rank or file.',
    },
    about: {
      es: 'Con la torre el mate tarda más que con la dama: desde aquí, con el mejor juego, hacen falta 14 jugadas. La torre sola no encierra al rey tan deprisa, así que el rey blanco tiene que trabajar más. La técnica se apoya en la [oposición](opposition), la misma idea de los finales de peones. Cuando los reyes quedan frente a frente, el [jaque](check) de torre obliga al rey negro a retroceder una fila. Cuando no lo están, la torre hace una jugada de espera dentro de su fila o columna y deja que sea el rey negro quien se coloque enfrente. Lo que hay que recordar: no persigas al rey con jaques sueltos, que solo le dejan escapar, y mantén la torre lejos de él, porque si se acerca puede capturarla. Practícalo hasta que te salga sin pensar.',
      en: 'Mating with the rook takes longer than with the queen: from here, with best play, it takes 14 moves. The rook alone does not box the king in as quickly, so the white king has to work harder. The technique relies on the [opposition](opposition), the same idea as in pawn endings. When the kings stand face to face, a rook [check](check) forces the black king back one rank. When they do not, the rook makes a waiting move along its rank or file and lets the black king be the one to step in front. What to remember: do not chase the king with loose checks, which only let it escape, and keep the rook far from it, because if it gets close the king can take it. Practise it until you can do it without thinking.',
    },
  },
  {
    id: 'mate-two-bishops',
    name: { es: 'Mate con dos alfiles', en: 'Two bishops mate' },
    category: MATE,
    fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
    goal: 'win',
    playerSide: 'white',
    explanation: {
      es: 'Los dos alfiles, uno junto al otro, forman una barrera diagonal que el rey negro no puede cruzar. Con ayuda del rey se le empuja hacia una esquina, cualquiera, y allí se da [mate](checkmate). Evita el [ahogado](stalemate) en las últimas jugadas.',
      en: 'The two bishops side by side form a diagonal barrier the black king cannot cross. With the king’s help it is driven into a corner, any corner, and [mated](checkmate) there. Avoid [stalemate](stalemate) in the final moves.',
    },
    about: {
      es: 'Los dos alfiles pueden dar mate al rey solo, cosa que no consigue un alfil o un caballo sin más ayuda que su rey. Es el más largo de estos mates básicos: desde aquí, con el mejor juego, hacen falta 17 jugadas. Los alfiles rinden más juntos, uno al lado del otro, porque cubren dos diagonales seguidas y forman una pared que el rey negro no puede atravesar. El rey blanco empuja desde delante y los alfiles van cerrando el espacio, primero hacia el borde y luego hacia una esquina, que es donde se da el [mate](checkmate). Lo que hay que recordar: tu rey tiene que participar desde el principio y tus alfiles no deben quedar al alcance del rey negro. Aquí mismo hay un jaque que regala un alfil. Y como en todos estos finales, en las últimas jugadas vigila el [ahogado](stalemate).',
      en: 'The two bishops can mate a lone king, which a single bishop or knight cannot do with only its king to help. It is the longest of these basic mates: from here, with best play, it takes 17 moves. The bishops work best together, side by side, because they cover two neighbouring diagonals and form a wall the black king cannot get through. The white king pushes from the front while the bishops close the space, first towards the edge and then towards a corner, which is where the [mate](checkmate) happens. What to remember: your king has to join in from the start, and your bishops must stay out of the black king’s reach. Right here there is a check that gives a bishop away. And as in all these endings, watch out for [stalemate](stalemate) in the final moves.',
    },
  },
];
