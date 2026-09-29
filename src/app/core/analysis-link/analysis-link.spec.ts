import { convertToParamMap, type Params } from '@angular/router';
import { INITIAL_FEN } from 'chessops/fen';
import { MoveTree, ROOT_ID } from '../move-tree';
import {
  absoluteAnalysisUrl,
  analysisLink,
  MAX_SHARED_FEN_LENGTH,
  MAX_SHARED_PGN_LENGTH,
  parseAnalysisParams,
  type AnalysisLinkInput,
} from './analysis-link';

const VARIANTS =
  '1. e4 e6 2. d4 d5 3. Nc3 (3. e5 c5 4. c3 Nc6 5. Nf3 Qb6) 3... Bb4 (3... Nf6 4. Bg5 (4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6) 4... Be7 5. e5 Nfd7 6. Bxe7 Qxe7) 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7';
const ENDGAME_FEN = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

const parse = (params: Params) => parseAnalysisParams(convertToParamMap(params));

/** What the router does with a link: it becomes a URL, and the URL comes back as parameters. */
const roundTrip = (input: AnalysisLinkInput) => {
  const { queryParams } = analysisLink(input);
  const search = new URL(absoluteAnalysisUrl(input, 'https://cheesy.example/')).searchParams;
  expect(Object.fromEntries(search)).toEqual(queryParams);
  return parse(Object.fromEntries(search));
};

describe('analysisLink', () => {
  it('should point at Analysis with no parameters for the initial position', () => {
    expect(analysisLink({})).toEqual({ commands: ['/analysis'], queryParams: {} });
  });

  it('should leave the FEN out when it is the initial one', () => {
    expect(analysisLink({ fen: INITIAL_FEN }).queryParams).toEqual({});
  });

  it('should carry a start position', () => {
    expect(analysisLink({ fen: ENDGAME_FEN }).queryParams).toEqual({ fen: ENDGAME_FEN });
  });

  it('should write the main line as normalized movetext', () => {
    expect(analysisLink({ moves: ['e4', 'e5', 'Nf3'] }).queryParams).toEqual({
      pgn: '1. e4 e5 2. Nf3',
    });
  });

  it('should number the moves from the FEN', () => {
    const { queryParams } = analysisLink({
      fen: '4k3/8/8/8/8/8/4P3/4K3 b - - 0 12',
      moves: ['Kd7'],
    });

    expect(queryParams['pgn']).toBe('12... Kd7');
  });

  it('should carry a whole tree with its variations', () => {
    expect(analysisLink({ tree: MoveTree.fromPgn(VARIANTS) }).queryParams).toEqual({
      pgn: VARIANTS,
    });
  });

  it('should carry the ply unless it is the end of the main line', () => {
    const moves = ['e4', 'e5', 'Nf3'];

    expect(analysisLink({ moves, ply: 2 }).queryParams['ply']).toBe('2');
    expect(analysisLink({ moves, ply: 0 }).queryParams['ply']).toBe('0');
    expect(analysisLink({ moves, ply: 3 }).queryParams).not.toHaveProperty('ply');
    expect(analysisLink({ moves, ply: 9 }).queryParams).not.toHaveProperty('ply');
    expect(analysisLink({ moves, ply: -1 }).queryParams).not.toHaveProperty('ply');
    expect(analysisLink({ ply: 0 }).queryParams).not.toHaveProperty('ply');
  });

  it('should carry where the link comes from', () => {
    expect(analysisLink({ from: { kind: 'practice', id: 'ruy-lopez' } }).queryParams).toEqual({
      from: 'practice:ruy-lopez',
    });
  });

  it('should throw on a move that is not legal', () => {
    expect(() => analysisLink({ moves: ['e4', 'e4'] })).toThrow();
  });
});

describe('absoluteAnalysisUrl', () => {
  it('should build the URL from the base of the app', () => {
    expect(absoluteAnalysisUrl({ moves: ['e4'] }, 'https://cheesy.example/')).toBe(
      'https://cheesy.example/analysis?pgn=1.%20e4',
    );
    expect(absoluteAnalysisUrl({}, 'https://cheesy.example/app/')).toBe(
      'https://cheesy.example/app/analysis',
    );
  });
});

