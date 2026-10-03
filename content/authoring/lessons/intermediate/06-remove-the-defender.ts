// Lesson 6 for intermediates: removing, deflecting and overloading a defender.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_INTERMEDIATE, LICHESS_THEMES, STEPS_4, WIKI_TACTICS } from './sources.ts';

const DEFENDER = '6k1/5ppp/5n2/3b2B1/8/8/5PPP/3R2K1 w - - 0 1';

export const removeTheDefender: LessonSpec = {
  id: 'remove-the-defender',
  level: 'intermediate',
  order: 6,
  title: { es: 'Quitar al defensor', en: 'Removing the defender' },
  summary: {
    es: 'Capturar, desviar o sobrecargar a la pieza que defiende a otra.',
    en: 'Capturing, deflecting or overloading the piece that defends another.',
  },
  terms: ['removing-the-defender', 'deflection', 'overloading'],
  sources: [LICHESS_THEMES, CHESSCOM_INTERMEDIATE, STEPS_4, WIKI_TACTICS],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Si una pieza rival defiende a otra, puedes [eliminar al defensor](removing-the-defender): lo capturas, y lo que defendía se queda sin defensa. Aquí el caballo de f6 defiende al alfil de d5. Si tu alfil captura el caballo, el alfil de d5 queda [colgado](hanging-piece) frente a tu torre.',
        en: 'If an enemy piece defends another, you can [remove the defender](removing-the-defender): you capture it, and what it defended is left without defence. Here the knight on f6 defends the bishop on d5. If your bishop captures the knight, the bishop on d5 is left [hanging](hanging-piece) in front of your rook.',
      },
      board: {
        fen: DEFENDER,
        orientation: 'white',
        highlights: ['f6', 'd5'],
        arrows: [
          { from: 'g5', to: 'f6' },
          { from: 'd1', to: 'd5' },
        ],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'El alfil negro de d5 solo está defendido por el caballo de f6. Elimina al defensor y gana el alfil.',
        en: 'The black bishop on d5 is only defended by the knight on f6. Remove the defender and win the bishop.',
      },
      board: {
        fen: 'r4r2/ppp2pkp/5np1/3b2B1/7N/P7/1PP2PPP/3RR1K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Bxf6+', 'Kxf6', 'Rxd5'] },
      hint: {
        es: 'Captura al defensor con [jaque](check), para que el rival no tenga tiempo de salvar el alfil.',
        en: 'Capture the defender with [check](check), so that your opponent has no time to save the bishop.',
      },
      explanation: {
        es: 'Bien: el alfil captura el caballo con [jaque](check). Mientras el rey responde, el alfil de d5 se ha quedado sin defensa, y tu torre lo captura.',
        en: 'Well done: the bishop captures the knight with [check](check). While the king answers, the bishop on d5 is left without defence, and your rook captures it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'A veces no puedes capturar al defensor, pero sí [desviarlo](deflection): obligarlo a irse de su sitio con un [jaque](check) o con una amenaza. Si se va, deja sin defensa lo que protegía. Aquí la torre de d8 defiende a la dama de d5.',
        en: 'Sometimes you cannot capture the defender, but you can [deflect](deflection) it: force it away from its post with a [check](check) or a threat. If it leaves, what it protected is left without defence. Here the rook on d8 defends the queen on d5.',
      },
      board: {
        fen: '3r2k1/pp3pp1/7p/3q4/8/5Q1P/5PP1/4R1K1 w - - 0 1',
        orientation: 'white',
        highlights: ['d8', 'd5'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'La torre de d8 es la única defensa de la dama negra. Desvíala.',
        en: 'The rook on d8 is the black queen’s only defence. Deflect it.',
      },
      board: {
        fen: '3r2k1/pp3pp1/n6p/3q4/8/1P3Q1P/PB3PP1/4R1K1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Re8+'] },
      wrong: {
        Qxd5: {
          es: 'La torre de d8 recaptura: cambias las damas y no ganas nada.',
          en: 'The rook on d8 takes back: you trade queens and win nothing.',
        },
      },
      hint: {
        es: 'Un [jaque](check) obliga al rival a responder. ¿Cuál ataca también a la torre de d8?',
        en: 'A [check](check) forces your opponent to answer. Which one also attacks the rook on d8?',
      },
      explanation: {
        es: 'Eso es: la torre da [jaque](check) desde e8 y ataca a la torre de d8. Si la captura, deja de defender a la dama y tu dama se la lleva. Si el rey se aparta, tu torre captura la de d8.',
        en: 'That is it: the rook gives [check](check) from e8 and attacks the rook on d8. If it captures, it stops defending the queen and your queen takes her. If the king steps aside, your rook captures the one on d8.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Una pieza que tiene dos tareas de defensa está [sobrecargada](overloading): si cumple una, deja de cumplir la otra. Aquí la dama negra de d7 defiende a la vez la torre de c8 y el caballo de d4.',
        en: 'A piece with two defensive jobs is [overloaded](overloading): if it does one, it stops doing the other. Here the black queen on d7 defends both the rook on c8 and the knight on d4.',
      },
      board: {
        fen: '2r3k1/3q1ppp/8/8/3n4/8/5QPP/2R3K1 w - - 0 1',
        orientation: 'white',
        highlights: ['c8', 'd4'],
        arrows: [
          { from: 'd7', to: 'c8' },
          { from: 'd7', to: 'd4' },
        ],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'La dama negra defiende dos piezas a la vez. Aprovecha la sobrecarga.',
        en: 'The black queen defends two pieces at once. Take advantage of the overload.',
      },
      board: {
        fen: '2r3k1/pp1q1pp1/7p/8/3n4/8/PP3QPP/2R2BK1 w - - 0 1',
        orientation: 'white',
      },
      check: { by: 'engine', solution: ['Rxc8+', 'Qxc8', 'Qxd4'] },
      hint: {
        es: 'Empieza por la captura que da [jaque](check).',
        en: 'Start with the capture that gives [check](check).',
      },
      explanation: {
        es: 'Bien: la dama tiene que recapturar en c8, y desde allí ya no defiende al caballo de d4. Tu dama lo captura.',
        en: 'Well done: the queen has to take back on c8, and from there she no longer defends the knight on d4. Your queen captures it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: si una pieza defiende a otra, ataca al defensor. Puedes capturarlo ([eliminar al defensor](removing-the-defender)), obligarlo a irse ([desviación](deflection)) o aprovechar que tiene demasiadas tareas ([sobrecarga](overloading)). En los tres casos, lo que defendía se queda sin defensa.',
        en: 'Summary: if a piece defends another, go after the defender. You can capture it ([removing the defender](removing-the-defender)), force it away ([deflection](deflection)) or exploit that it has too many jobs ([overloading](overloading)). In all three cases, what it defended is left without defence.',
      },
      board: {
        fen: DEFENDER,
        orientation: 'white',
        highlights: ['f6', 'd5'],
        arrows: [
          { from: 'g5', to: 'f6' },
          { from: 'd1', to: 'd5' },
        ],
      },
    },
  ],
  next: { kind: 'positions', tag: 'deflection' },
};
