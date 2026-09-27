import type { GameService } from '../../core/game';

/** Query parameter that carries a shared position: `/analysis?fen=…`. */
export const FEN_PARAM = 'fen';

/** A FEN is under 100 characters; anything much longer is not one and is not parsed. */
export const MAX_SHARED_FEN_LENGTH = 128;

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