describe('parseAnalysisParams', () => {
  it('should say there is nothing when no parameter is there', () => {
    expect(parse({})).toEqual({ status: 'none' });
    expect(parse({ utm_source: 'x' })).toEqual({ status: 'none' });
  });

  it('should open a shared FEN as before', () => {
    const parsed = parse({ fen: ENDGAME_FEN });

    expect(parsed).toMatchObject({ status: 'ok', currentId: ROOT_ID });
    if (parsed.status !== 'ok') throw new Error('expected ok');
    expect(parsed.tree.startFen).toBe(ENDGAME_FEN);
    expect(parsed.tree.size).toBe(0);
    expect(parsed.origin).toBeUndefined();
  });

  it.each(['nonsense', '', '8/8/8/8/8/8/8/8 w - - 0 1'])('should reject the FEN %j', (fen) => {
    expect(parse({ fen })).toEqual({ status: 'invalid' });
  });

  it('should reject a FEN longer than the limit without parsing it', () => {
    expect(parse({ fen: `${INITIAL_FEN}${' '.repeat(MAX_SHARED_FEN_LENGTH)}` })).toEqual({
      status: 'invalid',
    });
  });

  it('should show the end of the main line by default', () => {
    const parsed = parse({ pgn: VARIANTS });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.currentId).toBe(parsed.tree.lineEnd(ROOT_ID));
    expect(parsed.tree.node(parsed.currentId).san).toBe('Qc7');
  });

  it('should show the ply asked, counting the main line', () => {
    const parsed = parse({ pgn: VARIANTS, ply: '4' });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.node(parsed.currentId).san).toBe('d5');
    expect(parse({ pgn: VARIANTS, ply: '0' })).toMatchObject({ currentId: ROOT_ID });
  });

  it.each(['-1', '1.5', 'abc', '', '999', '99999999999'])('should ignore the ply %j', (ply) => {
    const parsed = parse({ pgn: '1. e4 e5', ply });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.node(parsed.currentId).san).toBe('e5');
  });

  it('should read the origin', () => {
    const parsed = parse({ from: 'endgame:lucena-position' });

    expect(parsed).toMatchObject({
      status: 'ok',
      origin: { kind: 'endgame', id: 'lucena-position' },
    });
  });

  it.each(['opening:../x', 'opening:', 'nope:ruy-lopez', 'ruy-lopez', 'opening:Ruy', ':ruy'])(
    'should ignore the origin %j without invalidating the link',
    (from) => {
      expect(parse({ from })).toEqual({ status: 'none' });
      const parsed = parse({ pgn: '1. e4', from });
      expect(parsed).toMatchObject({ status: 'ok' });
      expect(parsed).not.toHaveProperty('origin');
    },
  );

  it('should reject a PGN with an illegal move', () => {
    expect(parse({ pgn: '1. e4 e5 2. Bxf7' })).toEqual({ status: 'invalid' });
    expect(parse({ pgn: '1. e4 (1. d4 d5 2. Qh5) 1... e5' })).toEqual({ status: 'invalid' });
  });

  it('should reject text that is not a game', () => {
    expect(parse({ pgn: 'hello there' })).toEqual({ status: 'invalid' });
  });

  it('should reject a PGN of more than 6000 characters', () => {
    const cycle = ['Ra2', 'Ke7', 'Ra1', 'Ke8'];
    const pgn = (length: number): string => {
      let text = '';
      for (let index = 0; text.length < length; index++) {
        text += `${index % 2 === 0 ? `${index / 2 + 1}. ` : ''}${cycle[index % 4]} `;
      }
      return text.slice(0, length).trimEnd();
    };
    const fen = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

    expect(parse({ fen, pgn: pgn(MAX_SHARED_PGN_LENGTH - 6) })).toMatchObject({ status: 'ok' });
    expect(parse({ fen, pgn: `${pgn(MAX_SHARED_PGN_LENGTH)} ` + 'x' })).toEqual({
      status: 'invalid',
    });
  });

  it('should drop the header lines of a PGN', () => {
    const parsed = parse({
      pgn: '[Event "x"]\n[FEN "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"]\n\n1. e4 e5',
    });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.startFen).toBe(INITIAL_FEN);
    expect(parsed.tree.size).toBe(2);
  });

  it('should take moves and a FEN together', () => {
    const parsed = parse({ fen: ENDGAME_FEN, pgn: '1. e4 Kd7' });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.startFen).toBe(ENDGAME_FEN);
    expect(parsed.tree.mainLine().map((node) => node.san)).toEqual(['e4', 'Kd7']);
  });

  it('should open with an empty tree when the PGN is blank', () => {
    expect(parse({ pgn: '' })).toMatchObject({ status: 'ok', currentId: ROOT_ID });
  });
});

describe('round trip of links', () => {
  it('should bring back a start position', () => {
    const parsed = roundTrip({ fen: ENDGAME_FEN });

    expect(parsed).toMatchObject({ status: 'ok' });
    if (parsed.status === 'ok') expect(parsed.tree.startFen).toBe(ENDGAME_FEN);
  });

  it('should bring back a line with its ply and origin', () => {
    const parsed = roundTrip({
      moves: ['e4', 'e5', 'Nf3', 'Nc6'],
      ply: 2,
      from: { kind: 'opening', id: 'ruy-lopez' },
    });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.mainLine().map((node) => node.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(parsed.tree.node(parsed.currentId).san).toBe('e5');
    expect(parsed.origin).toEqual({ kind: 'opening', id: 'ruy-lopez' });
  });

  it('should bring back every variation, with characters such as + and spaces', () => {
    const tree = MoveTree.fromPgn(VARIANTS);
    const parsed = roundTrip({ tree });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.toPgn()).toBe(VARIANTS);
    expect(parsed.tree.size).toBe(tree.size);
  });

  it('should bring back a line from a position with black to move', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 12';
    const parsed = roundTrip({ fen, moves: ['Kd7', 'e4'] });
    if (parsed.status !== 'ok') throw new Error('expected ok');

    expect(parsed.tree.startFen).toBe(fen);
    expect(parsed.tree.mainLine().map((node) => node.san)).toEqual(['Kd7', 'e4']);
  });

  it('should keep a link with only the origin', () => {
    const parsed = roundTrip({ from: { kind: 'position', id: '3' } });

    expect(parsed).toMatchObject({ status: 'ok', origin: { kind: 'position', id: '3' } });
  });
});
