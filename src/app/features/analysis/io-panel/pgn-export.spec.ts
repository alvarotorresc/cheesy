import { MoveTree } from '../../../core/move-tree';
import { exportTreePgn } from './pgn-export';

describe('exportTreePgn', () => {
  it('should write the headers, the moves with their variations and the result', () => {
    const pgn = exportTreePgn(MoveTree.fromPgn('1. e4 e5 (1... c5) 2. Nf3'));

    expect(pgn).toContain('[Event "?"]\n');
    expect(pgn).toContain('[Result "*"]\n');
    expect(pgn).not.toContain('[FEN');
    expect(pgn.endsWith('\n\n1. e4 e5 (1... c5) 2. Nf3 *\n')).toBe(true);
  });

  it('should give the start position when it is not the initial one', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const pgn = exportTreePgn(MoveTree.fromFen(fen));

    expect(pgn).toContain(`[FEN "${fen}"]\n[SetUp "1"]\n`);
    expect(pgn.endsWith('\n\n*\n')).toBe(true);
  });

  it('should give the result of the main line when it ends the game', () => {
    const pgn = exportTreePgn(MoveTree.fromPgn('1. f3 e5 2. g4 Qh4#'));

    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn.endsWith('2. g4 Qh4# 0-1\n')).toBe(true);
  });

  it('should read back as the same tree', () => {
    const tree = MoveTree.fromPgn('1. e4 e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3 Nc6');

    expect(MoveTree.fromPgn(exportTreePgn(tree)).toPgn()).toBe(tree.toPgn());
  });
});
