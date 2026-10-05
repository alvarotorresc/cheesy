// Lesson 1 for advanced players: a short list of candidate moves, the rival's best answer to each, and the quiet move.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_ADVANCED, CHESSKID, LICHESS_THEMES } from './sources.ts';

export const candidateMoves: LessonSpec = {
  id: 'candidate-moves',
  level: 'advanced',
  order: 1,
  title: { es: 'Jugadas candidatas', en: 'Candidate moves' },
  summary: {
    es: 'Antes de mover, una lista corta de jugadas y la mejor respuesta del rival a cada una.',
    en: 'Before you move, a short list of moves and the rival’s best answer to each one.',
  },
  terms: ['candidate-move', 'quiet-move'],
  sources: [CHESSCOM_ADVANCED, LICHESS_THEMES, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Un jugador fuerte no mira todas las jugadas: hace una lista corta de [jugadas candidatas](candidate-move), las que merecen pensarse. Primero las [jugadas forzantes](forcing-move): los [jaques](check), las capturas y las amenazas, porque dejan al rival pocas respuestas. Después, las que mejoran una pieza. Aquí la dama de h5 tiene una captura en f7 que además es [jaque mate](checkmate): por eso se mira primero lo forzante.',
        en: 'A strong player does not look at every move: he makes a short list of [candidate moves](candidate-move), the ones worth thinking about. First the [forcing moves](forcing-move): [checks](check), captures and threats, because they leave the rival few answers. Then the ones that improve a piece. Here the queen on h5 has a capture on f7 that is also [checkmate](checkmate): that is why you look at forcing moves first.',
      },
      board: {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        orientation: 'white',
        highlights: ['f7'],
        arrows: [{ from: 'h5', to: 'f7' }],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Para cada candidata, pregúntate cuál es la mejor respuesta del rival, no la que te gustaría. Y termina una rama antes de empezar otra, para no mezclarlas. Aquí el caballo blanco captura el peón de e5, pero el caballo negro de c6 lo captura a él. El peón que avanza a d4 ataca a ese caballo, pero el caballo se retira y no recuperas nada: has dado un caballo por un peón.',
        en: 'For each candidate, ask what the rival’s best answer is, not the one you would like. And finish one branch before you start another, so you do not mix them up. Here the white knight takes the pawn on e5, but the black knight on c6 takes it. The pawn that goes to d4 attacks that knight, but the knight steps away and you win nothing back: you have given a knight for a pawn.',
      },
      board: {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        orientation: 'white',
        moves: ['Nxe5', 'Nxe5', 'd4'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Vas un peón por detrás y el peón negro de b7 está suelto. Tres candidatas: capturarlo con la dama, avanzar el peón de h2 a h4 o llevar la torre a c7. ¿Cuál juegas?',
        en: 'You are a pawn down and the black pawn on b7 is loose. Three candidates: take it with the queen, push the pawn from h2 to h4 or bring the rook to c7. Which one do you play?',
      },
      board: { fen: '4r1k1/pp2qppp/8/3Q4/8/8/P4PPP/2R3K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Qxb7', 'h4', 'Rc7'], correct: 1 },
      whyWrong: [
        {
          es: 'Es la captura obvia, pero mira la respuesta: la dama negra baja a e1 con [jaque](check). Tu torre la captura y la torre negra de e8 recaptura: es [mate en la última fila](back-rank).',
          en: 'It is the obvious capture, but look at the answer: the black queen comes down to e1 with [check](check). Your rook takes her and the black rook on e8 takes back: it is [mate on the back rank](back-rank).',
        },
        null,
        {
          es: 'La torre en la séptima parece activa, pero deja sola tu primera fila: la dama negra llega a e1 y es [jaque mate](checkmate).',
          en: 'The rook on the seventh looks active, but it leaves your first rank alone: the black queen reaches e1 and it is [checkmate](checkmate).',
        },
      ],
      explanation: {
        es: 'Eso es. Las dos jugadas «activas» pierden por la misma respuesta: la dama negra entra en e1. Avanzar el peón de h abre una salida a tu rey, y solo entonces podrás pensar en el peón de b7.',
        en: 'That is it. Both «active» moves lose to the same answer: the black queen comes in on e1. Pushing the h-pawn opens an exit for your king, and only then can you think about the pawn on b7.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tienes varias [jugadas forzantes](forcing-move): dos [jaques](check) en la última fila y uno en diagonal. Solo uno gana algo. Encuéntralo.',
        en: 'You have several [forcing moves](forcing-move): two [checks](check) on the back rank and one on a diagonal. Only one wins something. Find it.',
      },
      board: { fen: 'r5k1/p1p4p/1p4p1/8/7q/8/P2Q1PPP/4R1K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qd5+'] },
      wrong: {
        'Re8+': {
          es: 'Es [jaque](check), pero la torre de a8 la captura y te quedas sin torre.',
          en: 'It is [check](check), but the rook on a8 takes it and you are a rook down.',
        },
        'Qd8+': {
          es: 'Es [jaque](check), pero la torre de a8 captura tu dama.',
          en: 'It is [check](check), but the rook on a8 takes your queen.',
        },
      },
      hint: {
        es: 'Busca una casilla desde la que la dama dé [jaque](check) y a la vez mire la torre de a8.',
        en: 'Look for a square from which the queen gives [check](check) and at the same time looks at the rook on a8.',
      },
      explanation: {
        es: 'Bien: desde d5 la dama da [jaque](check) por una diagonal y ataca la torre de a8 por la otra. El rey tiene que moverse, y después tu dama captura la torre. De las tres [jugadas forzantes](forcing-move), solo esta deja al rival sin buena respuesta.',
        en: 'Well done: from d5 the queen gives [check](check) along one diagonal and attacks the rook on a8 along the other. The king has to move, and then your queen takes the rook. Of the three [forcing moves](forcing-move), only this one leaves the rival without a good answer.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'A veces la mejor jugada no da [jaque](check), no captura y no amenaza nada a la vista: es una [jugada tranquila](quiet-move). Prepara algo que llega después. Aquí la jugada activa, la torre a e7, pierde: la torre negra baja a d1 con [jaque](check) y es [mate en la última fila](back-rank). Avanzar el peón de h2 a h3 no ataca nada, pero le da al rey una casilla de escape: después tu torre podrá salir de la primera fila sin miedo al mate.',
        en: 'Sometimes the best move gives no [check](check), captures nothing and threatens nothing you can see: it is a [quiet move](quiet-move). It prepares something that comes later. Here the active move, the rook to e7, loses: the black rook comes down to d1 with [check](check) and it is [mate on the back rank](back-rank). Pushing the pawn from h2 to h3 attacks nothing, but it gives the king an escape square: afterwards your rook can leave the first rank with no fear of mate.',
      },
      board: {
        fen: '3r2k1/pp3ppp/8/8/8/8/PP3PPP/4R1K1 w - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'h2', to: 'h3' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El alfil negro está en a2, metido entre tus peones. No hay [jaques](check) ni capturas que sirvan. Encuentra la [jugada tranquila](quiet-move) que lo deja sin salida.',
        en: 'The black bishop is on a2, stuck among your pawns. There are no useful [checks](check) or captures. Find the [quiet move](quiet-move) that leaves it no way out.',
      },
      board: { fen: '3r2k1/pp3ppp/8/8/8/5N2/bPP2PPP/2K1R3 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['b3'] },
      wrong: {
        'Re8+': {
          es: 'Es un [jaque](check), pero la torre de d8 captura tu torre. Aquí lo forzante no sirve: busca una jugada tranquila.',
          en: 'It is a [check](check), but the rook on d8 takes your rook. Forcing moves do not work here: look for a quiet one.',
        },
        Nd4: {
          es: 'El caballo vigila b3, pero no cierra la diagonal: el alfil sale por c4 o por d5. Eso sí, el caballo no se pierde: si la torre negra lo captura, tu torre baja a e8 y es [jaque mate](checkmate).',
          en: 'The knight watches b3, but it does not close the diagonal: the bishop gets out through c4 or d5. The knight is not lost, though: if the black rook takes it, your rook comes down to e8 and it is [checkmate](checkmate).',
        },
      },
      hint: {
        es: 'Mira por dónde puede escapar el alfil. Tiene dos salidas, y una de ellas ya la vigila tu rey.',
        en: 'Look where the bishop can escape. It has two ways out, and your king already watches one of them.',
      },
      explanation: {
        es: 'Eso es: el peón en b3 cierra la diagonal y está defendido por el de c2. La otra salida, b1, la vigila tu rey. El alfil ya no tiene casillas: tu rey irá a b2 a por él, y lo más que pueden sacar las negras es un peón a cambio. No hubo [jaque](check) ni captura: fue una [jugada tranquila](quiet-move).',
        en: 'That is it: the pawn on b3 closes the diagonal and is defended by the one on c2. The other way out, b1, is watched by your king. The bishop has no squares left: your king will go to b2 for it, and the most Black can get for it is a pawn. There was no [check](check) and no capture: it was a [quiet move](quiet-move).',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Tu idea es capturar la torre de a8 con la dama. Pero el rival también amenaza algo: su dama y su alfil apuntan a h2. Tres [jugadas candidatas](candidate-move): capturar la torre, avanzar el peón de h2 a h3 o llevar el caballo a f3. ¿Cuál atiende la amenaza sin abandonar tu idea?',
        en: 'Your idea is to take the rook on a8 with the queen. But the rival threatens something too: his queen and bishop aim at h2. Three [candidate moves](candidate-move): take the rook, push the pawn from h2 to h3 or bring the knight to f3. Which one meets the threat without giving up your idea?',
      },
      board: { fen: 'r4nk1/p1p1pppp/3b4/3Q4/7q/8/PPPN1PPP/2B2RK1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Qxa8', 'h3', 'Nf3'], correct: 2 },
      whyWrong: [
        {
          es: 'Ganas la torre, pero la dama negra captura en h2 con el apoyo del alfil: es [jaque mate](checkmate).',
          en: 'You win the rook, but the black queen takes on h2 with the bishop’s support: it is [checkmate](checkmate).',
        },
        {
          es: 'Para el [mate](checkmate), pero no amenaza nada. El rival tiene tiempo de salvar su torre y tu idea se pierde.',
          en: 'It stops the [mate](checkmate), but it threatens nothing. The rival has time to save his rook and your idea is gone.',
        },
        null,
      ],
      explanation: {
        es: 'Bien: el caballo en f3 defiende h2 y además ataca la dama negra. La dama no puede volver a defender la torre de a8, porque el peón de e7 le cierra el camino a d8. Las negras no pueden salvar a la vez la dama y la torre, y pierden material. Una candidata que hace dos cosas a la vez suele ser la buena.',
        en: 'Well done: the knight on f3 defends h2 and also attacks the black queen. The queen cannot come back to defend the rook on a8, because the pawn on e7 blocks her way to d8. Black cannot save both the queen and the rook, and loses material. A candidate that does two things at once is usually the right one.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: antes de mover, haz una lista corta de [jugadas candidatas](candidate-move). Empieza por las [forzantes](forcing-move): [jaques](check), capturas y amenazas. Para cada una, busca la mejor respuesta del rival y termina esa rama antes de pasar a otra. Y no olvides las [jugadas tranquilas](quiet-move): a veces la mejor no amenaza nada a la vista.',
        en: 'Summary: before you move, make a short list of [candidate moves](candidate-move). Start with the [forcing ones](forcing-move): [checks](check), captures and threats. For each one, look for the rival’s best answer and finish that branch before you move on. And do not forget [quiet moves](quiet-move): sometimes the best one threatens nothing you can see.',
      },
      board: {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        orientation: 'white',
      },
    },
  ],
};
