import { Chess } from 'chessops';
import { defaultGame, makeOutcome, setStartingPosition, type PgnNodeData } from 'chessops/pgn';
import { parsePosition, resultOfLine } from '../../../core/game';
import { ROOT_ID, type MoveTree } from '../../../core/move-tree';

const escapeHeader = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * The whole tree as a PGN: the usual headers (with `FEN` and `SetUp` when it does not start at the
 * initial position, and the result of the main line) and the moves with every variation.
 */
export const exportTreePgn = (tree: MoveTree): string => {
  const game = defaultGame<PgnNodeData>();
  setStartingPosition(game.headers, parsePosition(tree.startFen) ?? Chess.default());
  if (game.headers.has('FEN')) game.headers.set('SetUp', '1');
  const line = [tree.startFen, ...tree.mainLine().map((node) => node.fen)];
  const result = resultOfLine(line);
  const outcome = makeOutcome(result && { winner: result.winner });
  game.headers.set('Result', outcome);

  const headers = [...game.headers].map(([key, value]) => `[${key} "${escapeHeader(value)}"]`);
  const moves = tree.node(ROOT_ID).children.length > 0 ? `${tree.toPgn()} ` : '';
  return `${headers.join('\n')}\n\n${moves}${outcome}\n`;
};
