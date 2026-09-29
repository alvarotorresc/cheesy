import { parseUci, type Color, type NormalMove } from 'chessops';
import { makeFen } from 'chessops/fen';
import { parsePosition } from '../../../core/game';
import type { TablebaseCategory, TablebaseMove, TablebaseResult } from '../../../core/tablebase';
import { playRecorded } from '../play-recorded';
import { chooseRivalMove, worsensMaterial } from './rival-move';

const ON = { drawTiebreak: true };
const OFF = { drawTiebreak: false };

const pos = (fen: string) => {
  const parsed = parsePosition(fen);
  if (!parsed) throw new Error(`Invalid FEN ${fen}`);
  return parsed;
};

const step = (uci: string): NormalMove => parseUci(uci) as NormalMove;

/** FEN after playing the given moves in UCI from `fen`. */
const play = (fen: string, ...ucis: string[]): string => {
  const position = pos(fen);
  for (const uci of ucis) position.play(step(uci));
  return makeFen(position.toSetup());
};

/** A tablebase move: `category` is the result for the side that answers, as Lichess gives it. */
const move = (
  uci: string,
  category: TablebaseCategory,
  dtz: number | undefined = 0,
  dtm: number | undefined = 0,
): TablebaseMove => ({ uci, san: uci, category, dtz, dtm });

const answer = (moves: TablebaseMove[]): TablebaseResult => ({
  category: 'draw',
  dtz: 0,
  dtm: 0,
  checkmate: false,
  stalemate: false,
  moves,
});

const choose = (fen: string, moves: TablebaseMove[], seen: string[] = [], tie = ON) =>
  chooseRivalMove({ fen, result: answer(moves), seenPositions: seen }, tie).uci;

describe('worsensMaterial', () => {
  const worsens = (fen: string, uci: string, side: Color) =>
    worsensMaterial(pos(fen), step(uci), side);

  it('should say a capture that loses the capturing piece worsens the material', () => {
    // Rxd5 wins a pawn, but cxd5 takes the rook: +3 before, -1 after.
    expect(worsens('4k3/8/2p5/3p4/8/8/8/3RK3 w - - 0 1', 'd1d5', 'white')).toBe(true);
  });

  it('should say a capture that nothing can answer does not worsen it', () => {
    expect(worsens('4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1', 'd1d5', 'white')).toBe(false);
  });

  it('should say a fair trade does not worsen it', () => {
    // Rxd5 takes a rook and cxd5 takes the rook back: the balance ends where it started.
    expect(worsens('3rk3/8/2p5/3r4/8/8/8/3RK3 w - - 0 1', 'd1d5', 'white')).toBe(false);
  });

  it('should say a promotion the king takes worsens the material', () => {
    // a8=Q+ Kxa8: +1 before, 0 after.
    expect(worsens('8/Pk6/8/8/8/8/8/4K3 w - - 0 1', 'a7a8q', 'white')).toBe(true);
  });

  it('should say a promotion nothing can take does not worsen it', () => {
    expect(worsens('8/P7/8/8/8/8/6k1/K7 w - - 0 1', 'a7a8q', 'white')).toBe(false);
  });

  it('should count a promotion to a piece the king can take as worse, whatever the piece', () => {
    expect(worsens('8/Pk6/8/8/8/8/8/4K3 w - - 0 1', 'a7a8n', 'white')).toBe(true);
  });

  it('should look at the recapture when the promotion captures', () => {
    // bxa8=Q+ takes a rook and Kxa8 takes the queen: -4 before, 0 after, so it is not worse.
    expect(worsens('rk6/1P6/8/8/8/8/8/4K3 w - - 0 1', 'b7a8q', 'white')).toBe(false);
  });

  it('should treat an en passant capture as a capture', () => {
    // exd6 e.p. Kxd6 is a trade of pawns: not worse.
    expect(worsens('8/4k3/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5d6', 'white')).toBe(false);
  });

  it('should ignore moves that neither capture nor promote', () => {
    expect(worsens('4k3/8/2p5/3p4/8/8/8/3RK3 w - - 0 1', 'd1d3', 'white')).toBe(false);
  });
});

