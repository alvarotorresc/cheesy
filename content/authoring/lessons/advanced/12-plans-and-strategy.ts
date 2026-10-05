// Lesson 12 for advanced players: making a plan from four questions about the position.
import type { LessonSpec } from '../../../types.ts';
import { CHESSCOM_ADVANCED, CHESSKID, WIKI_STRATEGY } from './sources.ts';

export const plansAndStrategy: LessonSpec = {
  id: 'plans-and-strategy',
  level: 'advanced',
  order: 12,
  title: { es: 'Hacer un plan', en: 'Making a plan' },
  summary: {
    es: 'Cuatro preguntas para entender la posición y elegir qué hacer cuando no hay táctica.',
    en: 'Four questions to understand the position and choose what to do when there is no tactic.',
  },
  terms: ['imbalance', 'space'],
  sources: [WIKI_STRATEGY, CHESSKID, CHESSCOM_ADVANCED],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Cuando no hay nada que calcular, hazte cuatro preguntas. Primera: ¿qué piezas están mejor y cuál está peor? Segunda: ¿qué peones son débiles? Tercera: ¿quién tiene más [espacio](space), columnas abiertas y casillas buenas? Cuarta: ¿qué rey está menos seguro? Las respuestas te dicen dónde jugar.',
        en: 'When there is nothing to calculate, ask yourself four questions. First: which pieces are better and which one is worst? Second: which pawns are weak? Third: who has more [space](space), open files and good squares? Fourth: which king is less safe? The answers tell you where to play.',
      },
      board: {
        fen: 'r4rk1/pp1bbppp/4pn2/3p4/3P4/2NBPN2/PP3PPP/R4RK1 w - - 0 1',
        orientation: 'white',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Las diferencias entre los dos bandos se llaman [desequilibrios](imbalance). Aquí las blancas tienen la [pareja de alfiles](bishop-pair) y las negras dos caballos, y el peón blanco de d4 está [aislado](isolated-pawn). Cada diferencia pide un plan: los alfiles quieren el juego abierto, y los caballos quieren la casilla de delante del peón aislado. No hay un plan bueno para todas las posiciones: sale de estas diferencias.',
        en: 'The differences between the two sides are called [imbalances](imbalance). Here White has the [bishop pair](bishop-pair) and Black two knights, and the white pawn on d4 is [isolated](isolated-pawn). Each difference calls for a plan: the bishops want an open game, and the knights want the square in front of the isolated pawn. No plan is good for every position: it comes from these differences.',
      },
      board: {
        fen: '4k3/pp3ppp/2n1pn2/8/3P4/2B2B2/PP3PPP/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['c3', 'f3', 'c6', 'f6', 'd4'],
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Primera pregunta: ¿cuál es tu peor pieza? La torre de h1 está encerrada detrás de tu rey, y la columna d está abierta. ¿Qué jugada la mejora?',
        en: 'First question: which is your worst piece? The rook on h1 is shut in behind your king, and the d-file is open. Which move improves it?',
      },
      board: { fen: 'r5k1/5ppp/p1p5/1p6/8/1P2P3/P4PPP/6KR w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['a4', 'Kf1', 'b4'], correct: 1 },
      whyWrong: [
        {
          es: 'Atacas en el flanco de dama con la torre aún encerrada. La torre negra llega primero a la columna d y entra en tu campo con jaque.',
          en: 'You attack on the queenside with your rook still shut in. The black rook reaches the d-file first and comes into your camp with check.',
        },
        null,
        {
          es: 'El peón negro de a6 avanza, abre la columna a y la torre negra, que sí está activa, se come tus peones. Tu torre sigue en h1.',
          en: 'The black pawn on a6 advances, opens the a-file and the black rook, which is active, eats your pawns. Your rook is still on h1.',
        },
      ],
      explanation: {
        es: 'Eso es: el rey sale hacia el centro y, en cuanto deje libre la primera fila, la torre irá a la columna d o a la c. Antes de abrir otro frente, saca tu peor pieza.',
        en: 'That is it: the king heads for the centre and, as soon as it clears the first rank, the rook will go to the d-file or the c-file. Before opening another front, bring out your worst piece.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Tercera pregunta: ¿quién tiene más espacio, y dónde? El centro está cerrado. Tus peones de b4, c4 y d5 llegan más lejos en el flanco de dama. ¿Por qué flanco juegas?',
        en: 'Third question: who has more space, and where? The centre is closed. Your pawns on b4, c4 and d5 reach further on the queenside. Which flank do you play on?',
      },
      board: {
        fen: 'r4rk1/ppp2ppp/3p1n2/3Pp1q1/1PP1P3/2N5/P3QPPP/R4RK1 w - - 0 1',
        orientation: 'white',
      },
      answer: { by: 'engine', options: ['g4', 'f4', 'c5'], correct: 2 },
      whyWrong: [
        {
          es: 'Juegas en el [flanco](flank) de rey, donde el rival está mejor. Al peón de g4 lo atacan el caballo y la dama negros y solo lo defiende tu dama: el caballo lo captura y tu rey queda más abierto.',
          en: 'You play on the king’s [flank](flank), where your opponent is better placed. The pawn on g4 is attacked by the black knight and queen and only your queen defends it: the knight takes it and your king is more exposed.',
        },
        {
          es: 'El peón de e5 captura en f4. Abres el juego en el flanco donde están las piezas negras, y tu peón de e4 se queda débil.',
          en: 'The pawn on e5 captures on f4. You open the game on the side where the black pieces are, and your pawn on e4 becomes weak.',
        },
        null,
      ],
      explanation: {
        es: 'Eso es: el peón avanza a c5 en el flanco donde tienes más espacio. Ataca el peón de d6 y prepara abrir la columna c para tus torres. Juega donde tus peones llegan más lejos.',
        en: 'That is it: the pawn advances to c5 on the flank where you have more space. It attacks the pawn on d6 and gets ready to open the c-file for your rooks. Play where your pawns reach further.',
      },
    },
    {
      kind: 'choice',
      text: {
        es: 'Segunda pregunta: ¿qué peón es débil? El peón negro de d5 está [aislado](isolated-pawn): solo lo defienden la torre de d8 y el alfil de e6. Tú lo atacas con la torre y el alfil. ¿Qué jugada sigue el plan?',
        en: 'Second question: which pawn is weak? The black pawn on d5 is [isolated](isolated-pawn): only the rook on d8 and the bishop on e6 defend it. You attack it with your rook and your bishop. Which move follows the plan?',
      },
      board: { fen: '3r2k1/pp3ppp/4b3/n2p4/8/4PB2/PP2NPPP/3R1K2 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['e4', 'Rc1', 'Nf4'], correct: 2 },
      whyWrong: [
        {
          es: 'El peón negro avanza a d4: lo capturas, pero se cambian las torres y el alfil negro se come tu peón de a2. La debilidad que tenías que atacar ha desaparecido.',
          en: 'The black pawn advances to d4: you take it, but the rooks come off and the black bishop eats your pawn on a2. The weakness you had to attack is gone.',
        },
        {
          es: 'La columna c está abierta, pero allí no hay nada que atacar. Mientras, el caballo negro sale del borde por c4 y el peón de d5 sigue en pie.',
          en: 'The c-file is open, but there is nothing to attack there. Meanwhile the black knight leaves the edge via c4 and the pawn on d5 still stands.',
        },
        null,
      ],
      explanation: {
        es: 'Eso es: el caballo es el tercer atacante del peón de d5, y las negras solo tienen dos defensores. El caballo negro de a5 está lejos y no llega. El peón débil cae.',
        en: 'That is it: the knight is the third attacker of the pawn on d5, and Black only has two defenders. The black knight on a5 is far away and cannot get there. The weak pawn falls.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Di el plan en una frase: «llevo la torre a la columna abierta», «ataco el peón débil», «juego donde tengo más espacio». Después busca las jugadas que lo sirven y calcula solo esas. Un plan clásico es el [ataque de minorías](minority-attack): tus dos peones de a y b avanzan contra los tres peones negros del flanco de dama para dejarles un peón débil.',
        en: 'Say the plan in one sentence: “I take my rook to the open file”, “I attack the weak pawn”, “I play where I have more space”. Then look for the moves that serve it and calculate only those. A classic plan is the [minority attack](minority-attack): your two pawns on the a- and b-files advance against Black’s three queenside pawns to leave them with a weak pawn.',
      },
      board: {
        fen: '6k1/pp3ppp/2p5/3p4/1P1P4/P3P3/5PPP/6K1 w - - 0 1',
        orientation: 'white',
        highlights: ['a3', 'b4', 'a7', 'b7', 'c6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu plan era dominar la columna c abierta, y tus dos torres ya están en ella. A veces el plan termina en táctica: el rey negro no tiene casillas de escape en la última fila. Remata.',
        en: 'Your plan was to control the open c-file, and both your rooks are already on it. Sometimes the plan ends in a tactic: the black king has no escape squares on the back rank. Finish it.',
      },
      board: { fen: '1r4k1/5ppp/p7/1p3n2/3N4/8/PPR2PPP/2R3K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Rc8+', 'Rxc8', 'Rxc8#'] },
      wrong: {
        Nxf5: {
          es: 'Ganas un caballo, pero había mate en la última fila.',
          en: 'You win a knight, but there was a mate on the back rank.',
        },
      },
      hint: {
        es: 'Da [jaque](check) en la última fila. Si la torre negra captura, la otra torre recaptura.',
        en: 'Give [check](check) on the back rank. If the black rook captures, your other rook recaptures.',
      },
      explanation: {
        es: 'Bien: la torre da jaque en c8, la torre negra tiene que capturarla y la segunda torre da [mate](checkmate) en c8. Las torres dobladas en la columna abierta prepararon el golpe.',
        en: 'Well done: the rook checks on c8, the black rook has to take it and your second rook gives [checkmate](checkmate) on c8. The doubled rooks on the open file prepared the blow.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: sin táctica, haz las cuatro preguntas: tu peor pieza, los peones débiles, el [espacio](space) y la seguridad de los reyes. Los [desequilibrios](imbalance) dicen qué plan toca. Dilo en una frase, busca las jugadas que lo sirven y calcula solo esas. Para seguir, estudia las aperturas: cada una deja estructuras con sus planes típicos.',
        en: 'Summary: with no tactic, ask the four questions: your worst piece, the weak pawns, [space](space) and the safety of the kings. The [imbalances](imbalance) tell you which plan fits. Say it in one sentence, look for the moves that serve it and calculate only those. To go on, study the openings: each one leads to structures with their typical plans.',
      },
      board: {
        fen: 'r4rk1/ppp2ppp/3p1n2/3Pp1q1/1PP1P3/2N5/P3QPPP/R4RK1 w - - 0 1',
        orientation: 'white',
        moves: ['c5'],
      },
    },
  ],
  next: { kind: 'openings' },
};
