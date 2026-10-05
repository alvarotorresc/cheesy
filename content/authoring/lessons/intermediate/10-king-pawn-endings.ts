// Lesson 10 for intermediates: passed pawns, the rule of the square, the opposition and key squares.
import type { LessonSpec } from '../../../types.ts';
import { CHESSKID, LICHESS_PRACTICE, LICHESS_THEMES } from './sources.ts';

export const kingPawnEndings: LessonSpec = {
  id: 'king-pawn-endings',
  level: 'intermediate',
  order: 10,
  title: { es: 'Finales de peones', en: 'King and pawn endings' },
  summary: {
    es: 'La regla del cuadrado, la oposición y las casillas clave: cuándo corona un peón y cuándo no.',
    en: 'The rule of the square, the opposition and the key squares: when a pawn promotes and when it does not.',
  },
  terms: ['passed-pawn', 'rule-of-the-square', 'opposition', 'zugzwang', 'key-squares'],
  sources: [LICHESS_PRACTICE, LICHESS_THEMES, CHESSKID],
  steps: [
    {
      kind: 'explain',
      text: {
        es: 'Cuando solo quedan reyes y peones, todo gira en torno a la [coronación](promotion). Un [peón pasado](passed-pawn) es el que ya no tiene peones rivales delante ni en las [columnas](file) de al lado: nada lo frena salvo las piezas. Para saber si tu rey alcanza un peón pasado rival, usa la [regla del cuadrado](rule-of-the-square): imagina el cuadrado que va del peón a su [casilla de coronación](queening-square), aquí el marcado. Si tu rey puede entrar en él en su turno, alcanza al peón.',
        en: 'When only kings and pawns are left, everything turns on [promotion](promotion). A [passed pawn](passed-pawn) is one with no rival pawns in front of it or on the [files](file) next to it: nothing stops it except the pieces. To tell whether your king catches a rival passed pawn, use the [rule of the square](rule-of-the-square): picture the square running from the pawn to its [queening square](queening-square), the marked one here. If your king can step into it on its turn, it catches the pawn.',
      },
      board: {
        fen: '7k/8/8/p7/5K2/8/8/8 w - - 0 1',
        orientation: 'white',
        highlights: ['a5', 'e5', 'e1', 'a1'],
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Juegas con el rey blanco. Entra en el cuadrado del peón de a5 y no lo dejes [coronar](promotion): con eso son tablas.',
        en: 'You play the white king. Step into the square of the pawn on a5 and do not let it [promote](promotion): that is a draw.',
      },
      fen: '7k/8/8/p7/5K2/8/8/8 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'El cuadrado llega hasta la [columna](file) e. Una sola jugada hacia la izquierda te mete dentro; luego persigue al peón.',
        en: 'The square reaches the e-[file](file). A single move to the left gets you inside; then chase the pawn.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Cuando hay un peón y los dos reyes cerca, manda la [oposición](opposition): los reyes en la misma [columna](file) con una casilla entre ellos. Ninguno puede avanzar, y el que tiene que mover debe ceder el paso. Eso es un [zugzwang](zugzwang): estar obligado a mover cuando cualquier jugada empeora tu posición. Aquí juegan las negras y las blancas tienen la oposición: el rey negro tiene que apartarse.',
        en: 'When there is one pawn and both kings are close, the [opposition](opposition) rules: the kings on the same [file](file) with one square between them. Neither can come forward, and the one who has to move must give way. That is [zugzwang](zugzwang): being forced to move when every move makes your position worse. Here Black is to move and White has the opposition: the black king has to step aside.',
      },
      board: {
        fen: '8/8/5k2/8/5K2/5P2/8/8 b - - 0 1',
        orientation: 'white',
        highlights: ['f4', 'f6'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Ahora defiendes tú. El rey negro y su peón avanzan. Toma la [oposición](opposition) para que no pasen.',
        en: 'Now you defend. The black king and his pawn are coming. Take the [opposition](opposition) so that they cannot get through.',
      },
      board: { fen: '8/8/8/3p4/3k4/8/8/2K5 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Kd2'] },
      wrong: {
        Kc2: {
          es: 'El rey negro avanza a e3 y tu rey ya no consigue frenarlo: el peón [corona](promotion). Ponte enfrente del rey negro, con una casilla en medio.',
          en: 'The black king moves up to e3 and your king can no longer hold him back: the pawn [promotes](promotion). Stand facing the black king, with one square between.',
        },
        Kd1: {
          es: 'Demasiado atrás: el rey negro se pone en d3, enfrente del tuyo, y la [oposición](opposition) es suya. Ponte enfrente de él, con una casilla en medio.',
          en: 'Too far back: the black king steps to d3, facing yours, and the [opposition](opposition) is his. Stand facing him, with one square between.',
        },
      },
      hint: {
        es: 'Pon tu rey en la misma [columna](file) que el rey negro, con una sola casilla entre los dos.',
        en: 'Put your king on the same [file](file) as the black king, with just one square between the two.',
      },
      explanation: {
        es: 'Eso es: con tu rey en d2 tienes la [oposición](opposition). Le toca al rey negro, y por cualquier lado que vaya, tu rey se pone otra vez enfrente. El peón no pasa: tablas.',
        en: 'That is it: with your king on d2 you have the [opposition](opposition). It is the black king’s turn, and whichever way he goes, your king faces him again. The pawn does not get through: a draw.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Para ganar con rey y peón, piensa en las [casillas clave](key-squares) del peón: si tu rey llega a una, el peón [corona](promotion) haga lo que haga el rival. Para un peón que no ha pasado de la mitad del tablero, son las tres casillas que están dos [filas](rank) por delante de él. Aquí, para el peón de e3, son d5, e5 y f5.',
        en: 'To win with king and pawn, think of the pawn’s [key squares](key-squares): if your king reaches one, the pawn [promotes](promotion) whatever the rival does. For a pawn that has not crossed the middle of the board, they are the three squares two [ranks](rank) in front of it. Here, for the pawn on e3, they are d5, e5 and f5.',
      },
      board: {
        fen: '4k3/8/8/8/8/4P3/8/4K3 w - - 0 1',
        orientation: 'white',
        highlights: ['d5', 'e5', 'f5'],
      },
    },
    {
      kind: 'find-move',
      text: {
        es: 'Juegan las blancas. Lleva el rey a una [casilla clave](key-squares) del peón de e3. Solo una jugada gana.',
        en: 'White to move. Take your king to a [key square](key-squares) of the pawn on e3. Only one move wins.',
      },
      board: { fen: '8/4k3/8/8/2K5/4P3/8/8 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Kd5'] },
      wrong: {
        Kc5: {
          es: 'No es una [casilla clave](key-squares), y el rey negro llega a tiempo de ponerse delante del peón. Busca d5, e5 o f5.',
          en: 'It is not a [key square](key-squares), and the black king gets in front of the pawn in time. Look for d5, e5 or f5.',
        },
        e4: {
          es: 'Si el peón avanza, sus [casillas clave](key-squares) se alejan y el rey negro llega a tiempo. Primero el rey.',
          en: 'If the pawn moves up, its [key squares](key-squares) move further away and the black king gets there in time. King first.',
        },
      },
      hint: {
        es: 'Desde c4, tu rey solo alcanza una de las tres casillas clave: d5, e5 o f5.',
        en: 'From c4, your king can only reach one of the three key squares: d5, e5 or f5.',
      },
      explanation: {
        es: 'Eso es: tu rey está en d5, una [casilla clave](key-squares). Ahora el peón [corona](promotion) aunque el rey negro intente frenarlo: tu rey le gana la [oposición](opposition) o se cuela por un lado.',
        en: 'That is it: your king stands on d5, a [key square](key-squares). Now the pawn [promotes](promotion) however the black king tries to stop it: your king wins the [opposition](opposition) or slips past on one side.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Gana la partida con rey y peón. El rival se defiende lo mejor posible. Lleva primero el rey delante del peón, a una [casilla clave](key-squares), y usa la [oposición](opposition).',
        en: 'Win the game with king and pawn. The rival defends as well as possible. First take your king in front of the pawn, to a [key square](key-squares), and use the [opposition](opposition).',
      },
      fen: '8/2k5/8/8/8/2K5/2P5/8 w - - 0 1',
      goal: 'win',
      playerSide: 'white',
      hint: {
        es: 'No empujes el peón todavía. Las casillas clave del peón de c2 son b4, c4 y d4: llega a una con el rey.',
        en: 'Do not push the pawn yet. The key squares of the pawn on c2 are b4, c4 and d4: reach one with your king.',
      },
    },
    {
      kind: 'play-out',
      text: {
        es: 'Ahora al revés: juegas con el rey solo contra rey y peón. Aguanta las tablas: no dejes que el rey negro llegue a una [casilla clave](key-squares).',
        en: 'Now the other way round: you play the lone king against king and pawn. Hold the draw: do not let the black king reach a [key square](key-squares).',
      },
      fen: '8/8/8/8/4k3/3p4/8/2K5 w - - 0 1',
      goal: 'draw',
      playerSide: 'white',
      hint: {
        es: 'Ponte delante del peón y, cuando puedas, toma la [oposición](opposition) frente al rey negro.',
        en: 'Get in front of the pawn and, when you can, take the [opposition](opposition) against the black king.',
      },
    },
    {
      kind: 'explain',
      text: {
        es: 'Resumen: un [peón pasado](passed-pawn) solo puede frenarlo el rey, y la [regla del cuadrado](rule-of-the-square) te dice si llega. Con los reyes cerca, la [oposición](opposition) decide quién cede el paso, gracias al [zugzwang](zugzwang). Para ganar, lleva tu rey a una [casilla clave](key-squares) antes de empujar el peón; para defender, ponte delante del peón y toma la oposición. En Finales tienes más posiciones de rey y peón para practicar.',
        en: 'Summary: only the king can stop a [passed pawn](passed-pawn), and the [rule of the square](rule-of-the-square) tells you whether it gets there. With the kings close, the [opposition](opposition) decides who gives way, thanks to [zugzwang](zugzwang). To win, take your king to a [key square](key-squares) before pushing the pawn; to defend, get in front of the pawn and take the opposition. In Endgames you will find more king and pawn positions to practise.',
      },
      board: {
        fen: '8/8/8/3K4/8/4P3/8/4k3 b - - 0 1',
        orientation: 'white',
        highlights: ['d5', 'e5', 'f5'],
      },
    },
  ],
  next: { kind: 'endgames', category: 'King and pawn' },
};
