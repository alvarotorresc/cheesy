// Lesson 8 for intermediates: checks, captures and threats, calculation and the sacrifice.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_INTERMEDIATE, CHESSKID, LICHESS_THEMES, WIKI_TACTICS } from './sources.ts';

export const forcingMoves: LessonSpec = {
  id: 'forcing-moves',
  level: 'intermediate',
  order: 8,
  title: { es: 'Jaques, capturas y amenazas', en: 'Checks, captures and threats' },
  summary: {
    es: 'Las jugadas que obligan al rival, cómo calcularlas y cuándo merece la pena entregar material.',
    en: 'The moves that force the rival, how to calculate them and when giving up material pays off.',
  },
  terms: ['forcing-move', 'sacrifice', 'attraction'],
  sources: [LICHESS_THEMES, CHESSCOM_INTERMEDIATE, CHESSKID, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Una [jugada forzante](forcing-move) deja al rival pocas respuestas. Hay tres clases: los [jaques](check), las capturas y las amenazas. Un jaque obliga a salir del jaque; una captura casi obliga a recapturar; una amenaza obliga a defenderse. Antes de elegir jugada, mira primero las tuyas, en ese orden: jaques, capturas y amenazas. Aquí las blancas tienen dos jaques, los de las flechas.',
        en: 'A [forcing move](forcing-move) leaves the rival few answers. There are three kinds: [checks](check), captures and threats. A check must be answered by getting out of check; a capture almost forces a recapture; a threat forces a defence. Before choosing a move, look at yours first, in that order: checks, captures and threats. Here White has two checks, the ones on the arrows.',
      },
      board: {
        fen: '5r1k/ppq2pp1/8/6N1/8/4Q3/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
        arrows: [
          { from: 'e3', to: 'h3' },
          { from: 'g5', to: 'f7' },
        ],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Calcular es imaginar la partida unas jugadas por delante sin mover las piezas: «yo juego esto, él contesta aquello, y entonces yo…». Con las [jugadas forzantes](forcing-move) es más fácil, porque el rival tiene pocas respuestas y puedes mirarlas todas. En la posición anterior, si la dama da [jaque](check) en h3, al rey negro solo le queda una casilla. ¿Y después?',
        en: 'Calculating means picturing the game a few moves ahead without moving the pieces: “I play this, he answers that, and then I…”. With [forcing moves](forcing-move) it is easier, because the rival has few answers and you can look at all of them. In the last position, if the queen gives [check](check) on h3, the black king has only one square left. And then?',
      },
      board: {
        fen: '5r1k/ppq2pp1/8/6N1/8/4Q3/PP3PPP/6K1 w - - 0 1',
        orientation: 'white',
        arrows: [{ from: 'e3', to: 'h3' }],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Termina el cálculo: da [mate](checkmate) en dos jugadas, empezando por un [jaque](check).',
        en: 'Finish the calculation: give [checkmate](checkmate) in two moves, starting with a [check](check).',
      },
      board: { fen: '5r1k/ppq2pp1/8/6N1/8/4Q3/PP3PPP/6K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qh3+', 'Kg8', 'Qh7#'] },
      wrong: {
        'Nxf7+': {
          es: 'Es un [jaque](check), pero el rival captura el caballo y has dado una pieza por un peón. Prueba el otro jaque.',
          en: 'It is a [check](check), but the rival takes the knight and you have given a piece for a pawn. Try the other check.',
        },
      },
      hint: {
        es: 'Después del [jaque](check) en h3, el rey solo puede ir a g8. ¿Qué casilla junto a él vigila tu caballo?',
        en: 'After the [check](check) on h3, the king can only go to g8. Which square next to him does your knight guard?',
      },
      explanation: {
        es: 'Eso es. Tras el [jaque](check) en h3, el rey va a g8, y la dama entra en h7, defendida por el caballo de g5: [mate](checkmate). Dos [jugadas forzantes](forcing-move) y el rival no tuvo elección.',
        en: 'That is it. After the [check](check) on h3, the king goes to g8, and the queen comes in on h7, defended by the knight on g5: [checkmate](checkmate). Two [forcing moves](forcing-move) and the rival had no choice.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu alfil de d3 tapa la [columna](file) entre tu torre de d1 y la dama negra de d8. Aparta el alfil con [jaque](check) y luego captura. Tienes dos jugadas.',
        en: 'Your bishop on d3 blocks the [file](file) between your rook on d1 and the black queen on d8. Move the bishop away with [check](check), then capture. You have two moves.',
      },
      board: { fen: '3q2k1/ppr2ppp/8/8/8/3B3P/PP3PP1/3R1RK1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Bxh7+', 'Kxh7', 'Rxd8'] },
      wrong: {
        Bc4: {
          es: 'Destapas la torre, pero sin [jaque](check) el rival tiene tiempo: aparta su dama y no ganas nada. Busca un jaque.',
          en: 'You uncover the rook, but without [check](check) the rival has time: he moves his queen away and you win nothing. Look for a check.',
        },
      },
      hint: {
        es: 'Hay un solo [jaque](check) con el alfil, y además captura un peón.',
        en: 'There is only one [check](check) with the bishop, and it takes a pawn too.',
      },
      explanation: {
        es: 'Bien. El alfil captura en h7 con [jaque](check). El rival tiene que atender al rey y no puede salvar la dama, que cae con la torre. Das un alfil y ganas una dama.',
        en: 'Well done. The bishop takes on h7 with [check](check). The rival has to look after the king and cannot save the queen, who falls to the rook. You give a bishop and win a queen.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'A veces la [jugada forzante](forcing-move) buena entrega material: es un [sacrificio](sacrifice). Merece la pena cuando lo que viene después vale más, como un [mate](checkmate). Un sacrificio muy útil es la [atracción](attraction): obligar al rey, o a otra pieza, a ir a la casilla donde le espera el golpe. Aquí la dama blanca captura la torre de c8 con [jaque](check): el rey tiene que capturarla y queda en c8, y entonces la torre da jaque en d8, defendida por el alfil.',
        en: 'Sometimes the right [forcing move](forcing-move) gives material away: it is a [sacrifice](sacrifice). It pays off when what comes next is worth more, such as a [checkmate](checkmate). A very useful sacrifice is [attraction](attraction): forcing the king, or another piece, onto the square where the blow is waiting. Here the white queen takes the rook on c8 with [check](check): the king has to take her and ends up on c8, and then the rook checks on d8, defended by the bishop.',
      },
      board: {
        fen: '1kr5/ppp3pp/4Q3/6Bq/8/8/PPP3PP/1K1R4 w - - 0 1',
        orientation: 'white',
        moves: ['Qxc8+', 'Kxc8', 'Rd8#'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'La misma idea, ahora en el otro lado del tablero. Da [mate](checkmate) en dos jugadas: entrega la dama para llevar al rey negro a la casilla que te conviene.',
        en: 'The same idea, now on the other side of the board. Give [checkmate](checkmate) in two moves: give up the queen to lure the black king onto the square you want.',
      },
      board: { fen: '5rk1/pp3ppp/3Q4/qB6/8/8/PP3PPP/4R1K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Qxf8+', 'Kxf8', 'Re8#'] },
      hint: {
        es: 'Captura la torre de f8 con la dama. Si el rey la recupera, ¿qué torre le da [jaque](check)?',
        en: 'Take the rook on f8 with the queen. If the king takes back, which rook gives him [check](check)?',
      },
      explanation: {
        es: 'Eso es: la [atracción](attraction). Tras el [sacrificio](sacrifice), el rey queda en f8; la torre da [jaque](check) en e8 con el alfil detrás, y el rey no tiene casillas: [mate](checkmate). En una partida nadie te avisa de que está ahí: hay que buscarlo.',
        en: 'That is it: [attraction](attraction). After the [sacrifice](sacrifice), the king stands on f8; the rook gives [check](check) on e8 with the bishop behind it, and the king has no squares: [checkmate](checkmate). In a game nobody tells you it is there: you have to look for it.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Juegan las blancas, y tienen tres [jugadas forzantes](forcing-move): dos [jaques](check) de caballo y uno de torre. Mira lo que contesta el rival a cada uno: ¿cuál funciona?',
        en: 'White to move, with three [forcing moves](forcing-move): two knight [checks](check) and one rook check. Look at what the rival answers to each: which one works?',
      },
      board: { fen: 'r5k1/pp3ppp/2q5/3N4/8/8/PP3PPP/3QR1K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Nf6+', 'Ne7+', 'Re8+'], correct: 1 },
      whyWrong: [
        {
          es: 'El peón de g7 captura el caballo y no ganas nada.',
          en: 'The pawn on g7 takes the knight and you win nothing.',
        },
        null, // Ne7+: correct
        {
          es: 'La torre de a8 captura la tuya en e8: has regalado una torre.',
          en: 'The rook on a8 takes yours on e8: you have given a rook away.',
        },
      ],
      explanation: {
        es: 'Eso es. El caballo da [jaque](check) en e7 y a la vez ataca la dama de c6: es una [horquilla](fork). El rey tiene que apartarse y la dama cae. Los tres eran jaques, pero solo uno ganaba: por eso se mira la respuesta del rival a cada [jugada forzante](forcing-move), y no solo la primera que aparece.',
        en: 'That is it. The knight gives [check](check) on e7 and at the same time attacks the queen on c6: it is a [fork](fork). The king has to step aside and the queen falls. All three were checks, but only one won: that is why you look at the rival’s answer to every [forcing move](forcing-move), not just the first one you see.',
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Una combinación de tres jugadas. [Sacrifica](sacrifice) la torre para atraer al rey a la esquina, y luego trae la dama por la [columna](file) h. Da [mate](checkmate) en tres.',
        en: 'A combination of three moves. [Sacrifice](sacrifice) the rook to lure the king into the corner, then bring the queen along the h-[file](file). Give [checkmate](checkmate) in three.',
      },
      board: { fen: 'r1q2rk1/pp3pp1/8/6N1/8/7R/PP3PP1/3Q2K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Rh8+', 'Kxh8', 'Qh5+', 'Kg8', 'Qh7#'] },
      wrong: {
        Qh5: {
          es: 'Amenazas [mate](checkmate), pero no es [forzante](forcing-move): el rival tiene tiempo de defenderse. Empieza con un [jaque](check).',
          en: 'You threaten [checkmate](checkmate), but it is not [forcing](forcing-move): the rival has time to defend. Start with a [check](check).',
        },
      },
      hint: {
        es: 'La torre da [jaque](check) en h8. Si el rey la captura, ¿cómo llega tu dama a la [columna](file) h dando jaque?',
        en: 'The rook gives [check](check) on h8. If the king takes it, how does your queen reach the h-[file](file) with check?',
      },
      explanation: {
        es: 'Muy bien. La torre se entrega en h8 y el rey tiene que capturarla. La dama da [jaque](check) en h5, el rey vuelve a g8, y la dama entra en h7 defendida por el caballo: [mate](checkmate). Tres [jugadas forzantes](forcing-move) seguidas: un [sacrificio](sacrifice) de [atracción](attraction), un jaque y el mate.',
        en: 'Very good. The rook gives itself up on h8 and the king has to take it. The queen gives [check](check) on h5, the king goes back to g8, and the queen comes in on h7 defended by the knight: [checkmate](checkmate). Three [forcing moves](forcing-move) in a row: an [attraction](attraction) [sacrifice](sacrifice), a check and the mate.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: antes de cada jugada, busca tus [jugadas forzantes](forcing-move): primero los [jaques](check), luego las capturas y luego las amenazas. Para cada una, imagina la respuesta del rival y sigue hasta que la cosa se calme. Si al final ganas, un [sacrificio](sacrifice) puede ser la mejor jugada; la [atracción](attraction) lleva al rey a la casilla donde le espera el [mate](checkmate). Y mira también las jugadas forzantes del rival, antes de que las juegue.',
        en: 'Summary: before every move, look for your [forcing moves](forcing-move): first [checks](check), then captures, then threats. For each one, picture the rival’s answer and keep going until things calm down. If you win in the end, a [sacrifice](sacrifice) can be the best move; [attraction](attraction) brings the king onto the square where the [checkmate](checkmate) is waiting. And look at the rival’s forcing moves too, before he plays them.',
      },
      board: { fen: 'r1q2rk1/pp3ppQ/8/6N1/8/8/PP3PP1/6K1 b - - 0 3', orientation: 'white' },
    },
  ],
  next: { kind: 'positions', tag: 'queen-sacrifice' },
};
