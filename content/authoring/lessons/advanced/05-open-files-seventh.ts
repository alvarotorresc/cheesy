// Lesson 5 for advanced players: open and half-open files, doubled rooks and the seventh rank.
import type { LessonSpec } from '../../../types.ts';
import { CHESSKID, LICHESS_THEMES, WIKI_ROOK, WIKI_STRATEGY } from './sources.ts';

export const openFilesSeventh: LessonSpec = {
  id: 'open-files-seventh',
  level: 'advanced',
  order: 5,
  title: { es: 'Columnas abiertas y la séptima fila', en: 'Open files and the seventh rank' },
  summary: {
    es: 'Las torres necesitan columnas sin peones para entrar en el campo rival.',
    en: 'Rooks need files without pawns to get into the rival camp.',
  },
  terms: ['open-file', 'half-open-file', 'doubled-rooks'],
  sources: [WIKI_ROOK, WIKI_STRATEGY, CHESSKID, LICHESS_THEMES],
  next: { kind: 'endgames', category: 'Rook and pawn' },
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [columna abierta](open-file) no tiene peones de ningún bando. Una [columna semiabierta](half-open-file) solo tiene peones del rival. La torre necesita estas columnas: por ellas llega hasta el campo contrario. Aquí la columna d está abierta y la c es semiabierta para las blancas.',
        en: 'An [open file](open-file) has no pawns of either side. A [half-open file](half-open-file) has only the rival’s pawns. The rook needs these files: through them it reaches the opposite camp. Here the d-file is open and the c-file is half-open for White.',
      },
      board: {
        fen: '3r2k1/ppp2ppp/8/8/4P3/8/PP3PPP/2R2RK1 w - - 0 1',
        orientation: 'white',
        highlights: ['c1', 'f1'],
        arrows: [
          { from: 'f1', to: 'd1' },
          { from: 'c1', to: 'c7' },
        ],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Tu torre de a1 quiere una columna. ¿Cuál de estas es una [columna abierta](open-file)?',
        en: 'Your rook on a1 wants a file. Which of these is an [open file](open-file)?',
      },
      board: { fen: 'r5k1/pp3ppp/2p5/4p3/4P3/2P5/PP3PPP/R5K1 w - - 0 1', orientation: 'white' },
      answer: {
        by: 'fact',
        options: [
          { es: 'La columna c', en: 'The c-file' },
          { es: 'La columna d', en: 'The d-file' },
          { es: 'La columna e', en: 'The e-file' },
        ],
        correct: 1,
      },
      whyWrong: [
        {
          es: 'En la columna c hay un peón de cada bando, en c3 y c6: está cerrada.',
          en: 'The c-file has a pawn of each side, on c3 and c6: it is closed.',
        },
        null,
        {
          es: 'En la columna e están los peones de e4 y e5: la torre no pasaría.',
          en: 'The e-file has the pawns on e4 and e5: the rook would not get through.',
        },
      ],
      explanation: {
        es: 'Eso es: en la columna d no hay ningún peón. La torre en d1 llega hasta d8, y la torre negra todavía no la vigila.',
        en: 'That is it: there are no pawns at all on the d-file. The rook on d1 reaches all the way to d8, and the black rook does not watch it yet.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una torre en una columna abierta se puede cambiar por la torre rival. Para quedarte con la columna, pon las dos torres una detrás de otra: son [torres dobladas](doubled-rooks). Si el rival pone su torre en la columna, la tuya de delante puede capturarla y la de detrás recaptura.',
        en: 'A rook on an open file can be traded for the rival rook. To keep the file, put both rooks one behind the other: they are [doubled rooks](doubled-rooks). If the rival puts his rook on the file, your front rook can take it and the one behind takes back.',
      },
      board: {
        fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/2RR2K1 w - - 0 1',
        orientation: 'white',
        moves: ['Rd2', 'Kf8', 'Rcd1'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tus torres están dobladas en la [columna abierta](open-file) d. El rey negro no tiene salida por detrás de sus peones. Entra por la columna: tienes dos jugadas.',
        en: 'Your rooks are doubled on the open d-[file](open-file). The black king has no way out behind his pawns. Get in along the file: you have two moves.',
      },
      board: { fen: 'r5k1/pb2nppp/1p6/8/8/3R2P1/PP3P1P/3R2K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Rd8+', 'Rxd8', 'Rxd8#'] },
      wrong: {
        Rd7: {
          es: 'La torre en la séptima ataca el alfil y el caballo, y es buena jugada. Pero había algo mejor: [mate](checkmate) en dos.',
          en: 'The rook on the seventh attacks the bishop and the knight, and it is a good move. But there was something better: [mate](checkmate) in two.',
        },
      },
      hint: {
        es: 'Las dos torres juntas pueden más que la torre negra de a8. Empieza con [jaque](check).',
        en: 'The two rooks together are stronger than the black rook on a8. Start with [check](check).',
      },
      explanation: {
        es: 'Bien: la primera torre da [jaque](check) en d8, la torre negra la captura y la segunda torre recaptura con [mate](checkmate). Por eso se doblan las torres: la de detrás termina el trabajo.',
        en: 'Well done: the first rook gives [check](check) on d8, the black rook takes it and the second rook takes back with [mate](checkmate). That is why rooks are doubled: the one behind finishes the job.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Al final de una [columna abierta](open-file) está la [séptima fila](seventh-rank): ahí la torre ataca los peones que no se han movido y encierra al rey rival. Vale tanto que compensa un peón. En la partida Polugaevsky contra Evans, de 1970, las blancas van un peón por detrás, pero su torre en d7 les basta para hacer tablas.',
        en: 'At the end of an [open file](open-file) lies the [seventh rank](seventh-rank): there the rook attacks the pawns that have not moved and shuts in the rival king. It is worth so much that it makes up for a pawn. In the game Polugaevsky against Evans, from 1970, White is a pawn down, but his rook on d7 is enough to draw.',
      },
      board: {
        fen: '6k1/1p1R2p1/p1p5/P4p2/1r6/4P3/5KPP/8 w - - 0 1',
        orientation: 'white',
        highlights: ['d7'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Juegas con negras: es la partida Chigorin contra Steinitz, La Habana, 1892. Tus dos torres ya están en tu séptima fila, la segunda de las blancas. Encuentra el golpe.',
        en: 'You play Black: it is the game Chigorin against Steinitz, Havana, 1892. Your two rooks are already on your seventh rank, White’s second. Find the blow.',
      },
      board: {
        fen: '8/pp2R2p/4Nkb1/3P1p2/1B5p/8/PP1rr2P/5R1K b - - 0 32',
        orientation: 'black',
      },
      check: { by: 'engine', solution: ['Rxh2+'] },
      wrong: {
        Rxb2: {
          es: 'Ganas un peón, pero dejas escapar al rey blanco. Había [mate](checkmate).',
          en: 'You win a pawn, but you let the white king escape. There was [mate](checkmate).',
        },
      },
      hint: {
        es: 'Captura el peón que protege al rey blanco, y con [jaque](check).',
        en: 'Take the pawn that shields the white king, and with [check](check).',
      },
      explanation: {
        es: 'Eso es: la torre captura en h2 con [jaque](check). El rey tiene que ir a g1, y entonces la otra torre baja a g2: [jaque mate](checkmate). Chigorin vio el mate y abandonó. Dos torres en la [séptima fila](seventh-rank) son una fuerza terrible.',
        en: 'That is it: the rook takes on h2 with [check](check). The king has to go to g1, and then the other rook comes to g2: [checkmate](checkmate). Chigorin saw the mate and resigned. Two rooks on the [seventh rank](seventh-rank) are a terrible force.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Vas un peón por detrás, pero tu torre está en la [séptima fila](seventh-rank) y el rey negro está encerrado en la octava. Mantén la torre activa y haz tablas.',
        en: 'You are a pawn down, but your rook is on the [seventh rank](seventh-rank) and the black king is shut in on the eighth. Keep the rook active and draw.',
      },
      fen: '6k1/1p1R2p1/8/8/1r6/8/5KP1/8 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'No captures el peón de b7: la torre negra recapturaría. Ataca peones desde la séptima y no dejes que el rey negro salga.',
        en: 'Do not take the pawn on b7: the black rook would take back. Attack pawns from the seventh and do not let the black king out.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: las torres necesitan [columnas abiertas](open-file) o [semiabiertas](half-open-file). Para quedarte con una columna, usa [torres dobladas](doubled-rooks). Por la columna se llega a la [séptima fila](seventh-rank), donde la torre ataca peones y encierra al rey: allí vale tanto como un peón.',
        en: 'Summary: rooks need [open](open-file) or [half-open files](half-open-file). To keep a file, use [doubled rooks](doubled-rooks). The file leads to the [seventh rank](seventh-rank), where the rook attacks pawns and shuts in the king: there it is worth as much as a pawn.',
      },
      board: {
        fen: '6k1/pp3ppp/8/8/8/8/PP3PPP/2RR2K1 w - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'd1', to: 'd7' }],
      },
    },
  ],
};
