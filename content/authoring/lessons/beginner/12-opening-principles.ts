// Lesson 12 for beginners: four general ideas for the first moves of a game.
import type { LessonSpec } from '../../../types.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const WIKI_OPENING = 'https://en.wikipedia.org/wiki/Chess_opening';
const CHESSCOM_OPENING = 'https://www.chess.com/lessons/opening-principles';
const CHESSCOM_CENTER = 'https://www.chess.com/terms/chess-center';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_E4_E5_NF3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const ITALIAN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

export const openingPrinciples: LessonSpec = {
  id: 'opening-principles',
  level: 'beginner',
  order: 12,
  title: { es: 'Cómo empezar una partida', en: 'How to start a game' },
  summary: {
    es: 'Cuatro ideas para las primeras jugadas: centro, desarrollo, enroque y paciencia con la dama.',
    en: 'Four ideas for the first moves: centre, development, castling and patience with the queen.',
  },
  terms: ['centre', 'development'],
  sources: [WIKI_OPENING, CHESSCOM_OPENING, CHESSCOM_CENTER],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Al empezar la partida, unas pocas ideas te ayudan a elegir jugada. La primera: ocupar el [centro](centre), que son las cuatro casillas marcadas. Desde el centro, las piezas llegan a más sitios. Por eso muchas partidas empiezan avanzando un peón central dos casillas, como aquí.',
        en: 'At the start of the game, a few ideas help you choose a move. The first: take the [centre](centre), which is the four marked squares. From the centre, pieces reach more squares. That is why many games start by pushing a central pawn two squares, like here.',
      },
      board: {
        fen: START,
        orientation: 'white',
        highlights: ['d4', 'e4', 'd5', 'e5'],
        moves: ['e4', 'e5'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La segunda: sacar pronto los caballos y los alfiles de su casilla inicial. Se llama [desarrollo](development). Llévalos hacia el [centro](centre) y procura mover cada pieza una sola vez al principio: así juegan todas. Aquí los dos bandos sacan un caballo y un alfil.',
        en: 'The second: bring the knights and bishops out from their starting squares early. This is called [development](development). Take them towards the [centre](centre) and try to move each piece only once at the start: that way they all join in. Here both sides bring out a knight and a bishop.',
      },
      board: {
        fen: START,
        orientation: 'white',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las blancas. ¿Qué jugada sigue mejor estas ideas?',
        en: 'White to move. Which move follows these ideas best?',
      },
      board: { fen: AFTER_E4_E5, orientation: 'white' },
      answer: { by: 'engine', options: ['Qg4', 'Nf3', 'f3'], correct: 1 },
      whyWrong: [
        {
          es: 'Sacar la dama tan pronto no es buena idea: las piezas rivales la atacan mientras se [desarrollan](development), y tendrás que moverla otra vez.',
          en: 'Bringing the queen out this early is not a good idea: the rival pieces attack her while they [develop](development), and you will have to move her again.',
        },
        null, // correct option: no whyWrong
        {
          es: 'Ese peón no saca ninguna pieza: le quita al caballo su mejor casilla, f3, y deja al rey más al descubierto.',
          en: 'That pawn move brings out no piece: it takes the knight’s best square, f3, and leaves the king more exposed.',
        },
      ],
      explanation: {
        es: 'Eso es: el caballo sale hacia el [centro](centre) y ataca el peón de e5. Es [desarrollo](development) y lucha por el centro a la vez.',
        en: 'That is it: the knight comes out towards the [centre](centre) and attacks the pawn on e5. It is [development](development) and a fight for the centre at the same time.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La tercera: poner el rey a salvo. Con el rey en el [centro](centre), cualquier ataque le llega pronto. Por eso conviene [enrocar](castling) en las primeras jugadas: el rey se esconde detrás de sus peones y la torre se acerca al centro. Aquí las blancas ya han sacado el caballo y el alfil, y enrocan.',
        en: 'The third: keep the king safe. With the king in the [centre](centre), any attack reaches him quickly. That is why it pays to [castle](castling) in the first few moves: the king hides behind his pawns and the rook comes closer to the centre. Here White has already brought out the knight and the bishop, and castles.',
      },
      board: { fen: ITALIAN, orientation: 'white', moves: ['O-O'] },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las blancas. ¿Qué jugada sigue mejor las ideas de la lección?',
        en: 'White to move. Which move follows the ideas of the lesson best?',
      },
      board: { fen: ITALIAN, orientation: 'white' },
      answer: { by: 'engine', options: ['Ke2', 'Rg1', 'O-O'], correct: 2 },
      whyWrong: [
        {
          es: 'El rey sale hacia el [centro](centre), donde es más fácil atacarlo, y pierde para siempre el derecho a [enrocar](castling).',
          en: 'The king steps towards the [centre](centre), where he is easier to attack, and loses the right to [castle](castling) for good.',
        },
        {
          es: 'Mover la torre le quita el derecho a [enrocar](castling) por ese lado, y la torre no hace nada en g1.',
          en: 'Moving the rook takes away the right to [castle](castling) on that side, and the rook does nothing on g1.',
        },
        null, // correct option: no whyWrong
      ],
      explanation: {
        es: 'Eso es: con el [enroque](castling), el rey queda a salvo y la torre se une al juego. Las blancas ya tienen fuera el caballo y el alfil: era el momento.',
        en: 'That is it: with [castling](castling), the king is safe and the rook joins the game. White already has the knight and the bishop out: it was the right moment.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'La cuarta: no saques la dama antes de tiempo. Es la pieza más valiosa, así que, cuando sale pronto, las piezas rivales la atacan y se [desarrollan](development) a la vez. Mira: la dama negra captura en d5, y el caballo blanco sale a c3 atacándola. Las negras tendrán que mover la dama otra vez en lugar de sacar otra pieza.',
        en: 'The fourth: do not bring the queen out too early. She is the most valuable piece, so when she comes out early, the rival pieces attack her and [develop](development) at the same time. Watch: the black queen captures on d5, and the white knight comes out to c3, attacking her. Black will have to move the queen again instead of bringing out another piece.',
      },
      board: {
        fen: START,
        orientation: 'white',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las negras. El caballo blanco ataca su peón de e5. ¿Qué jugada sigue mejor las ideas de la lección?',
        en: 'Black to move. The white knight attacks their pawn on e5. Which move follows the ideas of the lesson best?',
      },
      board: { fen: AFTER_E4_E5_NF3, orientation: 'black' },
      answer: { by: 'engine', options: ['Qf6', 'Nc6', 'h6'], correct: 1 },
      whyWrong: [
        {
          es: 'La dama defiende el peón, pero sale demasiado pronto y le quita al caballo su casilla, f6.',
          en: 'The queen defends the pawn, but she comes out too early and takes the knight’s square, f6.',
        },
        null, // correct option: no whyWrong
        {
          es: 'Ese peón de [flanco](flank) no saca ninguna pieza ni ayuda en el [centro](centre), y el peón de e5 sigue sin defensa.',
          en: 'That [flank](flank) pawn move brings out no piece and does not help in the [centre](centre), and the pawn on e5 is still undefended.',
        },
      ],
      explanation: {
        es: 'Eso es: el caballo sale hacia el [centro](centre) y defiende el peón de e5. [Desarrollo](development) y defensa en una sola jugada.',
        en: 'That is it: the knight comes out towards the [centre](centre) and defends the pawn on e5. [Development](development) and defence in a single move.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: al empezar, ocupa el [centro](centre) con los peones, saca pronto caballos y alfiles, que es el [desarrollo](development), [enroca](castling) en las primeras jugadas y no saques la dama antes de tiempo. Son ideas generales, no reglas: te ayudan a elegir cuando no sabes qué jugar. En Aperturas verás cómo se aplican en aperturas de verdad.',
        en: 'Summary: at the start, take the [centre](centre) with your pawns, bring out knights and bishops early, which is [development](development), [castle](castling) in the first few moves and do not bring the queen out too early. They are general ideas, not rules: they help you choose when you do not know what to play. In Openings you will see how they apply in real openings.',
      },
      board: {
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
        orientation: 'white',
      },
    },
  ],
  next: { kind: 'openings' },
};