describe('chooseRivalMove', () => {
  it('should fail when the tablebase lists no move', () => {
    expect(() => choose('8/8/8/8/8/8/8/K6k w - - 0 1', [])).toThrow();
  });

  describe('result group', () => {
    it('should only take moves that keep the best result', () => {
      // Ra1 loses (the opponent wins): it is not in the group of draws, whatever its distance.
      const fen = '1r6/6k1/8/8/8/8/8/5RK1 w - - 0 1';
      const moves = [move('f1f7', 'draw'), move('f1d1', 'draw'), move('f1a1', 'win')];
      expect(choose(fen, moves, [], OFF)).toBe('f1f7');
    });

    it('should group a cursed win of the opponent with the draws', () => {
      const fen = '1r6/6k1/8/8/8/8/8/5RK1 w - - 0 1';
      const moves = [move('f1d1', 'draw'), move('f1a1', 'cursed-win', 20, 20)];
      // Both are draws for the rival; with a distance of 20 the second goes first.
      expect(choose(fen, moves, [], OFF)).toBe('f1a1');
    });
  });

  describe('material rule', () => {
    it('should drop a promotion the king takes when another move keeps the draw', () => {
      const fen = '8/Pk6/8/8/8/8/8/4K3 w - - 0 1';
      const moves = [move('a7a8q', 'draw'), move('e1e2', 'draw')];
      expect(choose(fen, moves, [], OFF)).toBe('e1e2');
      expect(choose(fen, moves, [], ON)).toBe('e1e2');
    });

    it('should keep the promotion when every move keeps the result but loses material', () => {
      const fen = '8/Pk6/8/8/8/8/8/4K3 w - - 0 1';
      expect(choose(fen, [move('a7a8q', 'draw')], [], OFF)).toBe('a7a8q');
    });

    it('should keep a capture that is safe', () => {
      const fen = '4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1';
      const moves = [move('d1d5', 'draw'), move('d1d2', 'draw')];
      expect(choose(fen, moves, [], OFF)).toBe('d1d5');
    });
  });

  describe('a rival that loses', () => {
    const fen = '1K6/1P2k3/8/8/8/8/2r5/3R4 b - - 0 1';

    it('should defend the longest: the larger distance to zeroing', () => {
      const moves = [
        move('e7e6', 'win', 5, 30),
        move('c2b2', 'win', 9, 28),
        move('e7d6', 'win', 3, 40),
      ];
      expect(choose(fen, moves)).toBe('c2b2');
    });

    it('should break a tie of DTZ with the larger DTM, unknown ones last', () => {
      const moves = [
        move('e7e6', 'win', 5, undefined),
        move('c2b2', 'win', 5, 28),
        move('e7d6', 'win', 5, 40),
      ];
      expect(choose(fen, moves)).toBe('e7d6');
    });

    it('should keep the Lichess order when nothing separates the moves', () => {
      const moves = [move('c2b2', 'win', 5, 28), move('e7e6', 'win', 5, 28)];
      expect(choose(fen, moves)).toBe('c2b2');
    });

    it('should compare distances by size, whatever the sign', () => {
      const moves = [move('c2b2', 'win', 4, 20), move('e7e6', 'win', -8, 20)];
      expect(choose(fen, moves)).toBe('e7e6');
    });
  });

  describe('a rival that wins', () => {
    it('should take the fastest win, the first one Lichess lists, not the largest DTZ', () => {
      const fen = '1K6/1P2k3/8/8/8/8/2r5/3R4 b - - 0 1';
      const moves = [move('c2c8', 'loss', -3, -5), move('c2b2', 'loss', -20, -30)];
      expect(choose(fen, moves)).toBe('c2c8');
    });
  });

  describe('draw tie-break', () => {
    it('should not avoid stalemate when the tie-break is off', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5f7', 'draw'), move('f5e5', 'draw')];
      expect(choose(fen, moves, [], OFF)).toBe('f5f7');
    });

    it('should avoid a move that stalemates the opponent', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5f7', 'draw'), move('f5e5', 'draw')];
      expect(choose(fen, moves, [], ON)).toBe('f5e5');
    });

    it('should avoid a move that leaves insufficient material', () => {
      // Kxb2 leaves the two kings.
      const fen = '8/8/8/8/8/2k5/1P6/7K b - - 0 1';
      const moves = [move('c3b2', 'draw'), move('c3c4', 'draw')];
      expect(choose(fen, moves, [], OFF)).toBe('c3b2');
      expect(choose(fen, moves, [], ON)).toBe('c3c4');
    });

    it('should avoid the third occurrence of a position', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5e5', 'draw'), move('f5f4', 'draw')];
      const repeated = play(fen, 'f5e5');
      expect(choose(fen, moves, [fen, repeated, repeated], ON)).toBe('f5f4');
      expect(choose(fen, moves, [fen, repeated, repeated], OFF)).toBe('f5e5');
    });

    it('should allow the second occurrence of a position', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5e5', 'draw'), move('f5f4', 'draw')];
      expect(choose(fen, moves, [fen, play(fen, 'f5e5')], ON)).toBe('f5e5');
    });

    it('should recognise a repetition whatever the move counters of the recorded FEN', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5e5', 'draw'), move('f5f4', 'draw')];
      const repeated = play(fen, 'f5e5').split(' ').slice(0, 4).join(' ');
      expect(choose(fen, moves, [`${repeated} 4 9`, `${repeated} 8 12`], ON)).toBe('f5f4');
    });

    describe('material at reach', () => {
      const fen = '1r6/6k1/8/8/8/8/8/5RK1 w - - 0 1';

      it('should avoid moves that hang the piece', () => {
        // Rf7+ and Rb1 lose the rook to the king or the rook; Rd1 is safe.
        const moves = [move('f1f7', 'draw'), move('f1b1', 'draw'), move('f1d1', 'draw')];
        expect(choose(fen, moves, [], OFF)).toBe('f1f7');
        expect(choose(fen, moves, [], ON)).toBe('f1d1');
      });

      it('should accept a move whose piece is protected', () => {
        // Rxb1 is answered by Kxb1, but Kxf7 cannot be answered.
        const protectedFen = '1r6/6k1/8/8/8/8/8/K4R2 w - - 0 1';
        const moves = [move('f1f7', 'draw'), move('f1b1', 'draw')];
        expect(choose(protectedFen, moves, [], OFF)).toBe('f1f7');
        expect(choose(protectedFen, moves, [], ON)).toBe('f1b1');
      });

      it('should keep every move when all of them leave material at reach', () => {
        const moves = [move('f1f7', 'draw'), move('f1b1', 'draw')];
        expect(choose(fen, moves, [], ON)).toBe('f1f7');
      });
    });

    it('should not apply where the result is not a draw', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5f7', 'win', 5, 5), move('f5e5', 'win', 1, 1)];
      // The rival loses (the opponent wins): longest defence, whatever the tie-break says.
      expect(choose(fen, moves, [], ON)).toBe('f5f7');
    });

    it('should be on unless it is switched off', () => {
      const fen = '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1';
      const moves = [move('f5f7', 'draw'), move('f5e5', 'draw')];
      expect(chooseRivalMove({ fen, result: answer(moves), seenPositions: [] }).uci).toBe('f5e5');
    });
  });
});

