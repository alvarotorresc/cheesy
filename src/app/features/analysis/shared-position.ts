import { FEN_PARAM, MAX_SHARED_FEN_LENGTH } from '../../core/analysis-link';
import type { GameService } from '../../core/game';

export { FEN_PARAM, MAX_SHARED_FEN_LENGTH };

export type SharedFenOutcome = 'none' | 'loaded' | 'invalid';

/**
 * Loads the position of a shared link. The parameter is untrusted: it is length-checked and then
 * validated by chessops through `loadFen`. An invalid one leaves the initial position.
 */
export const loadSharedFen = (game: GameService, param: string | null): SharedFenOutcome => {
  if (param === null) return 'none';
  if (param.length > MAX_SHARED_FEN_LENGTH) return 'invalid';
  return game.loadFen(param) ? 'loaded' : 'invalid';
};
