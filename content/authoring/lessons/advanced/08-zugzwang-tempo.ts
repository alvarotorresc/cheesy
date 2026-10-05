// Lesson 8 for advanced players: mutual zugzwang, the spare tempo and triangulation.
import type { LessonSpec } from '../../../types.ts';
import {
  CHESSKID,
  LICHESS_PRACTICE,
  WIKI_IMMORTAL_ZUGZWANG,
  WIKI_TRIANGULATION,
  WIKI_ZUGZWANG,
} from './sources.ts';

export const zugzwangTempo: LessonSpec = {
  id: 'zugzwang-tempo',
  level: 'advanced',
  order: 8,
  title: { es: 'Zugzwang y tiempos', en: 'Zugzwang and tempo' },
  summary: {
    es: 'Cuando mover es un problema: el zugzwang recíproco, la jugada de espera y la triangulación.',
    en: 'When having to move is the problem: mutual zugzwang, the waiting move and triangulation.',
  },
  terms: ['tempo', 'mutual-zugzwang', 'triangulation'],
  sources: [WIKI_ZUGZWANG, WIKI_IMMORTAL_ZUGZWANG, WIKI_TRIANGULATION, LICHESS_PRACTICE, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Repaso: el [zugzwang](zugzwang) es estar obligado a mover cuando cualquier jugada empeora tu posición. Fischer contra Taimanov, segunda partida de su match de 1971. Juegan las negras: si mueven el rey, pierden el caballo, y si mueven el caballo, el peón de la columna h avanza. Tras dos jugadas de cada bando, el rey blanco llega a g6 y las negras vuelven a estar en zugzwang. Las blancas ganaron.',
        en: 'Recap: [zugzwang](zugzwang) means being forced to move when every move makes your position worse. Fischer against Taimanov, second game of their 1971 match. Black is to move: if the king moves, the knight is lost, and if the knight moves, the h-pawn walks forward. After two moves each, the white king reaches g6 and Black is in zugzwang again. White won.',
      },
      board: {
        fen: '8/8/5K2/5BnP/5k2/8/8/8 b - - 0 85',
        orientation: 'white',
        moves: ['Nf3', 'h6', 'Ng5', 'Kg6'],
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'A veces el zugzwang es de los dos: al que le toque mover, empeora. Es un [zugzwang recíproco](mutual-zugzwang). Aquí, si juegan las negras, su rey tiene que ir a d7, el rey blanco pasa a b7 y el peón corona: pierden. Si juegan las blancas, no pueden ganar: o dejan al rey negro [ahogado](stalemate) o le dejan capturar el peón. Son tablas.',
        en: 'Sometimes the zugzwang is on both sides: whoever has to move makes things worse. That is [mutual zugzwang](mutual-zugzwang). Here, if Black is to move, the king has to go to d7, the white king steps to b7 and the pawn promotes: Black loses. If White is to move, White cannot win: either the black king is left in [stalemate](stalemate) or it is allowed to capture the pawn. It is a draw.',
      },
      board: {
        fen: '2k5/2P5/1K6/8/8/8/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['c7', 'b7', 'd7'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Los reyes y los peones del centro forman un zugzwang recíproco: el rey que se mueva deja de defender su peón y lo pierde. Así que gana quien tenga una jugada de peón de sobra, un [tiempo](tempo) más. Juegan las blancas: ¿con qué jugada le pasas el turno al rival y te quedas tú con la última?',
        en: 'The kings and the central pawns form a mutual zugzwang: the king that moves stops guarding its pawn and loses it. So whoever has a spare pawn move, one more [tempo](tempo), wins. White to play: with which move do you hand the turn to your opponent and keep the last one for yourself?',
      },
      board: { fen: '8/8/7p/3pK3/2kP4/8/7P/8 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['h3'] },
      wrong: {
        h4: {
          es: 'Ahora el peón negro de h6 avanza a h5 y se queda él con la última jugada: tu rey tiene que moverse, pierdes el peón de d4 y la partida.',
          en: 'Now the black pawn on h6 moves to h5 and keeps the last move for itself: your king has to move, and you lose the pawn on d4 and the game.',
        },
        Kf4: {
          es: 'Tu rey deja de defender el peón de d4: el rey negro lo captura y las que ganan son las negras.',
          en: 'Your king stops guarding the pawn on d4: the black king captures it and Black is the one who wins.',
        },
      },
      hint: {
        es: 'Cuenta las jugadas de peón que le quedan a cada bando. El peón de h2 puede avanzar una casilla o dos.',
        en: 'Count the pawn moves each side has left. The pawn on h2 can move one square or two.',
      },
      explanation: {
        es: 'Bien: avanzas una sola casilla. Si el negro avanza a h5, tú juegas a h4 y ya no le quedan jugadas de peón. Tenga que mover el rey ahora o una jugada después, deja el peón de d5 y lo pierde.',
        en: 'Well done: you move just one square. If Black pushes to h5, you play to h4 and Black has no pawn moves left. Whether the king has to move now or one move later, it leaves the pawn on d5 behind and loses it.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Si no te queda una jugada de peón, el rey puede perder el tiempo él solo. Es la [triangulación](triangulation): en lugar de ir directo, da un rodeo por tres casillas que forman un triángulo y vuelve al mismo sitio. Aquí el rey blanco quiere estar en e5 con el rey negro en e7, pero con el turno de las negras. Va de e5 a d5, luego a e4 y vuelve a e5. El rey negro tiene que quedarse cerca y no puede hacer lo mismo: se aparta y vuelve, y ahora le toca mover a él. Tiene que ceder el paso.',
        en: 'If you have no pawn move left, the king can lose the time on its own. That is [triangulation](triangulation): instead of going straight, it takes a detour round three squares that form a triangle and comes back to the same spot. Here the white king wants to be on e5 with the black king on e7, but with Black to move. It goes from e5 to d5, then to e4 and back to e5. The black king has to stay close and cannot do the same: it goes away and comes back, and now it is its turn. It has to give way.',
      },
      board: {
        fen: '8/4k1p1/6P1/4KP2/8/8/8/8 w - - 0 1',
        orientation: 'white',
        moves: ['Kd5', 'Kf6', 'Ke4', 'Ke7', 'Ke5'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Tu rey quiere estar en d5 cuando el rey negro esté en d7 y les toque mover a las negras: entonces tendrá que apartarse. Si vas directo, el rey negro llega a tiempo. Encuentra el rodeo: tu jugada, la respuesta negra y otra jugada tuya.',
        en: 'Your king wants to be on d5 when the black king is on d7 and it is Black’s turn: then it will have to step aside. If you go straight there, the black king arrives in time. Find the detour: your move, Black’s reply and another move of yours.',
      },
      board: { fen: '2k5/8/1p6/1P6/3K4/8/8/8 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Ke5', 'Kd7', 'Kd5'] },
      wrong: {
        Kd5: {
          es: 'El rey negro responde yendo a d7, y ahora el que tiene que mover eres tú: son tablas.',
          en: 'The black king answers by going to d7, and now you are the one who has to move: it is a draw.',
        },
        Kc4: {
          es: 'Desde c4 no amenazas nada: el rey negro se queda cerca del peón de b6 y no ganas.',
          en: 'From c4 you threaten nothing: the black king stays close to the pawn on b6 and you do not win.',
        },
      },
      hint: {
        es: 'Las casillas d4, e5 y d5 forman un triángulo.',
        en: 'The squares d4, e5 and d5 form a triangle.',
      },
      explanation: {
        es: 'Eso es: has llegado a d5 en dos jugadas en vez de en una, por e5. Ahora es el rey negro quien tiene que mover y ceder el paso, y tu rey se abre paso hacia el peón de b6.',
        en: 'That is it: you reached d5 in two moves instead of one, through e5. Now it is the black king that has to move and give way, and your king makes its way towards the pawn on b6.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'El zugzwang también aparece en el medio juego, aunque es raro. Sämisch contra Nimzowitsch, Copenhague 1923, la llamada partida inmortal del zugzwang. Las negras acaban de mover un peón a h6, una simple jugada de espera. Las piezas blancas están atadas: cualquier jugada de pieza pierde material, y las pocas jugadas de peón se acaban pronto. Las negras, en cambio, pueden esperar moviendo el rey. Las blancas abandonaron aquí.',
        en: 'Zugzwang also shows up in the middlegame, although it is rare. Sämisch against Nimzowitsch, Copenhagen 1923, the so-called immortal zugzwang game. Black has just moved a pawn to h6, a simple waiting move. The white pieces are tied up: any piece move loses material, and the few pawn moves soon run out. Black, on the other hand, can wait by moving the king. White resigned here.',
      },
      board: {
        fen: '6k1/3q2p1/p2bp2p/3p1r2/1p1Pp3/3bQ1PP/PP1B1rB1/1N2R1RK w - - 0 26',
        orientation: 'white',
        highlights: ['h6'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Ahora juega tú la partida entera y gana con rey y peón contra rey y peón. Usa la [oposición](opposition) y, si hace falta, el rodeo en triángulo para que le toque mover al rival. El rival se defiende lo mejor posible.',
        en: 'Now play the whole game yourself and win with king and pawn against king and pawn. Use the [opposition](opposition) and, if needed, the triangle detour so that it is your opponent’s turn. The opponent defends as well as possible.',
      },
      fen: '8/4k3/1p6/1P6/4K3/8/8/8 w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'Al principio, la única jugada que gana es poner tu rey en e5, frente al negro. Tu objetivo es el peón de b6.',
        en: 'At the start, the only winning move is to put your king on e5, facing the black one. Your target is the pawn on b6.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: en el [zugzwang](zugzwang), mover es el problema. En un [zugzwang recíproco](mutual-zugzwang) empeora quien tenga que mover, así que cuenta las jugadas de espera: un [tiempo](tempo) de sobra decide la partida. Si no te quedan jugadas de peón, el rey puede perder el tiempo con la [triangulación](triangulation). En Finales tienes más posiciones de rey y peones para practicar.',
        en: 'Summary: in [zugzwang](zugzwang), having to move is the problem. In a [mutual zugzwang](mutual-zugzwang) whoever has to move makes things worse, so count the waiting moves: one spare [tempo](tempo) decides the game. If you have no pawn moves left, the king can lose the time by [triangulation](triangulation). In Endgames you will find more king and pawn positions to practise.',
      },
      board: {
        fen: '8/8/8/3pK3/2kP4/8/8/8 b - - 0 1',
        orientation: 'white',
        highlights: ['d4', 'd5'],
      },
    },
  ],
  next: { kind: 'endgames', category: 'King and pawn' },
};
