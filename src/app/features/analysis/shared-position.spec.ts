import { INITIAL_FEN } from 'chessops/fen';
import { GameService } from '../../core/game';
import { loadSharedFen, MAX_SHARED_FEN_LENGTH } from './shared-position';

const ENDGAME = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

describe('loadSharedFen', () => {
  let game: GameService;

  beforeEach(() => {
    game = new GameService();
  });

  it('should do nothing when the link has no position', () => {
    expect(loadSharedFen(game, null)).toBe('none');
    expect(game.fen()).toBe(INITIAL_FEN);
  });

  it('should load a valid position', () => {
    expect(loadSharedFen(game, ENDGAME)).toBe('loaded');
    expect(game.fen()).toBe(ENDGAME);
  });

  it.each(['', 'not a fen', '8/8/8/8/8/8/8/8 w - - 0 1', '<script>alert(1)</script>'])(
    'should reject %j and keep the initial position',
    (param) => {
      expect(loadSharedFen(game, param)).toBe('invalid');
      expect(game.fen()).toBe(INITIAL_FEN);
    },
  );

  it('should reject a parameter longer than any FEN without parsing it', () => {
    const loadFen = vi.spyOn(game, 'loadFen');

    expect(loadSharedFen(game, `${ENDGAME}${' '.repeat(MAX_SHARED_FEN_LENGTH)}`)).toBe('invalid');
    expect(loadFen).not.toHaveBeenCalled();
  });
});