/** Answers recorded from Lichess for a game where the player plays Lichess's first move. */
describe('recorded games against the tablebase', () => {
  interface Played {
    log: string[];
    seen: string[];
  }

  const simulate = (fen: string, player: Color, tie: { drawTiebreak: boolean }): Played => {
    const game = playRecorded(fen, player, tie);
    const log = game.moves.map(
      (played, index) => `${game.byPlayer[index] ? 'P' : 'R'} ${played.san}`,
    );
    if (pos(game.seen.at(-1) as string).isInsufficientMaterial()) log.push('(insufficient)');
    return { log, seen: game.seen };
  };

  const playerCaptures = (log: string[]) =>
    log.filter((entry) => entry.startsWith('P ') && entry.includes('x'));

  const count = (seen: string[]) => {
    const counts = new Map<string, number>();
    for (const fen of seen) {
      const key = fen.split(' ').slice(0, 4).join(' ');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Math.max(...counts.values());
  };

  const HANDS = {
    corner: '8/8/4k3/8/7P/8/6K1/8 b - - 0 1',
    square: '8/8/8/6k1/1P6/8/8/7K b - - 0 1',
    vancura: 'R7/6k1/P4r2/8/8/8/8/6K1 b - - 0 1',
    philidor: '4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1',
    opposition: '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1',
    queen: 'K7/8/8/8/8/1Q6/2p5/1k6 b - - 0 1',
    lucena: '1K6/1P2k3/8/8/8/8/2r5/3R4 w - - 0 1',
  };

  it('should not promote to a piece the king takes in a rook-pawn ending', () => {
    for (const tie of [OFF, ON]) {
      const { log } = simulate(HANDS.corner, 'black', tie);
      // The pawn walks to h7 instead of promoting on h8; the king takes it at the end.
      expect(log).toEqual([
        'P Kd5',
        'R h5',
        'P Ke5',
        'R h6',
        'P Kf6',
        'R h7',
        'P Kg7',
        'R Kf1',
        'P Kxh7',
        '(insufficient)',
      ]);
      expect(log.some((entry) => entry.includes('h8'))).toBe(false);
    }
  });

  it('should not promote into the defender in the rule of the square', () => {
    for (const tie of [OFF, ON]) {
      const { log } = simulate(HANDS.square, 'black', tie);
      expect(log.filter((entry) => entry.includes('=')).length).toBe(0);
      expect(log.slice(0, 8)).toEqual([
        'P Kf4',
        'R b5',
        'P Ke5',
        'R b6',
        'P Kd6',
        'R b7',
        'P Kc7',
        'R Kg1',
      ]);
    }
  });

  it('should hand the pawn back in Vancura without the tie-break and keep it with it', () => {
    const plain = simulate(HANDS.vancura, 'black', OFF);
    expect(plain.log.slice(0, 6)).toEqual(['P Rf3', 'R a7', 'P Ra3', 'R Rb8', 'P Rxa7', 'R Rb1']);

    const careful = simulate(HANDS.vancura, 'black', ON);
    expect(careful.log.slice(0, 4)).toEqual(['P Rf3', 'R a7', 'P Ra3', 'R Kf1']);
    expect(playerCaptures(careful.log)).toEqual([]);
    expect(careful.log.filter((entry) => entry.startsWith('P')).length).toBe(15);
  });

  it('should hand the pawn back in Philidor without the tie-break and keep it with it', () => {
    const plain = simulate(HANDS.philidor, 'black', OFF);
    expect(plain.log.slice(0, 6)).toEqual(['P Ra1', 'R e6', 'P Rb1', 'R e7', 'P Ra1', 'R Rh2']);
    expect(plain.log[6]).toBe('P Kxe7');

    const careful = simulate(HANDS.philidor, 'black', ON);
    expect(careful.log.slice(0, 6)).toEqual(['P Ra1', 'R e6', 'P Rb1', 'R e7', 'P Ra1', 'R Rg7']);
    expect(playerCaptures(careful.log)).toEqual([]);
  });

  it('should lose the pawn in the opposition ending either way', () => {
    for (const tie of [OFF, ON]) {
      const { log } = simulate(HANDS.opposition, 'black', tie);
      expect(log.slice(-2)).toEqual(['P Kxe7', '(insufficient)']);
    }
  });

  it('should stalemate the queen against the bishop pawn only without the tie-break', () => {
    const plain = simulate(HANDS.queen, 'black', OFF);
    expect(plain.log).toEqual(['P Ka1', 'R Qxc2']);
    expect(pos(plain.seen[2]).isStalemate()).toBe(true);

    const careful = simulate(HANDS.queen, 'black', ON);
    expect(careful.log.slice(0, 2)).toEqual(['P Ka1', 'R Qa3+']);
    expect(careful.log.filter((entry) => entry.startsWith('P')).length).toBe(15);
    expect(pos(careful.seen.at(-1) as string).isEnd()).toBe(false);
    // No position comes up a third time.
    expect(count(careful.seen)).toBeLessThan(3);
  });

  it('should defend the longest in Lucena when the rival is the losing side', () => {
    const { log } = simulate(HANDS.lucena, 'white', ON);
    // Lichess lists Re6 first among the losing moves; Rb2 lasts longer.
    expect(log.slice(0, 2)).toEqual(['P Rd5', 'R Rb2']);
    expect(log.at(-1)).toBe('P Qg1#');
  });
});
