import { describe, expect, it } from 'vitest';
import { parseSan, makeSan } from 'chessops/san';
import { loadPositions, loadPositionsRaw } from '../../lib/content.ts';
import { validateCurated } from '../../lib/schema.ts';
import { fenError, playSan, positionFromFen } from '../../lib/chess.ts';
import type { Chess } from 'chessops/chess';

const raw = loadPositionsRaw();
const positions = loadPositions();

/** Tags that promise the solution ends in checkmate. */
const MATE_TAG = /-mate$/;

describe('curated positions', () => {
  it('is an array with 10 to 15 positions', () => {
    expect(Array.isArray(raw)).toBe(true);
    expect(positions.length).toBeGreaterThanOrEqual(10);
    expect(positions.length).toBeLessThanOrEqual(15);
  });

  it('every entry matches the CuratedPosition schema', () => {
    const errors = (raw as unknown[]).flatMap((p, i) => validateCurated(p, `positions[${i}]`));
    expect(errors).toEqual([]);
  });

  it('ids are unique', () => {
    const ids = positions.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(positions)('$id', (p) => {
    it('has a valid FEN and a legal position with the player to move', () => {
      expect(fenError(p.fen)).toBeUndefined();
      const pos = positionFromFen(p.fen);
      expect(pos.turn).toBe(p.playerSide);
      expect(pos.isEnd()).toBe(false);
    });

    it('solution has 1 to 5 player moves and ends with a player move', () => {
      expect(p.solution.length % 2).toBe(1);
      const playerMoves = (p.solution.length + 1) / 2;
      expect(playerMoves).toBeGreaterThanOrEqual(1);
      expect(playerMoves).toBeLessThanOrEqual(5);
    });

    it('every solution move is legal, in canonical SAN, and the game does not end early', () => {
      let pos: Chess = positionFromFen(p.fen);
      p.solution.forEach((san, i) => {
        const move = parseSan(pos, san);
        expect(move, `move ${i + 1} (${san}) is illegal`).toBeDefined();
        expect(makeSan(pos, move!)).toBe(san);
        pos = playSan(pos, san)!;
        if (i < p.solution.length - 1) expect(pos.isEnd(), `game over after ${san}`).toBe(false);
      });
    });

    it('a final checkmate is real and matches the mate tags / SAN suffix', () => {
      let pos: Chess = positionFromFen(p.fen);
      for (const san of p.solution) pos = playSan(pos, san)!;
      const last = p.solution[p.solution.length - 1];
      expect(pos.isCheckmate()).toBe(last.endsWith('#'));
      if (p.tags.some((t) => MATE_TAG.test(t))) expect(pos.isCheckmate()).toBe(true);
    });
  });
});
