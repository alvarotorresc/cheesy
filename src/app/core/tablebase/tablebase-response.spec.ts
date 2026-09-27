import { parsePosition } from '../game';
import { parseTablebaseResponse } from './tablebase-response';
import { LUCENA_FEN, LUCENA_RESPONSE, SQUARE_RULE_FEN, SQUARE_RULE_RESPONSE } from './testing';

const positionOf = (fen: string) => {
  const position = parsePosition(fen);
  if (!position) throw new Error(`Invalid test FEN: ${fen}`);
  return position;
};

const lucena = positionOf(LUCENA_FEN);

const withMoves = (moves: unknown) => ({ ...LUCENA_RESPONSE, moves });

describe('parseTablebaseResponse', () => {
  it('should keep the result, the distances and the moves when the answer is valid', () => {
    const result = parseTablebaseResponse(LUCENA_RESPONSE, lucena);

    expect(result).toEqual({
      category: 'win',
      dtz: 5,
      dtm: 33,
      checkmate: false,
      stalemate: false,
      moves: [
        { uci: 'd1d5', san: 'Rd5', category: 'loss', dtz: -8, dtm: -32 },
        { uci: 'd1a1', san: 'Ra1', category: 'loss', dtz: -4, dtm: -34 },
        { uci: 'd1d8', san: 'Rd8', category: 'win', dtz: 1, dtm: 39 },
        { uci: 'd1d7', san: 'Rd7+', category: 'win', dtz: 1, dtm: 35 },
      ],
    });
  });

  it('should compute SAN locally instead of trusting the answer', () => {
    const result = parseTablebaseResponse(SQUARE_RULE_RESPONSE, positionOf(SQUARE_RULE_FEN));

    expect(result?.moves.map((move) => move.san).slice(0, 3)).toEqual(['Kf4', 'Kf5', 'Kf6']);
  });

  it('should turn null distances into undefined when the service does not know them', () => {
    const result = parseTablebaseResponse({ ...LUCENA_RESPONSE, dtm: null, dtz: null }, lucena);

    expect(result?.dtm).toBeUndefined();
    expect(result?.dtz).toBeUndefined();
  });

  it('should accept missing flags and treat them as false', () => {
    const rest: Record<string, unknown> = { ...LUCENA_RESPONSE };
    delete rest['checkmate'];
    delete rest['stalemate'];

    const result = parseTablebaseResponse(rest, lucena);

    expect(result?.checkmate).toBe(false);
    expect(result?.stalemate).toBe(false);
  });

  it('should report an unrecognised category as unknown', () => {
    const result = parseTablebaseResponse({ ...LUCENA_RESPONSE, category: 'future-win' }, lucena);

    expect(result?.category).toBe('unknown');
  });

  it('should accept every category the service documents', () => {
    for (const category of [
      'win',
      'syzygy-win',
      'maybe-win',
      'cursed-win',
      'draw',
      'blessed-loss',
      'maybe-loss',
      'syzygy-loss',
      'loss',
      'unknown',
    ]) {
      expect(parseTablebaseResponse({ ...LUCENA_RESPONSE, category }, lucena)?.category).toBe(
        category,
      );
    }
  });

  it('should accept an answer without moves when the position has ended', () => {
    const mated = positionOf('R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 1');

    const result = parseTablebaseResponse(
      { category: 'loss', dtz: 0, dtm: 0, checkmate: true, stalemate: false, moves: [] },
      mated,
    );

    expect(result).toMatchObject({ checkmate: true, moves: [] });
  });

  it.each([
    ['null', null],
    ['a string', 'win'],
    ['an array', []],
    ['an object without moves', { category: 'win' }],
    ['moves that are not a list', { ...LUCENA_RESPONSE, moves: 'd1d5' }],
    ['a category that is not a string', { ...LUCENA_RESPONSE, category: 3 }],
    ['a missing category', { ...LUCENA_RESPONSE, category: undefined }],
    ['a distance that is a string', { ...LUCENA_RESPONSE, dtz: '5' }],
    ['a distance that is not an integer', { ...LUCENA_RESPONSE, dtm: 3.5 }],
    ['an implausible distance', { ...LUCENA_RESPONSE, dtm: 1e9 }],
    ['a flag that is not a boolean', { ...LUCENA_RESPONSE, checkmate: 'no' }],
  ])('should reject an answer with %s', (_label, raw) => {
    expect(parseTablebaseResponse(raw, lucena)).toBeUndefined();
  });

  it.each([
    ['a move that is not an object', ['d1d5']],
    ['a move without UCI', [{ category: 'loss' }]],
    ['a move with malformed UCI', [{ uci: 'd1d5<script>', category: 'loss' }]],
    ['an illegal move', [{ uci: 'd1e2', category: 'loss' }]],
    ['a move of the side not to move', [{ uci: 'c2c1', category: 'loss' }]],
    ['a move from an empty square', [{ uci: 'a1a2', category: 'loss' }]],
    ['a move with a bad category', [{ uci: 'd1d5', category: null }]],
    ['a move with a bad distance', [{ uci: 'd1d5', category: 'loss', dtz: 'x' }]],
    [
      'a repeated move',
      [
        { uci: 'd1d5', category: 'loss' },
        { uci: 'd1d5', category: 'loss' },
      ],
    ],
  ])('should reject an answer with %s', (_label, moves) => {
    expect(parseTablebaseResponse(withMoves(moves), lucena)).toBeUndefined();
  });

  it('should reject an answer with more moves than any position can have', () => {
    const moves = Array.from({ length: 300 }, () => ({ uci: 'd1d5', category: 'loss' }));

    expect(parseTablebaseResponse(withMoves(moves), lucena)).toBeUndefined();
  });

  it('should reject an answer that belongs to a different position', () => {
    expect(parseTablebaseResponse(SQUARE_RULE_RESPONSE, lucena)).toBeUndefined();
  });

  it('should accept a promotion written in UCI', () => {
    const position = positionOf('8/P7/8/8/8/8/k7/4K3 w - - 0 1');

    const result = parseTablebaseResponse(
      { category: 'win', dtz: 1, dtm: 19, moves: [{ uci: 'a7a8q', category: 'loss' }] },
      position,
    );

    expect(result?.moves[0]).toMatchObject({ uci: 'a7a8q', san: 'a8=Q+' });
  });
});
