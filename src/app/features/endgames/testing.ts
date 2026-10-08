import { plainText } from '../../core/content/testing';
import type { EndgamePosition } from '../../core/content';

/** Lucena position: White to move and win. */
export const LUCENA: EndgamePosition = {
  id: 'lucena-position',
  name: { es: 'Posición de Lucena', en: 'Lucena position' },
  category: { es: 'Torre y peón', en: 'Rook and pawn' },
  fen: '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1',
  goal: 'win',
  playerSide: 'white',
  explanation: plainText('Construye el puente.', 'Build the bridge.'),
  about: plainText('Sobre el final.', 'About the endgame.'),
};

/** Rule of the square: Black to move and draw. */
export const SQUARE_RULE: EndgamePosition = {
  id: 'kp-square-rule-defence',
  name: { es: 'Regla del cuadrado: defensa', en: 'Rule of the square: defence' },
  category: { es: 'Rey y peón', en: 'King and pawn' },
  fen: '8/8/8/6k1/1P6/8/8/7K b - - 0 1',
  goal: 'draw',
  playerSide: 'black',
  explanation: plainText('Entra en el cuadrado.', 'Step into the square.'),
  about: plainText('Sobre el final.', 'About the endgame.'),
};

/** Mate with the queen, but White starts with Black to move: the engine moves first. */
export const ENGINE_FIRST: EndgamePosition = {
  id: 'engine-first',
  name: { es: 'Mueve el motor', en: 'Engine first' },
  category: { es: 'Mates básicos', en: 'Basic mates' },
  fen: '8/8/8/4k3/8/8/8/3QK3 b - - 0 1',
  goal: 'win',
  playerSide: 'white',
  explanation: plainText('Espera.', 'Wait.'),
  about: plainText('Sobre el final.', 'About the endgame.'),
};
