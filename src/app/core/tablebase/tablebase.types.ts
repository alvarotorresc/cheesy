/**
 * Theoretical result for the side to move, as the Lichess tablebase reports it. The cursed and
 * blessed variants are wins and losses that the fifty-move rule turns into draws. The `maybe`
 * variants are wins or losses that may or may not be reached in time, depending on how the
 * distance to zeroing is rounded. `syzygy` ones are known wins and losses without a distance to
 * mate. Anything the client does not recognise is reported as `unknown`.
 */
export type TablebaseCategory =
  | 'win'
  | 'syzygy-win'
  | 'maybe-win'
  | 'cursed-win'
  | 'draw'
  | 'blessed-loss'
  | 'maybe-loss'
  | 'syzygy-loss'
  | 'loss'
  | 'unknown';

/** A legal move of the probed position and the result it leads to. */
export interface TablebaseMove {
  /** Standard UCI, as `GameService` records it (castling is `e1g1`). */
  uci: string;
  /** Computed locally from the position, never taken from the response. */
  san: string;
  /** Result for the side to move after this move, that is, the opponent. */
  category: TablebaseCategory;
  dtz: number | undefined;
  dtm: number | undefined;
}

/** What the tablebase knows about a position. Every value is for the side to move. */
export interface TablebaseResult {
  category: TablebaseCategory;
  /**
   * Distance to zeroing, in half-moves: how long until a capture or a pawn move that keeps the
   * result. Positive when the side to move wins, negative when it loses, zero in a draw.
   */
  dtz: number | undefined;
  /** Distance to mate, in half-moves, with the same sign convention. Not always available. */
  dtm: number | undefined;
  checkmate: boolean;
  stalemate: boolean;
  /** Every legal move, best first for the side to move. */
  moves: readonly TablebaseMove[];
}

export type TablebaseErrorReason =
  /** More than seven pieces, castling rights or an invalid FEN: the tablebase cannot answer. */
  | 'not-applicable'
  /** The caller cancelled the request. */
  | 'aborted'
  /** The service asked to slow down; no request is sent until the pause is over. */
  | 'rate-limited'
  | 'timeout'
  /** No connection, or the request was blocked. */
  | 'network'
  /** The service answered with an error status. */
  | 'http'
  /** The answer did not have the expected shape or listed moves that are not legal. */
  | 'invalid-response';

export class TablebaseError extends Error {
  constructor(readonly reason: TablebaseErrorReason) {
    super(`Tablebase request failed: ${reason}`);
    this.name = 'TablebaseError';
  }
}
