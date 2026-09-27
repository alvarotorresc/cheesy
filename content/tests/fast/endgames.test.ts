import { describe, expect, it } from 'vitest';
import { loadEndgames, loadEndgamesRaw } from '../../lib/content.ts';
import { validateEndgame } from '../../lib/schema.ts';
import { countPieces, fenError, positionFromFen } from '../../lib/chess.ts';

const raw = loadEndgamesRaw();
const endgames = loadEndgames();

describe('endgames', () => {
  it('is an array with 12 to 18 positions', () => {
    expect(Array.isArray(raw)).toBe(true);
    expect(endgames.length).toBeGreaterThanOrEqual(12);
    expect(endgames.length).toBeLessThanOrEqual(18);
  });

  it('every entry matches the EndgamePosition schema', () => {
    const errors = (raw as unknown[]).flatMap((e, i) => validateEndgame(e, `endgames[${i}]`));
    expect(errors).toEqual([]);
  });

  it('ids are unique', () => {
    const ids = endgames.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('FENs are unique', () => {
    const fens = endgames.map((e) => e.fen);
    expect(new Set(fens).size).toBe(fens.length);
  });

  describe.each(endgames)('$id', (e) => {
    it('has a valid FEN and a legal position', () => {
      expect(fenError(e.fen)).toBeUndefined();
    });

    it('has at most 7 pieces (tablebase range)', () => {
      expect(countPieces(positionFromFen(e.fen))).toBeLessThanOrEqual(7);
    });

    it('the practising side is to move and the game is not over', () => {
      const pos = positionFromFen(e.fen);
      expect(pos.turn).toBe(e.playerSide);
      expect(pos.isEnd()).toBe(false);
    });
  });
});
