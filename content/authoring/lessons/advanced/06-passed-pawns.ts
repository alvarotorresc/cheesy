// Lesson 6 for advanced players: making, supporting and stopping a passed pawn, with Lucena and Philidor.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSKID,
  LICHESS_PRACTICE,
  WIKI_BLOCKADE,
  WIKI_PASSED_PAWN,
  WIKI_TARRASCH_RULE,
} from './sources.ts';

export const passedPawns: LessonSpec = {
  id: 'passed-pawns',
  level: 'advanced',
  order: 6,
  title: { es: 'El peón pasado', en: 'The passed pawn' },
  summary: {
    es: 'Cómo se crea, cómo se apoya y cómo se frena un peón pasado, con Lucena y Philidor.',
    en: 'How a passed pawn is made, supported and stopped, with Lucena and Philidor.',
  },
  terms: [
    'pawn-majority',
    'outside-passed-pawn',
    'connected-passed-pawns',
    'blockade',
    'lucena-position',
    'philidor-position',
    'building-a-bridge',
  ],
  sources: [WIKI_PASSED_PAWN, WIKI_TARRASCH_RULE, WIKI_BLOCKADE, CHESSKID, LICHESS_PRACTICE],
  next: { kind: 'endgames', category: 'Rook and pawn' },
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Un [peón pasado](passed-pawn) no tiene delante ningún peón rival, ni en su columna ni en las de al lado: nada lo frena salvo las piezas. Cada paso que da lo acerca a la [coronación](promotion), así que hay que vigilarlo siempre, sea tuyo o del rival. Aquí el peón de b5 es pasado.',
        en: 'A [passed pawn](passed-pawn) has no rival pawn in front of it, on its own file or on the ones next to it: only pieces can stop it. Every step brings it closer to [promotion](promotion), so it must always be watched, whether it is yours or the rival’s. Here the pawn on b5 is passed.',
      },
      board: {
        fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['b5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un peón pasado se crea con una [mayoría de peones](pawn-majority): más peones que el rival en un [flanco](flank). Aquí las blancas tienen tres contra dos en el flanco de dama. Avanzan juntos, se cambian y al final queda uno sin rival delante.',
        en: 'A passed pawn is made with a [pawn majority](pawn-majority): more pawns than the rival on one [flank](flank). Here White has three against two on the queenside. They advance together, trade off, and in the end one is left with no rival in front of it.',
      },
      board: {
        fen: '6k1/pp3ppp/8/8/8/8/PPP2PP1/6K1 w - - 0 1',
        orientation: 'white',
        moves: [
          'b4',
          'Kf8',
          'c4',
          'Ke7',
          'c5',
          'Kd7',
          'b5',
          'Kc7',
          'a4',
          'Kb8',
          'c6',
          'bxc6',
          'bxc6',
        ],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Un [peón pasado alejado](outside-passed-pawn) está lejos de los demás peones. El rey rival tiene que ir a pararlo, y mientras tanto tu rey se come los peones del otro lado. Aquí el rey negro tiene que quedarse junto al peón de a5. Mientras se lo come, el rey blanco cruza el tablero, captura el peón de h5 y el suyo de h4 ya no tiene quien lo pare.',
        en: 'An [outside passed pawn](outside-passed-pawn) is far from the other pawns. The rival king has to go and stop it, and meanwhile your king eats the pawns on the other side. Here the black king has to stay next to the pawn on a5. While he eats it, the white king crosses the board, takes the pawn on h5, and his own pawn on h4 has nobody left to stop it.',
      },
      board: {
        fen: '8/8/2k5/P6p/2K4P/8/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['a5'],
        moves: ['Kd4', 'Kb5', 'Ke5', 'Kxa5', 'Kf5', 'Kb6', 'Kg5', 'Kc7', 'Kxh5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Los [peones pasados unidos](connected-passed-pawns) están en columnas vecinas y se protegen uno a otro al avanzar. Son tan fuertes que, en la sexta fila, valen tanto como una torre. Aquí los de b5 y c5 son pasados y están unidos: en cuanto uno avance a la sexta fila, el otro lo protegerá desde atrás.',
        en: '[Connected passed pawns](connected-passed-pawns) stand on neighbouring files and protect each other as they advance. They are so strong that, on the sixth rank, they are worth as much as a rook. Here the ones on b5 and c5 are passed and connected: as soon as one steps to the sixth rank, the other protects it from behind.',
      },
      board: {
        fen: '8/5ppp/4k3/1PP5/8/8/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['b5', 'c5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Con torres, la torre va detrás del peón pasado: desde ahí lo empuja, y cuanto más avanza el peón, más casillas ve la torre. Es la regla de Tarrasch. En la partida 34 del Mundial de 1927, Alekhine contra Capablanca, la torre blanca de a4 está detrás de su peón de a5. Las blancas ganaron.',
        en: 'With rooks, the rook goes behind the passed pawn: from there it pushes it, and the further the pawn goes, the more squares the rook sees. It is the Tarrasch rule. In game 34 of the 1927 World Championship, Alekhine against Capablanca, the white rook on a4 stands behind its pawn on a5. White won.',
      },
      board: {
        fen: '8/5pk1/r5pp/P7/R6P/6P1/5PK1/8 b - - 0 54',
        orientation: 'white',
        highlights: ['a4', 'a5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Para frenar un peón pasado, ponle una pieza delante: es el [bloqueo](blockade). El propio peón le hace de escudo: una torre rival no puede atacarla desde detrás del peón. El mejor bloqueador es el caballo: desde ahí sigue atacando casillas. Aquí el caballo negro de d6 para el peón de d5.',
        en: 'To stop a passed pawn, put a piece in front of it: that is the [blockade](blockade). The pawn itself shields it: a rival rook cannot attack it from behind the pawn. The best blockader is the knight: from there it still attacks squares. Here the black knight on d6 stops the pawn on d5.',
      },
      board: {
        fen: '6k1/5ppp/3n4/3P4/8/8/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d6'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'La [posición de Lucena](lucena-position), en la columna d. Tu peón está a punto de coronar y tu torre corta al rey negro. Gana: saca el rey y [construye un puente](building-a-bridge) con la torre para tapar los [jaques](check).',
        en: 'The [Lucena position](lucena-position), on the d-file. Your pawn is about to promote and your rook cuts off the black king. Win it: bring the king out and [build a bridge](building-a-bridge) with the rook to block the [checks](check).',
      },
      fen: '3K4/3P1k2/8/8/8/8/7r/4R3 w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'Primero sube la torre a la cuarta fila. Después saca el rey; cuando la torre negra dé [jaques](check), tu torre se pone delante.',
        en: 'First lift the rook to the fourth rank. Then bring the king out; when the black rook gives [checks](check), your rook steps in front.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'La [posición de Philidor](philidor-position), con los colores cambiados. Defiendes con blancas: tu rey está delante del peón y tu torre, en tu tercera fila, no deja pasar al rey negro. Haz tablas.',
        en: 'The [Philidor position](philidor-position), with the colours reversed. You defend with White: your king is in front of the pawn and your rook, on your third rank, keeps the black king out. Draw it.',
      },
      fen: '8/8/8/8/2kp4/5R2/7r/3K4 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Deja la torre en la tercera fila hasta que el peón avance a ella. Entonces vete atrás con la torre y da [jaques](check) por detrás al rey negro.',
        en: 'Keep the rook on the third rank until the pawn steps onto it. Then drop back with the rook and give the black king [checks](check) from behind.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: el [peón pasado](passed-pawn) sale de una [mayoría de peones](pawn-majority). El [peón pasado alejado](outside-passed-pawn) se lleva al rey rival, y los [peones pasados unidos](connected-passed-pawns) se protegen solos. Con torres, la torre va detrás del peón. Para frenarlo, el [bloqueo](blockade), mejor con un caballo. Y en los finales de torre, [Lucena](lucena-position) gana con un [puente](building-a-bridge) y [Philidor](philidor-position) hace tablas.',
        en: 'Summary: the [passed pawn](passed-pawn) comes from a [pawn majority](pawn-majority). The [outside passed pawn](outside-passed-pawn) draws the rival king away, and [connected passed pawns](connected-passed-pawns) protect themselves. With rooks, the rook goes behind the pawn. To stop it, the [blockade](blockade), best with a knight. And in rook endgames, [Lucena](lucena-position) wins with a [bridge](building-a-bridge) and [Philidor](philidor-position) draws.',
      },
      board: {
        fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['b5'],
      },
    },
  ],
};
