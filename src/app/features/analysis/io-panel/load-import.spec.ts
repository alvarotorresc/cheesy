import { INITIAL_FEN } from 'chessops/fen';
import { MAX_TREE_NODES, ROOT_ID } from '../../../core/move-tree';
import { loadImport, MAX_IMPORT_LENGTH, type ImportOutcome } from './load-import';

const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

const loaded = (outcome: ImportOutcome) => {
  if (!outcome.ok) throw new Error(`Not loaded: ${outcome.error}`);
  return outcome;
};

describe('loadImport', () => {
  it('should load a FEN as a new position without moves', () => {
    const outcome = loaded(loadImport(`  ${ITALIAN}\n`));

    expect(outcome.loaded).toBe('position');
    expect(outcome.tree.startFen).toBe(ITALIAN);
    expect(outcome.tree.size).toBe(0);
  });

  it('should load a PGN as a new game', () => {
    const outcome = loaded(loadImport('[Event "Casual"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *'));

    expect(outcome.loaded).toBe('game');
    expect(outcome.tree.node(outcome.tree.lineEnd(ROOT_ID)).fen).toBe(ITALIAN);
  });

  it('should keep every variation of the PGN', () => {
    const outcome = loaded(loadImport('1. e4 e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3 *'));

    expect(outcome.tree.size).toBe(6);
    expect(outcome.tree.toPgn()).toBe('1. e4 e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3');
  });

  it('should take moves without headers as a PGN', () => {
    expect(
      loaded(loadImport('e4 e5'))
        .tree.mainLine()
        .map((node) => node.san),
    ).toEqual(['e4', 'e5']);
  });

  it.each(['', '  \n\t '])('should ask for text when the input is blank: %j', (text) => {
    expect(loadImport(text)).toEqual({ ok: false, error: 'empty' });
  });

  it('should refuse text longer than the limit without parsing it', () => {
    expect(loadImport(`1. e4 e5 ${' '.repeat(MAX_IMPORT_LENGTH)}`)).toEqual({
      ok: false,
      error: 'too-long',
    });
  });

  it('should report a malformed FEN', () => {
    expect(loadImport('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq - 0 1')).toEqual({
      ok: false,
      error: 'invalid-fen',
    });
  });

  it('should report a well-formed FEN of an impossible position', () => {
    expect(loadImport('8/8/8/8/8/8/8/8 w - - 0 1')).toEqual({
      ok: false,
      error: 'impossible-position',
    });
  });

  it('should treat a draw result on its own as a PGN, not as a FEN', () => {
    expect(loadImport('1/2-1/2')).toEqual({ ok: false, error: 'no-game' });
  });

  it('should report text without a game', () => {
    expect(loadImport('hello <b>world</b>')).toEqual({ ok: false, error: 'no-game' });
  });

  it('should report games of other variants', () => {
    expect(loadImport('[Variant "Atomic"]\n\n1. e4 *')).toEqual({
      ok: false,
      error: 'unsupported-variant',
    });
  });

  it('should report an invalid FEN header', () => {
    expect(loadImport('[FEN "8/8 w"]\n\n1. e4 *')).toEqual({
      ok: false,
      error: 'invalid-start-position',
    });
  });

  it('should name the illegal move with its number, in the main line or a variation', () => {
    expect(loadImport('1. e4 e5 2. Ke3 *')).toEqual({
      ok: false,
      error: 'illegal-move',
      move: '2. Ke3',
    });
    expect(loadImport('1. e4 e5 2. Nf3 (2. Nc3 Ke6) *')).toEqual({
      ok: false,
      error: 'illegal-move',
      move: '2... Ke6',
    });
  });

  it('should refuse a game with more moves than a tree can hold', () => {
    const shuffle = 'Nf3 Nf6 Ng1 Ng8 '.repeat(MAX_TREE_NODES / 4 + 1);
    expect(loadImport(shuffle)).toEqual({ ok: false, error: 'too-many-moves' });
  });

  it('should load the initial position from its FEN', () => {
    const outcome = loaded(loadImport(INITIAL_FEN));
    expect(outcome.loaded).toBe('position');
    expect(outcome.tree.size).toBe(0);
  });
});
