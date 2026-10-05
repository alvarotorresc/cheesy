// Lesson 11 for advanced players: prophylaxis, the only defence, counterplay and a fortress.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSCOM_ADVANCED,
  LICHESS_THEMES,
  STEPS_5,
  WIKI_FORTRESS,
  WIKI_PROPHYLAXIS,
} from './sources.ts';

export const defending: LessonSpec = {
  id: 'defending',
  level: 'advanced',
  order: 11,
  title: { es: 'Defenderse', en: 'Defending' },
  summary: {
    es: 'Ver venir la amenaza, encontrar la jugada que la para y no rendirse cuando vas peor.',
    en: 'Seeing the threat coming, finding the move that stops it and not giving up when you are worse.',
  },
  terms: ['prophylaxis', 'counterplay', 'fortress'],
  sources: [STEPS_5, CHESSCOM_ADVANCED, LICHESS_THEMES, WIKI_PROPHYLAXIS, WIKI_FORTRESS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Defenderse empieza con una pregunta: ¿qué quiere hacer el rival? Aquí la torre negra amenaza bajar a d1 y dar [jaque mate](checkmate) en la [última fila](back-rank), porque los peones de f2, g2 y h2 encierran a su propio rey. Las blancas se adelantan: el peón de h2 avanza una casilla y deja al rey un hueco. Evitar a tiempo la idea del rival se llama [profilaxis](prophylaxis).',
        en: 'Defending starts with a question: what does the opponent want to do? Here the black rook threatens to drop to d1 and give [checkmate](checkmate) on the [back rank](back-rank), because the pawns on f2, g2 and h2 shut their own king in. White gets in first: the pawn on h2 steps forward one square and leaves the king a gap. Stopping the opponent’s idea in time is called [prophylaxis](prophylaxis).',
      },
      board: {
        fen: '3r2k1/5ppp/8/8/2R5/8/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d1'],
        moves: ['h3'],
      },
    },
    // onlyMove (spec avanzado §3): the only move that stops the mate on g2; it does not win
    // (Stockfish about -0.1), so test 10 needs `onlyMove`. Validated with check/tacx.ts, depth 18 and 22.
    {
      kind: 'find-move',
      text: {
        es: 'Juegan las blancas. La dama negra de g4 y el alfil de b7 apuntan a g2: amenazan dar mate en esa casilla. Solo una jugada lo para. Encuéntrala.',
        en: 'White to move. The black queen on g4 and the bishop on b7 both aim at g2: they threaten mate on that square. Only one move stops it. Find it.',
      },
      board: { fen: 'r5k1/pb3ppp/1p6/1Np5/6q1/1QP5/PP3PPP/5RK1 w - - 0 1', orientation: 'white' },
      check: {
        by: 'engine',
        solution: ['f3'],
        onlyMove: true,
      },
      wrong: {
        'Qxf7+': {
          es: 'Ese jaque no ayuda: el rey captura tu dama y la amenaza sigue en pie.',
          en: 'That check does not help: the king captures your queen and the threat is still there.',
        },
        Qd5: {
          es: 'Tu dama tapa la [diagonal](diagonal), pero el alfil la captura y vuelve a apuntar a g2.',
          en: 'Your queen blocks the [diagonal](diagonal), but the bishop captures it and aims at g2 again.',
        },
      },
      hint: {
        es: 'Busca un peón que se ponga en medio de la [diagonal](diagonal) del alfil y, de paso, ataque a la dama.',
        en: 'Look for a pawn that steps into the bishop’s [diagonal](diagonal) and attacks the queen at the same time.',
      },
      explanation: {
        es: 'Bien: el peón de f3 tapa la diagonal del alfil y ataca a la dama. La torre de f1 lo protege. La amenaza desaparece y la partida sigue igualada.',
        en: 'Well done: the pawn on f3 blocks the bishop’s diagonal and attacks the queen. The rook on f1 protects it. The threat is gone and the game is level again.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'No siempre hay que esperar al rival. A veces lo mejor es amenazar tú algo en otro sitio, a menudo en el otro [flanco](flank): el rival tiene que contestar y su ataque pierde fuerza. Eso es el [contrajuego](counterplay). Aquí las blancas atacan al rey negro con sus peones, y las negras no se quedan quietas: su torre va a la columna c, que lleva al rey blanco. Ojo: el contrajuego solo vale si tu amenaza llega antes que la suya.',
        en: 'You do not always have to wait for the opponent. Sometimes the best thing is to threaten something yourself somewhere else, often on the other [flank](flank): the opponent has to answer and the attack loses steam. That is [counterplay](counterplay). Here White attacks the black king with pawns, and Black does not sit still: the rook goes to the c-file, which leads to the white king. Careful: counterplay only works if your threat arrives before theirs.',
      },
      board: {
        fen: 'r4rk1/5ppp/8/p7/1p4PP/8/PPP5/2KR3R b - - 0 1',
        orientation: 'black',
        highlights: ['c1'],
        moves: ['Rac8'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Las negras amenazan mate en g2 con la dama y el caballo, y además tienen una pieza más. Puedes defender g2 o atacar tú. ¿Qué jugada eliges?',
        en: 'Black threatens mate on g2 with the queen and the knight, and is a piece up as well. You can defend g2 or attack yourself. Which move do you choose?',
      },
      board: { fen: '2r3k1/pp3ppp/6q1/8/5n2/8/PP1R1PPP/3Q2K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['g3', 'Rd8+', 'Qf1'], correct: 1 },
      whyWrong: [
        {
          es: 'Paras el mate, pero sigues con una pieza menos y las negras mandan. Había algo más rápido.',
          en: 'You stop the mate, but you are still a piece down and Black is in charge. There was something faster.',
        },
        null,
        {
          es: 'La dama defiende g2, pero se queda pasiva: el caballo negro captura en g2 de todos modos, tu rey sigue en apuros y sigues con una pieza menos. Había algo más rápido.',
          en: 'The queen defends g2, but it becomes passive: the black knight takes on g2 anyway, your king is still in trouble and you are still a piece down. There was something faster.',
        },
      ],
      explanation: {
        es: 'Eso es: la torre da jaque en d8. Si la torre negra la captura, tu dama captura en d8 y es mate en la [última fila](back-rank). Tu amenaza llegaba antes que la suya.',
        en: 'That is it: the rook gives check on d8. If the black rook captures it, your queen captures on d8 and it is mate on the [back rank](back-rank). Your threat came before theirs.',
      },
    },
    // onlyMove (spec avanzado §3): the queen exchange with check is the only move that saves the game
    // (Stockfish about -0.3 after it; everything else loses to mate). The reply is a recapture and
    // the second white move is the only recapture. Validated with check/tacx.ts, depth 18 and 22.
    {
      kind: 'find-move',
      text: {
        es: 'Las negras amenazan mate en g2: su dama de g5 y su alfil de f3 atacan esa casilla a la vez. Tu rey no tiene ayuda. Quítale al rival la pieza que ataca: ofrece un cambio que no pueda rechazar.',
        en: 'Black threatens mate on g2: the queen on g5 and the bishop on f3 attack that square at once. Your king has no help. Take away the attacking piece: offer an exchange the opponent cannot turn down.',
      },
      board: { fen: 'r5k1/pp1Q2pp/8/6q1/4P3/5b2/2P2PPP/1NR3K1 w - - 0 1', orientation: 'white' },
      check: {
        by: 'engine',
        solution: ['Qd5+', 'Qxd5', 'exd5'],
        onlyMove: true,
      },
      wrong: {
        'Qe6+': {
          es: 'Es jaque, pero el rey se aparta a una esquina y el mate en g2 sigue en pie.',
          en: 'It is check, but the king steps into the corner and the mate on g2 is still there.',
        },
      },
      hint: {
        es: 'Busca una casilla desde la que tu dama dé [jaque](check) y a la vez se ponga al alcance de la dama negra.',
        en: 'Look for a square from which your queen gives [check](check) and at the same time stands within reach of the black queen.',
      },
      explanation: {
        es: 'Bien: tu dama da jaque desde d5 y se ofrece. Lo mejor para las negras es capturarla. Tras el cambio, tu peón de e4 recupera la dama y las negras se quedan sin ataque. La partida sigue igualada.',
        en: 'Well done: your queen gives check from d5 and offers itself. Black’s best is to capture it. After the exchange, your pawn on e4 takes back the queen and Black has no attack left. The game is level again.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si vas perdiendo, no te rindas. Puedes buscar un [jaque perpetuo](perpetual-check) o una [fortaleza](fortress): una posición en la que el rival, aunque tenga más material, no consigue entrar. Aquí las blancas solo tienen torre y peón contra una dama, y aun así son tablas. El peón de g2 protege a la torre de f3, la torre no deja pasar al rey negro de su [fila](rank) y el rey blanco se queda junto al peón.',
        en: 'If you are losing, do not give up. You can look for a [perpetual check](perpetual-check) or a [fortress](fortress): a position the opponent cannot break into, even with more material. Here White has only a rook and a pawn against a queen, and it is still a draw. The pawn on g2 protects the rook on f3, the rook keeps the black king from crossing its [rank](rank) and the white king stays next to the pawn.',
      },
      board: {
        fen: '8/8/3k4/8/8/5R2/6PK/q7 w - - 0 1',
        orientation: 'white',
        highlights: ['f3', 'g2'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Defiende tú esta [fortaleza](fortress) contra la dama. El rival juega lo mejor posible. Si aguantas, son tablas.',
        en: 'Now you defend this [fortress](fortress) against the queen. The opponent plays as well as possible. If you hold, it is a draw.',
      },
      fen: '8/8/8/4k3/8/5R2/6PK/3q4 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Deja la torre en la tercera fila, en f3 o en h3, donde la protege el peón de g2, y el rey al lado del peón. Una torre suelta la gana la dama con un ataque doble.',
        en: 'Keep the rook on the third rank, on f3 or h3, where the pawn on g2 protects it, and the king next to the pawn. A loose rook falls to a double attack by the queen.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: antes de mover, pregúntate qué quiere el rival y, si puedes, adelántate: eso es la [profilaxis](prophylaxis). Ante una amenaza, busca la jugada que la para; a veces es cambiar la pieza que ataca. Si tu amenaza llega antes, el [contrajuego](counterplay) vale más que defenderse. Y si vas perdiendo, busca un [jaque perpetuo](perpetual-check) o una [fortaleza](fortress).',
        en: 'Summary: before you move, ask yourself what the opponent wants and, if you can, get in first: that is [prophylaxis](prophylaxis). Against a threat, look for the move that stops it; sometimes it is exchanging the attacking piece. If your threat comes first, [counterplay](counterplay) is worth more than defending. And if you are losing, look for a [perpetual check](perpetual-check) or a [fortress](fortress).',
      },
      board: {
        fen: '3r2k1/5ppp/8/8/2R5/7P/5PP1/6K1 b - - 0 1',
        orientation: 'white',
        highlights: ['h2'],
      },
    },
  ],
};
