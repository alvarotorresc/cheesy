import { INITIAL_FEN } from 'chessops/fen';
import { GameService } from '../../../core/game';
import { loadImport, MAX_IMPORT_LENGTH } from './load-import';

const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

describe('loadImport', () => {
  let game: GameService;

  beforeEach(() => {
    game = new GameService();
    game.playSan('d4');
  });

  const sans = (): string[] => game.moves().map((move) => move.san);

  it('should load a FEN as a new position', () => {
    expect(loadImport(game, `  ${ITALIAN}\n`)).toEqual({ ok: true, loaded: 'position' });
    expect(game.fen()).toBe(ITALIAN);
    expect(game.moves()).toHaveLength(0);
  });

  it('should load a PGN as a new game', () => {
    const outcome = loadImport(game, '[Event "Casual"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *');

    expect(outcome).toEqual({ ok: true, loaded: 'game' });
    expect(game.fen()).toBe(ITALIAN);
  });

  it('should take moves without headers as a PGN', () => {
    expect(loadImport(game, 'e4 e5')).toEqual({ ok: true, loaded: 'game' });
    expect(sans()).toEqual(['e4', 'e5']);
  });

  it.each(['', '  \n\t '])('should ask for text when the input is blank: %j', (text) => {
    expect(loadImport(game, text)).toEqual({ ok: false, error: 'empty' });
    expect(sans()).toEqual(['d4']);
  });

  it('should refuse text longer than the limit without parsing it', () => {
    const text = `1. e4 e5 ${' '.repeat(MAX_IMPORT_LENGTH)}`;

    expect(loadImport(game, text)).toEqual({ ok: false, error: 'too-long' });
    expect(sans()).toEqual(['d4']);
  });

  it('should report a malformed FEN', () => {
    expect(loadImport(game, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq - 0 1')).toEqual({
      ok: false,
      error: 'invalid-fen',
    });
    expect(sans()).toEqual(['d4']);
  });

  it('should report a well-formed FEN of an impossible position', () => {
    expect(loadImport(game, '8/8/8/8/8/8/8/8 w - - 0 1')).toEqual({
      ok: false,
      error: 'impossible-position',
    });
  });

  it('should treat a draw result on its own as a PGN, not as a FEN', () => {
    expect(loadImport(game, '1/2-1/2')).toEqual({ ok: false, error: 'no-game' });
  });

  it('should report text without a game', () => {
    expect(loadImport(game, 'hello <b>world</b>')).toEqual({ ok: false, error: 'no-game' });
    expect(sans()).toEqual(['d4']);
  });

  it('should report games of other variants', () => {
    expect(loadImport(game, '[Variant "Atomic"]\n\n1. e4 *')).toEqual({
      ok: false,
      error: 'unsupported-variant',
    });
  });

  it('should report an invalid FEN header', () => {
    expect(loadImport(game, '[FEN "8/8 w"]\n\n1. e4 *')).toEqual({
      ok: false,
      error: 'invalid-start-position',
    });
  });

  it('should name the illegal move with its number', () => {
    expect(loadImport(game, '1. e4 e5 2. Ke3 *')).toEqual({
      ok: false,
      error: 'illegal-move',
      move: '2. Ke3',
    });
    expect(loadImport(game, '1. e4 e5 2. Nf3 Ke6 *')).toEqual({
      ok: false,
      error: 'illegal-move',
      move: '2... Ke6',
    });
  });

  it('should load the initial position from its FEN', () => {
    expect(loadImport(game, INITIAL_FEN)).toEqual({ ok: true, loaded: 'position' });
    expect(game.moves()).toHaveLength(0);
  });
});
