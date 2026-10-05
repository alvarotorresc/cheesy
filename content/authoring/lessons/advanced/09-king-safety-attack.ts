// Lesson 9 for advanced players: attacking the king, castled or not, with the Greek gift and a pawn storm.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_ADVANCED,
  CHESSKID,
  LICHESS_PRACTICE,
  LICHESS_THEMES,
  WIKI_GREEK_GIFT,
  WIKI_LASKER_BAUER,
  WIKI_PAWN_STORM,
} from './sources.ts';

export const kingSafetyAttack: LessonSpec = {
  id: 'king-safety-attack',
  level: 'advanced',
  order: 9,
  title: { es: 'Atacar al rey', en: 'Attacking the king' },
  summary: {
    es: 'Cuándo un rey es débil, el regalo griego, el rey sin enrocar y la avalancha de peones.',
    en: 'When a king is weak, the Greek gift, the uncastled king and the pawn storm.',
  },
  terms: ['greek-gift', 'pawn-storm', 'flank'],
  sources: [
    WIKI_GREEK_GIFT,
    WIKI_LASKER_BAUER,
    WIKI_PAWN_STORM,
    LICHESS_PRACTICE,
    LICHESS_THEMES,
    CHESSKID,
    CHESSCOM_ADVANCED,
  ],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Atacar al rey es llevar cerca de él más piezas tuyas que las que lo defienden. Señales de un rey débil: pocos defensores a su lado, peones que se han movido o han desaparecido delante de él, y líneas abiertas que llegan hasta él. Aquí, en Lasker contra Bauer, Ámsterdam 1889, los dos alfiles blancos apuntan al enroque negro, la dama blanca puede llegar a la columna h y el caballo de f6 es casi el único defensor.',
        en: 'Attacking the king means bringing more of your pieces near it than there are pieces defending it. Signs of a weak king: few defenders beside it, pawns in front of it that have moved or disappeared, and open lines that reach it. Here, in Lasker against Bauer, Amsterdam 1889, both white bishops point at the black castled king, the white queen can reach the h-file and the knight on f6 is almost the only defender.',
      },
      board: {
        fen: 'r4rk1/1b2bppp/ppq1pn2/2ppB3/5P2/1P1BP1N1/P1PPQ1PP/R4RK1 w - - 0 14',
        orientation: 'white',
        highlights: ['d3', 'e5', 'e2', 'f6'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El [regalo griego](greek-gift) es un ataque clásico: el alfil captura el peón de h7 con [jaque](check), el caballo da jaque desde g5 y la dama entra por la columna h. Funciona si se cumplen cinco condiciones: controlas la casilla g5 más que el rival; tu caballo puede saltar a g5 con jaque; tu dama puede unirse al ataque, casi siempre por la columna h; el rival no puede llevar otra pieza a defender h7; y no tiene tiempo de reorganizar su defensa.',
        en: 'The [Greek gift](greek-gift) is a classic attack: the bishop captures the pawn on h7 with [check](check), the knight gives check from g5 and the queen comes in along the h-file. It works if five conditions hold: you control the g5 square more than your opponent; your knight can jump to g5 with check; your queen can join the attack, almost always along the h-file; the opponent cannot bring another piece to defend h7; and there is no time to reorganise the defence.',
      },
      board: {
        fen: '6k1/5ppp/4p3/4P3/8/3B1N2/8/3Q2K1 w - - 0 1',
        orientation: 'white',
        highlights: ['h7', 'g5'],
      },
    },
    // Spec: «FM eng (3): el regalo griego en la posición del artículo». It does not pass test 10
    // (Ng5 is also decisive, 345 cp at depth 22): choice with engine instead (progress.md).
    {
      kind: 'choice',
      text: {
        es: 'Esta posición sale del artículo de Wikipedia sobre el regalo griego: las negras acaban de enrocarse. ¿Qué jugada empieza el ataque?',
        en: 'This position comes from the Wikipedia article on the Greek gift: Black has just castled. Which move starts the attack?',
      },
      board: {
        fen: 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 7',
        orientation: 'white',
      },
      answer: { by: 'engine', options: ['Bxh7+', 'O-O', 'Qe2'], correct: 0 },
      whyWrong: [
        null, // correct option: no whyWrong
        {
          es: 'Enrocarte pone tu rey a salvo, pero dejas pasar la ocasión: ahora mismo se cumplen las condiciones del regalo griego.',
          en: 'Castling puts your king in safety, but you let the chance go: right now the conditions of the Greek gift are met.',
        },
        {
          es: 'La dama se acerca, pero el rival gana tiempo para defenderse. El ataque ya funciona ahora.',
          en: 'The queen comes closer, but your opponent gains time to defend. The attack already works now.',
        },
      ],
      explanation: {
        es: 'Eso es: el alfil captura en h7 con jaque. Si el rey lo captura, el caballo da jaque desde g5 y la dama llega a h5: las negras tienen que entregar la dama para no recibir [mate](checkmate).',
        en: 'That is it: the bishop captures on h7 with check. If the king takes it, the knight gives check from g5 and the queen reaches h5: Black has to give up the queen to avoid [checkmate](checkmate).',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Volvemos a Lasker contra Bauer. El caballo blanco saltó a h5 y el negro lo capturó. Tienes dos alfiles apuntando al rey negro: empieza el ataque.',
        en: 'Back to Lasker against Bauer. The white knight jumped to h5 and Black captured it. You have two bishops aimed at the black king: start the attack.',
      },
      board: {
        fen: 'r4rk1/1b2bppp/ppq1p3/2ppB2n/5P2/1P1BP3/P1PPQ1PP/R4RK1 w - - 0 15',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Bxh7+'] },
      wrong: {
        Qxh5: {
          es: 'Recuperas la pieza, pero el rey negro sigue protegido por su peón de h7. Hay algo más fuerte antes.',
          en: 'You win the piece back, but the black king is still shielded by its pawn on h7. There is something stronger first.',
        },
      },
      hint: {
        es: 'Como en el regalo griego: empieza por h7.',
        en: 'As in the Greek gift: start with h7.',
      },
      explanation: {
        es: 'Bien: el alfil se entrega en h7 con jaque. Si el rey lo captura, la dama recupera el caballo en h5, también con jaque, y el rey negro se queda sin peones delante.',
        en: 'Well done: the bishop gives itself up on h7 with check. If the king captures it, the queen wins the knight back on h5, also with check, and the black king is left with no pawns in front of it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'En la partida, el rey capturó el alfil, la dama recuperó el caballo con jaque y el rey volvió a g8. Y ahora el segundo alfil: se entrega en g7. Si el rey lo captura, la dama da jaque desde g4, la torre sube por la tercera fila hasta h3 y las negras tienen que dar su dama para no recibir mate. Al final, la dama blanca ataca los dos alfiles negros a la vez y gana uno. Es una de las partidas más famosas por esa entrega de los dos alfiles.',
        en: 'In the game the king took the bishop, the queen won the knight back with check and the king went back to g8. And now the second bishop: it gives itself up on g7. If the king captures it, the queen gives check from g4, the rook climbs along the third rank to h3 and Black has to give up the queen to avoid mate. In the end, the white queen attacks both black bishops at once and wins one of them. It is one of the most famous games because of that sacrifice of both bishops.',
      },
      board: {
        fen: 'r4rk1/1b2bpp1/ppq1p3/2ppB2Q/5P2/1P2P3/P1PP2PP/R4RK1 w - - 1 17',
        orientation: 'white',
        moves: ['Bxg7', 'Kxg7', 'Qg4+', 'Kh7', 'Rf3', 'e5', 'Rh3+', 'Qh6', 'Rxh6+', 'Kxh6', 'Qd7'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un rey que no se ha enrocado está en peligro en cuanto se abre el centro. Si vas por delante en el desarrollo, abre líneas: cambia peones del centro o entrega uno, como en un [gambito](gambit), para que tus torres y tu dama lleguen antes que sus defensores. Aquí la columna d ya está abierta, la torre y la dama blancas están en ella y el rey negro sigue en e8.',
        en: 'A king that has not castled is in danger as soon as the centre opens. If you are ahead in development, open lines: exchange central pawns or give one up, as in a [gambit](gambit), so that your rooks and queen arrive before its defenders. Here the d-file is already open, the white rook and queen stand on it and the black king is still on e8.',
      },
      board: {
        fen: 'rnb1kbnr/pp3ppp/2p5/5q2/8/3Q1N2/PPPB1PPP/2KR1B1R w kq - 0 1',
        orientation: 'white',
        highlights: ['e8', 'd1', 'd3'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El rey negro sigue en el centro, sin enrocar, y la columna d está abierta. Tu torre y tu dama están en ella. Las negras amenazan tu dama. Busca cómo llegar al rey: es [mate](checkmate) en tres jugadas.',
        en: 'The black king is still in the centre, not castled, and the d-file is open. Your rook and your queen stand on it. Black is attacking your queen. Find a way to reach the king: it is [mate](checkmate) in three moves.',
      },
      board: {
        fen: 'rnb1kbnr/pp3ppp/2p5/5q2/8/3Q1N2/PPPB1PPP/2KR1B1R w kq - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Qd8+', 'Kxd8', 'Bg5+'] },
      wrong: {
        Qxf5: {
          es: 'Cambiar las damas es tranquilo y el rey negro respira. Con el rey en el centro había algo mucho mejor.',
          en: 'Exchanging queens is calm and the black king breathes again. With the king in the centre there was something much better.',
        },
        Qb3: {
          es: 'La dama se salva, pero dejas pasar la ocasión: el rey negro sigue sin protección y puedes llegar a él ya.',
          en: 'The queen is safe, but you miss the chance: the black king is still unprotected and you can reach it right now.',
        },
      },
      hint: {
        es: 'Entrega la dama con [jaque](check) en la casilla de al lado del rey. Cuando el rey la capture, tu alfil de d2 se aparta de la columna con jaque y deja que también dé jaque la torre.',
        en: 'Give up the queen with [check](check) on the square next to the king. When the king captures it, your bishop on d2 moves off the file with check and lets the rook give check too.',
      },
      explanation: {
        es: 'Bien: tras entregar la dama, el alfil va a g5 y da jaque a la vez que la torre de d1: un [jaque doble](double-check). El rey tiene que moverse. Si va a c7, el alfil da mate en d8; si vuelve a e8, la torre da mate en d8. La columna abierta llevó tus piezas hasta el rey que no se enrocó.',
        en: 'Well done: after giving up the queen, the bishop goes to g5 and gives check together with the rook on d1: a [double check](double-check). The king has to move. If it goes to c7, the bishop mates on d8; if it goes back to e8, the rook mates on d8. The open file took your pieces all the way to the king that never castled.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cuando los reyes se enrocan en lados distintos, la partida es una carrera. Cada bando lanza sus peones del [flanco](flank) donde está el rey rival: es una [avalancha de peones](pawn-storm). Esos peones abren líneas para tus piezas, y empujarlos no deja desnudo a tu rey, que está en el otro lado. Aquí las blancas, enrocadas en el lado de la dama, avanzan los peones de g4 y h4 contra el rey negro.',
        en: 'When the kings castle on different sides, the game becomes a race. Each side throws forward the pawns on the [flank](flank) where the enemy king is: that is a [pawn storm](pawn-storm). Those pawns open lines for your pieces, and pushing them does not strip your own king, which is on the other side. Here White, castled on the queenside, advances the pawns on g4 and h4 against the black king.',
      },
      board: {
        fen: 'r4rk1/ppq1ppbp/3p1np1/8/4P1PP/2N1BP2/PPPQ4/2KR3R w - - 0 1',
        orientation: 'white',
        highlights: ['g4', 'h4', 'g8', 'c1'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: ataca al rey cuando tengas cerca de él más piezas que sus defensores. El [regalo griego](greek-gift) funciona si tu caballo llega a g5, tu dama llega a la columna h y nadie puede defender h7. A veces hay que entregar más de una pieza, como Lasker. Contra un rey sin enrocar, abre el centro; con los reyes en lados distintos, lanza una [avalancha de peones](pawn-storm). En Posiciones tienes más ataques con [sacrificio](sacrifice) para practicar.',
        en: 'Summary: attack the king when you have more pieces near it than it has defenders. The [Greek gift](greek-gift) works if your knight reaches g5, your queen reaches the h-file and nothing can defend h7. Sometimes you have to give up more than one piece, like Lasker. Against an uncastled king, open the centre; with the kings on different sides, launch a [pawn storm](pawn-storm). In Positions you will find more attacks with a [sacrifice](sacrifice) to practise.',
      },
      board: {
        fen: 'r4rk1/1b2bppp/ppq1p3/2ppB2n/5P2/1P1BP3/P1PPQ1PP/R4RK1 w - - 0 15',
        orientation: 'white',
      },
    },
  ],
  next: { kind: 'positions', tag: 'sacrifice' },
};
