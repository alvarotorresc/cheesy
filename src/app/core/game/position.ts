import { Chess } from 'chessops';
import { parseFen } from 'chessops/fen';

/** Parses a FEN into a legal standard chess position, or undefined if it is invalid or impossible. */
export const parsePosition = (fen: string): Chess | undefined =>
  parseFen(fen)
    .chain((setup) => Chess.fromSetup(setup))
    .unwrap(
      (pos) => pos,
      () => undefined,
    );
