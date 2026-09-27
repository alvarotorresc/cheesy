import type { GameResult } from '../../core/game';
import { en } from '../../core/i18n/dictionaries/en';
import { es } from '../../core/i18n/dictionaries/es';
import { gameEndMessage } from './game-end';

const WHITE_MATES: GameResult = { reason: 'checkmate', winner: 'white' };
const BLACK_MATES: GameResult = { reason: 'checkmate', winner: 'black' };

describe('gameEndMessage', () => {
  it('should name the winner of a checkmate by colour when there is no player', () => {
    expect(gameEndMessage(WHITE_MATES, en.gameEnd)).toBe('Checkmate. White wins.');
    expect(gameEndMessage(BLACK_MATES, en.gameEnd)).toBe('Checkmate. Black wins.');
  });

  it('should tell a checkmate from the side of the player', () => {
    expect(gameEndMessage(WHITE_MATES, en.gameEnd, 'white')).toBe('Checkmate. You win.');
    expect(gameEndMessage(WHITE_MATES, en.gameEnd, 'black')).toBe('Checkmate. You lose.');
    expect(gameEndMessage(BLACK_MATES, en.gameEnd, 'black')).toBe('Checkmate. You win.');
  });

  it.each([
    ['stalemate', 'Stalemate. Draw.', 'Rey ahogado. Tablas.'],
    ['insufficient-material', 'Insufficient material. Draw.', 'Material insuficiente. Tablas.'],
    ['threefold-repetition', 'Threefold repetition. Draw.', 'Triple repetición. Tablas.'],
    [
      'fifty-move-rule',
      'Fifty moves without a capture or a pawn move. Draw.',
      'Cincuenta jugadas sin capturas ni movimientos de peón. Tablas.',
    ],
  ] as const)('should name the draw by %s in both languages', (reason, english, spanish) => {
    const result: GameResult = { reason, winner: undefined };

    expect(gameEndMessage(result, en.gameEnd)).toBe(english);
    expect(gameEndMessage(result, en.gameEnd, 'white')).toBe(english);
    expect(gameEndMessage(result, es.gameEnd)).toBe(spanish);
  });
});
