// Lesson 12 for intermediates: perpetual check, threefold repetition and stalemate as a defence.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_INTERMEDIATE, CHESSKID, LICHESS_THEMES } from './sources.ts';

// Step 2 (perpetual check) and step 4 (stalemate trick): find-moves with 7 pieces or fewer and no
// mate, so the tablebase checks them (test 13), not Stockfish.
const PERPETUAL_FEN = '7k/6qp/8/2Q5/8/8/p7/2K5 w - - 0 1';
const STALEMATE_FEN = '8/8/1q6/4k3/8/7p/7P/5R1K w - - 0 1';

export const drawsAndDefence: LessonSpec = {
  id: 'draws-and-defence',
  level: 'intermediate',
  order: 12,
  title: { es: 'Cómo salvar tablas', en: 'How to save a draw' },
  summary: {
    es: 'Jaque perpetuo, triple repetición y ahogado: cómo empatar una partida que ibas perdiendo.',
    en: 'Perpetual check, threefold repetition and stalemate: how to draw a game you were losing.',
  },
  terms: ['perpetual-check', 'threefold-repetition'],
  sources: [CHESSKID, CHESSCOM_INTERMEDIATE, LICHESS_THEMES],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Cuando vas peor, unas tablas valen mucho. Hay tres formas de conseguirlas en el tablero. El [jaque perpetuo](perpetual-check): das [jaque](check) una y otra vez y el rival no puede evitarlo. La [triple repetición](threefold-repetition): si la misma posición se repite tres veces, con el mismo bando a mover, la partida puede acabar en tablas. Y el [ahogado](stalemate): si el rival te deja sin jugadas legales y tu rey no está en jaque, son tablas.',
        en: 'When you are worse, a draw is worth a lot. There are three ways to get one on the board. [Perpetual check](perpetual-check): you give [check](check) again and again and the rival cannot escape it. [Threefold repetition](threefold-repetition): if the same position comes up three times, with the same side to move, the game can end in a draw. And [stalemate](stalemate): if the rival leaves you with no legal move and your king is not in check, it is a draw.',
      },
      board: { fen: PERPETUAL_FEN, orientation: 'white' },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Las negras están a punto de [coronar](promotion) en a1 y tienen más material. Encuentra el [jaque](check) que salva la partida y, tras la respuesta, el siguiente. Tienes dos jugadas.',
        en: 'Black is about to [promote](promotion) on a1 and has more material. Find the [check](check) that saves the game and, after the answer, the next one. You have two moves.',
      },
      board: { fen: PERPETUAL_FEN, orientation: 'white' },
      check: { by: 'engine', solution: ['Qc8+', 'Qg8', 'Qc3+'] },
      hint: {
        es: 'El rey negro está en la esquina. Tu dama puede darle [jaque](check) por la [fila](rank) 8 y por la gran [diagonal](diagonal).',
        en: 'The black king is in the corner. Your queen can give him [check](check) along [rank](rank) 8 and along the long [diagonal](diagonal).',
      },
      explanation: {
        es: 'Eso es: [jaque perpetuo](perpetual-check). La dama negra tiene que taparse en g8 y en g7 una y otra vez, y tu dama vuelve a dar [jaque](check) desde c8 y desde c3. La posición se repetirá y serán tablas por [triple repetición](threefold-repetition).',
        en: 'That is it: [perpetual check](perpetual-check). The black queen has to block on g8 and on g7 again and again, and your queen gives [check](check) again from c8 and from c3. The position will repeat and it will be a draw by [threefold repetition](threefold-repetition).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El [ahogado](stalemate) también puede ser un recurso tuyo. Si a tu rey le quedan pocas casillas, a veces puedes entregar tus últimas piezas: si el rival las captura y tú no tienes jugadas legales sin estar en [jaque](check), la partida acaba en tablas. Aquí las blancas no tienen ninguna jugada: el rey de a8 no está en jaque y su peón está bloqueado.',
        en: '[Stalemate](stalemate) can also be your own resource. If your king has few squares left, sometimes you can give your last pieces away: if the rival takes them and you have no legal move without being in [check](check), the game ends in a draw. Here White has no move at all: the king on a8 is not in check and his pawn is blocked.',
      },
      board: { fen: 'K7/P7/1q6/8/8/8/8/6k1 w - - 0 1', orientation: 'white' },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Vas perdiendo: el rival tiene dama. Busca la jugada que fuerza el [ahogado](stalemate) si el rival acepta tu regalo.',
        en: 'You are losing: the rival has a queen. Find the move that forces [stalemate](stalemate) if the rival accepts your gift.',
      },
      board: { fen: STALEMATE_FEN, orientation: 'white' },
      check: { by: 'engine', solution: ['Rf5+'] },
      hint: {
        es: 'Tu rey de h1 no tiene jugadas y tu peón está bloqueado. Si tu torre desaparece, ¿qué pasa? Ofrécela con [jaque](check).',
        en: 'Your king on h1 has no moves and your pawn is blocked. If your rook disappears, what happens? Offer it with [check](check).',
      },
      explanation: {
        es: 'Eso es. La torre da [jaque](check) en f5. Si el rey la captura, no te queda ninguna jugada legal y no estás en jaque: [ahogado](stalemate). Y si no la captura, tu torre lo sigue persiguiendo con jaques y no lo deja en paz.',
        en: 'That is it. The rook gives [check](check) on f5. If the king takes it, you have no legal move left and you are not in check: [stalemate](stalemate). And if he does not take it, your rook keeps chasing him with checks and gives him no peace.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Defenderse bien también es saber hacia dónde ir. No te rindas antes de tiempo: busca [jaques](check), piezas activas y [cambios](exchange) que lleven a un final de tablas. Por ejemplo, con rey solo contra rey y peón, a menudo basta con ponerse delante del peón y tomar la [oposición](opposition).',
        en: 'Defending well also means knowing where to head. Do not give up too soon: look for [checks](check), active pieces and [exchanges](exchange) that lead to a drawn ending. For example, with a lone king against king and pawn, it is often enough to get in front of the pawn and take the [opposition](opposition).',
      },
      board: {
        fen: '8/8/8/5p2/5k2/8/5K2/8 b - - 0 1',
        orientation: 'white',
        highlights: ['f2', 'f4'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Estás peor: tienes el rey solo contra rey y peón. Juegan las blancas. ¿Qué jugada salva las tablas?',
        en: 'You are worse: you have a lone king against king and pawn. White to move. Which move saves the draw?',
      },
      board: { fen: '8/8/8/5p2/5k2/8/8/4K3 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Ke2', 'Kf2', 'Kf1'], correct: 1 },
      whyWrong: [
        {
          es: 'El rey negro se escapa por g3 y tu rey ya no consigue frenar el peón. Ponte enfrente del rey negro.',
          en: 'The black king slips out through g3 and your king can no longer stop the pawn. Stand facing the black king.',
        },
        null, // Kf2: correct
        {
          es: 'Demasiado atrás: el rey negro toma la [oposición](opposition) en f3 y su peón avanza con ayuda.',
          en: 'Too far back: the black king takes the [opposition](opposition) on f3 and his pawn moves up with help.',
        },
      ],
      explanation: {
        es: 'Eso es: el rey a f2, enfrente del negro con una casilla en medio. Tienes la [oposición](opposition), y el peón no pasa: tablas.',
        en: 'That is it: the king to f2, facing the black one with one square between. You have the [opposition](opposition), and the pawn does not get through: a draw.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Último reto: tienes rey y peón contra dama. Parece perdido, pero con un peón de c es tablas si sabes usar el [ahogado](stalemate). Aguanta: cada vez que te den [jaque](check), lleva el rey hacia la esquina o delante del peón.',
        en: 'Last challenge: you have king and pawn against a queen. It looks lost, but with a c-pawn it is a draw if you know how to use [stalemate](stalemate). Hold on: every time you get a [check](check), take the king towards the corner or in front of the pawn.',
      },
      fen: '8/1KP5/8/8/8/8/6q1/4k3 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Sal del [jaque](check) a a7, b8 o c8; si te vas a b6 o a a6, pierdes. Con tu rey en a8, si la dama captura el peón de c7, es [ahogado](stalemate).',
        en: 'Get out of [check](check) to a7, b8 or c8; if you go to b6 or a6, you lose. With your king on a8, if the queen takes the pawn on c7, it is [stalemate](stalemate).',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: estar peor no es haber perdido. Busca un [jaque perpetuo](perpetual-check), una [triple repetición](threefold-repetition) o un [ahogado](stalemate); mantén tus piezas activas y cambia hacia finales de tablas. En Finales tienes posiciones de dama contra peón en las que el ahogado salva la partida.',
        en: 'Summary: being worse is not the same as having lost. Look for a [perpetual check](perpetual-check), a [threefold repetition](threefold-repetition) or a [stalemate](stalemate); keep your pieces active and exchange into drawn endings. In Endgames you will find queen against pawn positions where stalemate saves the game.',
      },
      board: { fen: 'K7/P7/1q6/8/8/8/8/6k1 w - - 0 1', orientation: 'white' },
    },
  ],
  next: { kind: 'endgames', category: 'Queen against pawn' },
};
