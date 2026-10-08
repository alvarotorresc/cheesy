// Stockfish verification of the lesson exercises that need it (depth >= 18).
import { afterAll, describe, expect, it } from 'vitest';
import { Engine } from '../../lib/engine.ts';
import { loadLessons } from '../../lib/content.ts';
import { checkTactic, type StepReport } from '../../lib/tactic-check.ts';
import { checkEngineChoice } from '../../lib/choice-check.ts';
import { findMoveValidator } from '../../lib/tablebase-find-move.ts';

const DEPTH = Math.max(18, Number(process.env.TACTIC_DEPTH ?? 22));
const engine = new Engine(1, 512);
afterAll(() => engine.quit());

const steps = loadLessons().flatMap((l) =>
  l.steps.map((s, i) => ({ at: `${l.id} step ${i + 1}`, s })),
);

const tacticProblems = (report: StepReport[]) =>
  report.filter((r) => !r.ok).map((r) => `ply ${r.ply} ${r.san}: ${r.problem}`);

type ChoiceResult = Awaited<ReturnType<typeof checkEngineChoice>>;
const choiceScores = (options: string[], r: ChoiceResult, correct: number) =>
  `${options.map((o, i) => `${o} ${r.scores[i]}cp`).join(' | ')} (best ${r.best}cp, marked ${correct})`;

/** Test 11 for one choice: the checker finds no problem and its only good option is the marked one. */
async function expectEngineChoice(fen: string, options: string[], correct: number) {
  const result = await checkEngineChoice(engine, fen, options, DEPTH);
  const scores = choiceScores(options, result, correct);
  expect(result.problems, scores).toEqual([]);
  expect(result.good, scores).toEqual([correct]);
}

// Find-moves of an ending without a mate go to the tablebase instead (test 13).
describe.each(
  steps.filter(
    ({ s }) =>
      s.kind === 'find-move' &&
      s.check.by === 'engine' &&
      findMoveValidator(s.board.fen, s.check.solution) === 'stockfish',
  ),
)('find-move: $at', ({ s }) => {
  const onlyMove = s.kind === 'find-move' && s.check.by === 'engine' && !!s.check.onlyMove;
  const what = onlyMove ? 'the only move that holds' : 'decisive';
  it(`10. solution is best, ${what} and unambiguous (depth ${DEPTH})`, async () => {
    if (s.kind !== 'find-move' || s.check.by !== 'engine') return;
    const report = await checkTactic(
      engine,
      { fen: s.board.fen, solution: s.check.solution },
      DEPTH,
      { onlyMove },
    );
    expect(tacticProblems(report)).toEqual([]);
  });
});

describe.each(steps.filter(({ s }) => s.kind === 'choice' && s.answer.by === 'engine'))(
  'choice: $at',
  ({ s }) => {
    it(`11. exactly the written option is within 30cp of the best, the rest 80cp below (depth ${DEPTH})`, async () => {
      if (s.kind !== 'choice' || s.answer.by !== 'engine') return;
      await expectEngineChoice(s.board!.fen, s.answer.options, s.answer.correct);
    });
  },
);

// The lessons above may not use these checks yet; seeded positions show that they accept a good
// exercise and reject a bad one. Only mates and large gaps, so the result does not depend on depth.
const BACK_RANK = '6k1/5ppp/8/8/8/8/r4PPP/4R1K1 w - - 0 1'; // only Re8# mates; the rest is level
const TWO_ROOKS = '6k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1'; // Rd8# and Re8# both mate
const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'; // Bb5 is best

describe('checkTactic on seeded positions', () => {
  it('accepts the only mate in one', async () => {
    const report = await checkTactic(engine, { fen: BACK_RANK, solution: ['Re8#'] }, DEPTH);
    expect(tacticProblems(report)).toEqual([]);
  });

  it('rejects a move that is not the best', async () => {
    const report = await checkTactic(engine, { fen: BACK_RANK, solution: ['h3'] }, DEPTH);
    expect(tacticProblems(report).join()).toMatch(/not the best move/);
  });

  it('rejects a mate when another move also mates', async () => {
    const report = await checkTactic(engine, { fen: TWO_ROOKS, solution: ['Re8#'] }, DEPTH);
    expect(tacticProblems(report).join()).toMatch(/ambiguous: Rd8# \(also mates\)/);
  });
});

// onlyMove: a king and pawn ending, so that the scores do not move with the depth, and a middlegame.
const KP_DRAW = '3k4/8/8/4K3/4P3/8/8/8 b - - 0 1'; // only Ke7 holds the draw; the rest lose
const LONE_MOVE = '6k1/5ppp/8/8/8/8/6P1/r6K w - - 0 1'; // Kh2 is the only legal move, a rook down

describe('checkTactic with onlyMove on seeded positions', () => {
  it('accepts the only move that holds a level position', async () => {
    const report = await checkTactic(engine, { fen: KP_DRAW, solution: ['Ke7'] }, DEPTH, {
      onlyMove: true,
    });
    expect(tacticProblems(report)).toEqual([]);
  });

  it('still rejects a level position without onlyMove: the move is not decisive', async () => {
    const report = await checkTactic(engine, { fen: KP_DRAW, solution: ['Ke7'] }, DEPTH);
    expect(tacticProblems(report).join()).toMatch(/not decisive/);
  });

  it('rejects a move when another one is less than 200cp worse', async () => {
    const report = await checkTactic(engine, { fen: ITALIAN, solution: ['Bb5'] }, DEPTH, {
      onlyMove: true,
    });
    expect(tacticProblems(report).join()).toMatch(/ambiguous: alternative too close/);
  });

  it('rejects an only move when another move also holds', async () => {
    // Re8# mates, but every other move keeps the level game: it is not the only move that holds.
    const report = await checkTactic(engine, { fen: BACK_RANK, solution: ['Re8#'] }, DEPTH, {
      onlyMove: true,
    });
    expect(tacticProblems(report).join()).toMatch(/ambiguous: alternative also holds/);
  });

  it('rejects an only move that leaves the player lost', async () => {
    const report = await checkTactic(engine, { fen: LONE_MOVE, solution: ['Kh2'] }, DEPTH, {
      onlyMove: true,
    });
    expect(tacticProblems(report).join()).toMatch(/below the floor of an only move/);
  });
});

describe('checkEngineChoice on seeded positions', () => {
  it('accepts the best option when the others are far below it', async () => {
    await expectEngineChoice(ITALIAN, ['Ng1', 'Bb5', 'Ba6'], 1);
  });

  it('finds that the marked option is not the good one, naming every score', async () => {
    const options = ['Ng1', 'Bb5', 'Ba6'];
    const failure = await expectEngineChoice(ITALIAN, options, 0).catch((e: Error) => e);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/Ng1 -?\d+cp \| Bb5 -?\d+cp \| Ba6 -?\d+cp/);
  });

  it('reports two good options as a problem', async () => {
    const result = await checkEngineChoice(engine, TWO_ROOKS, ['Rd8#', 'Re8#'], DEPTH);
    expect(result.good).toEqual([0, 1]);
    expect(result.problems).toEqual(['expected exactly one good option, got [0, 1]']);
  });

  it('handles mate scores: the mating option is the only good one', async () => {
    const result = await checkEngineChoice(engine, BACK_RANK, ['h3', 'Re8#', 'Kf1'], DEPTH);
    expect(result.good).toEqual([1]);
    expect(result.problems).toEqual([]);
  });
});
