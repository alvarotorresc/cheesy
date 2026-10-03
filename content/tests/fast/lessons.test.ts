import { describe, expect, it } from 'vitest';
import {
  loadEndgames,
  loadGlossary,
  loadLessonCatalogRaw,
  loadLessonFiles,
  loadLessons,
  loadPositions,
} from '../../lib/content.ts';
import {
  animationErrors,
  engineOptionErrors,
  fenErrors,
  fileErrors,
  findMoveErrors,
  glossaryErrors,
  nextErrors,
  playOutErrors,
  reachErrors,
  setErrors,
  statusErrors,
} from '../../lib/lesson-checks.ts';
import { lessons as authored } from '../../authoring/lessons/index.ts';
import { lessonSummary } from '../../lib/lesson-build.ts';
import { positionFromFen } from '../../lib/chess.ts';
import { acceptedMoves } from '../../../src/app/core/lessons/find-move-rules.ts';
import { validateLesson } from '../../lib/schema.ts';
import { findMoveValidator } from '../../lib/tablebase-find-move.ts';
import type { GlossaryTerm, Lesson, Step } from '../../types.ts';

const text = (value: string) => ({
  es: [{ kind: 'text' as const, text: value }],
  en: [{ kind: 'text' as const, text: value }],
});

const MATE = 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 1';

/** A lesson that passes every check; each seeded test breaks one thing in a copy of it. */
const base = (): Lesson => ({
  id: 'sample',
  level: 'beginner',
  order: 1,
  title: { es: 'Ejemplo', en: 'Sample' },
  summary: { es: 'Una lección.', en: 'A lesson.' },
  terms: [],
  sources: ['https://handbook.fide.com/chapter/E012023'],
  steps: [
    {
      kind: 'explain',
      text: text('Look.'),
      board: {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        orientation: 'white',
        moves: ['e4', 'e5'],
      },
    },
    {
      kind: 'reach',
      text: text('Collect.'),
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['a8', 'h8'],
      minMoves: 2,
    },
    {
      kind: 'find-move',
      text: text('Escape.'),
      board: { fen: '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', orientation: 'white' },
      check: { by: 'rule', rule: 'escape-check' },
      explanation: text('Good.'),
    },
    {
      kind: 'find-move',
      text: text('Mate.'),
      board: { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Ra8#'] },
      explanation: text('Back rank.'),
    },
    {
      kind: 'choice',
      text: text('Which?'),
      board: { fen: MATE, orientation: 'black' },
      answer: { by: 'status' },
      whyWrong: [text('No.'), null, text('No.'), text('No.')],
      explanation: text('Mate.'),
    },
    {
      kind: 'choice',
      text: text('Worth?'),
      answer: {
        by: 'fact',
        options: [
          { es: 'Tres', en: 'Three' },
          { es: 'Cinco', en: 'Five' },
        ],
        correct: 0,
      },
      whyWrong: [null, text('No.')],
      explanation: text('Three.'),
    },
    { kind: 'tap-square', text: text('Tap.'), count: 2, squares: ['a1', 'b2'] },
    {
      kind: 'play-out',
      text: text('Win.'),
      fen: '8/8/8/8/8/8/5Q2/k5K1 w - - 0 1',
      goal: 'win',
      playerSide: 'white',
    },
    {
      kind: 'choice',
      text: text('Best?'),
      board: { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', orientation: 'white' },
      answer: { by: 'engine', options: ['Ra8#', 'Ra7'], correct: 0 },
      whyWrong: [null, text('No.')],
      explanation: text('Mate.'),
    },
  ],
});

/** A copy of the base lesson with one step replaced by `patch` applied over it. */
const withStep = (index: number, patch: Record<string, unknown>): Lesson => {
  const lesson = base();
  lesson.steps[index] = { ...lesson.steps[index], ...patch } as Step;
  return lesson;
};
const stepOf = (kind: Step['kind'], nth = 0) =>
  base().steps.findIndex(
    (s, i, all) => s.kind === kind && all.filter((x, j) => x.kind === kind && j < i).length === nth,
  );

const GLOSSARY = (lesson?: string): GlossaryTerm[] =>
  [{ id: 'fork', lesson }] as unknown as GlossaryTerm[];

describe('the seeded lesson', () => {
  const lesson = base();
  it('passes every check, so a seeded failure is the only thing a test sees', () => {
    expect(validateLesson(lesson, 'sample')).toEqual([]);
    expect(setErrors([lesson], [lessonSummary(lesson)])).toEqual([]);
    for (const check of [
      fenErrors,
      animationErrors,
      reachErrors,
      findMoveErrors,
      statusErrors,
      playOutErrors,
      engineOptionErrors,
    ])
      expect(check([lesson])).toEqual([]);
    expect(glossaryErrors([lesson], [])).toEqual([]);
    expect(nextErrors([lesson], new Set(), new Set())).toEqual([]);
  });
});

describe('validateLesson', () => {
  it('rejects a lesson with the wrong number of steps or none to practise', () => {
    const short = base();
    short.steps = short.steps.slice(0, 4);
    expect(validateLesson(short, 'l').join()).toContain('5 to 10 steps');
    const talk = base();
    talk.steps = talk.steps.map(() => ({ kind: 'explain', text: text('x') }));
    expect(validateLesson(talk, 'l').join()).toContain('at least one exercise');
  });

  it('rejects duplicate stars in a reach step', () => {
    const errors = validateLesson(withStep(stepOf('reach'), { targets: ['a8', 'a8'] }), 'l');
    expect(errors.join()).toContain('l.steps[1].targets: duplicate squares');
  });

  it('rejects an engine solution of even length', () => {
    const errors = validateLesson(
      withStep(stepOf('find-move', 1), { check: { by: 'engine', solution: ['Ra8+', 'Kh7'] } }),
      'l',
    );
    expect(errors.join()).toContain('solution: odd length');
  });

  it('rejects tap-square with a count above its list', () => {
    const errors = validateLesson(withStep(stepOf('tap-square'), { count: 3 }), 'l');
    expect(errors.join()).toContain('squares: at least count valid squares');
  });

  it('accepts null whyWrong on the correct option only', () => {
    const fact = stepOf('choice', 1);
    expect(validateLesson(withStep(fact, {}), 'l')).toEqual([]);
    const wrongNull = validateLesson(withStep(fact, { whyWrong: [null, null] }), 'l');
    expect(wrongNull.join()).toContain('whyWrong[1]: required on a wrong option');
    const correctText = validateLesson(withStep(fact, { whyWrong: [text('x'), text('y')] }), 'l');
    expect(correctText).toEqual([]);
  });

  it('rejects a choice without whyWrong or with one per option missing', () => {
    const fact = stepOf('choice', 1);
    const lesson = base();
    delete (lesson.steps[fact] as Partial<Step>)['whyWrong' as never];
    expect(validateLesson(lesson, 'l').join()).toContain('missing "whyWrong"');
    expect(validateLesson(withStep(fact, { whyWrong: [null] }), 'l').join()).toContain(
      'one per option',
    );
  });

  it('rejects a status question with more than one null whyWrong', () => {
    const errors = validateLesson(
      withStep(stepOf('choice'), { whyWrong: [null, null, text('x'), text('y')] }),
      'l',
    );
    expect(errors.join()).toContain('at most one null');
  });

  it('rejects an unknown key, a bad rule and a bad level', () => {
    const bad = withStep(stepOf('find-move'), { check: { by: 'rule', rule: 'win' }, extra: 1 });
    bad.level = 'expert' as never;
    const errors = validateLesson(bad, 'l').join();
    expect(errors).toContain('unexpected key "extra"');
    expect(errors).toContain('engine solution or known rule');
    expect(errors).toContain('l.level');
  });

  it('rejects a bad next', () => {
    const bad = base();
    bad.next = { kind: 'endgames', category: '' };
    expect(validateLesson(bad, 'l').join()).toContain('l.next');
  });
});

describe('seeded checks', () => {
  it('1. rejects duplicate lesson ids', () => {
    const errors = setErrors([base(), base()], [lessonSummary(base()), lessonSummary(base())]);
    expect(errors).toContain('duplicate lesson id sample');
  });

  it('1. rejects orders with a gap', () => {
    const gap = base();
    gap.order = 2;
    expect(setErrors([gap], [lessonSummary(gap)]).join()).toContain('do not run from 1');
  });

  it('1. rejects a catalogue that is missing a lesson or lists one with no file', () => {
    const other = { ...base(), id: 'other', order: 2 };
    expect(setErrors([base(), other], [lessonSummary(base())]).join()).toContain('does not match');
    expect(setErrors([base()], [lessonSummary(base()), lessonSummary(other)]).join()).toContain(
      'does not match',
    );
    expect(setErrors([base()], 'nope').join()).toContain('does not match');
  });

  it('1. rejects a file whose name is not its id', () => {
    expect(fileErrors([{ file: 'other.json', data: base() }])).toContain(
      'other.json: id does not match the file name',
    );
  });

  it('2. rejects an illegal FEN in any step that has one', () => {
    const board = { fen: '8/8/8/8/8/8/8/8 w - - 0 1', orientation: 'white' };
    expect(fenErrors([withStep(stepOf('find-move'), { board })]).join()).toContain('step 3');
    expect(fenErrors([withStep(stepOf('play-out'), { fen: 'nonsense' })]).join()).toContain(
      'step 8',
    );
  });

  it('3. rejects an illegal animated move, and does not throw on an illegal FEN', () => {
    const lesson = base();
    (lesson.steps[0] as { board: { moves: string[] } }).board.moves = ['e4', 'e4'];
    expect(animationErrors([lesson])).toEqual(['sample step 1: illegal e4']);
    expect(
      animationErrors([
        withStep(0, { board: { fen: 'nonsense', orientation: 'white', moves: ['e4'] } }),
      ]),
    ).toEqual([]);
  });

  it('4. rejects a wrong minMoves, an unreachable star and a star under attack', () => {
    expect(reachErrors([withStep(stepOf('reach'), { minMoves: 3 })])).toEqual([
      'sample step 2: minMoves 3 but the minimum is 2',
    ]);
    const walled = withStep(stepOf('reach'), {
      piece: { role: 'rook', color: 'white', square: 'a1' },
      targets: ['h8'],
      blockers: ['a2', 'b1'],
    });
    expect(reachErrors([walled]).join()).toContain('cannot be reached');
    const attacked = withStep(stepOf('reach'), {
      targets: ['h8'],
      enemies: [{ role: 'rook', square: 'h1' }],
      minMoves: 1,
    });
    expect(reachErrors([attacked]).join()).toContain('stars under attack');
  });

  it('4. rejects duplicate stars, which would make every star unreachable', () => {
    expect(reachErrors([withStep(stepOf('reach'), { targets: ['a8', 'a8'] })]).join()).toContain(
      'duplicate stars',
    );
  });

  it('5. rejects an escape-check step that is not in check, and a rule that accepts nothing', () => {
    const calm = { fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', orientation: 'white' };
    expect(findMoveErrors([withStep(stepOf('find-move'), { board: calm })])).toEqual([
      'sample step 3: not in check',
    ]);
    const nothing = withStep(stepOf('find-move'), {
      board: calm,
      check: { by: 'rule', rule: 'castle' },
    });
    expect(findMoveErrors([nothing])).toEqual(['sample step 3: castle accepts no move']);
  });

  it('5. rejects an illegal or accepted wrong move', () => {
    const wrong = { Ka1: text('x'), Kd1: text('y'), Kxe2: text('z') };
    expect(findMoveErrors([withStep(stepOf('find-move'), { wrong })])).toEqual([
      'sample step 3: wrong move Ka1 is illegal',
      'sample step 3: Kd1 is accepted',
      'sample step 3: Kxe2 is accepted',
    ]);
    expect(
      findMoveErrors([withStep(stepOf('find-move', 1), { wrong: { 'Ra8#': text('x') } })]),
    ).toEqual(['sample step 4: Ra8# is accepted']);
  });

  it('6. rejects a status question with an illegal board or a missing whyWrong', () => {
    const illegal = { fen: '8/8/8/8/8/8/8/8 w - - 0 1', orientation: 'white' };
    expect(statusErrors([withStep(stepOf('choice'), { board: illegal })])).toEqual([
      'sample step 5: a status question needs a legal board',
    ]);
    const noMessage = withStep(stepOf('choice'), { whyWrong: [null, null, text('x'), text('y')] });
    expect(statusErrors([noMessage])).toEqual(['sample step 5: whyWrong for check is missing']);
  });

  it('6. rejects a status question about a game that is over for another reason', () => {
    const drawn = { fen: '8/8/8/8/8/8/8/k1K5 w - - 0 1', orientation: 'white' };
    expect(statusErrors([withStep(stepOf('choice'), { board: drawn })]).join()).toContain(
      'not by mate',
    );
  });

  it('6. rejects an engine option that is not a legal move in its position', () => {
    const bad = withStep(8, {
      answer: { by: 'engine', options: ['Ra8#', 'Ra9', 'Qh5'], correct: 0 },
    });
    expect(engineOptionErrors([bad])).toEqual([
      'sample step 9: option Ra9 is not a legal move',
      'sample step 9: option Qh5 is not a legal move',
    ]);
  });

  it('7. rejects a play-out with more than 7 pieces or the other side to move', () => {
    const crowded = withStep(stepOf('play-out'), { fen: 'k7/pppp4/8/8/8/8/PPPP4/K7 w - - 0 1' });
    expect(playOutErrors([crowded])).toEqual(['sample step 8: more than 7 pieces']);
    expect(playOutErrors([withStep(stepOf('play-out'), { playerSide: 'black' })])).toEqual([
      'sample step 8: white is to move',
    ]);
  });

  it('8. rejects terms that do not exist, do not point back or are not listed', () => {
    const lesson = { ...base(), terms: ['fork'] };
    expect(glossaryErrors([lesson], [])).toEqual(['sample: unknown term fork']);
    expect(glossaryErrors([lesson], GLOSSARY())).toEqual(['sample: term fork points to no lesson']);
    expect(glossaryErrors([lesson], GLOSSARY('other'))).toEqual([
      'sample: term fork points to other',
      'glossary fork: unknown lesson other',
    ]);
    expect(glossaryErrors([lesson], GLOSSARY('sample'))).toEqual([]);
    expect(glossaryErrors([base()], GLOSSARY('sample'))).toEqual([
      'glossary fork: lesson sample does not list it',
    ]);
    expect(glossaryErrors([base()], GLOSSARY('missing'))).toEqual([
      'glossary fork: unknown lesson missing',
    ]);
  });

  it('9. rejects a next that points to nothing', () => {
    const endgames = { ...base(), next: { kind: 'endgames' as const, category: 'Nope' } };
    const positions = { ...base(), next: { kind: 'positions' as const, tag: 'nope' } };
    expect(nextErrors([endgames], new Set(['Pawns']), new Set(['fork']))).toEqual([
      'sample: no endgame category Nope',
    ]);
    expect(nextErrors([positions], new Set(['Pawns']), new Set(['fork']))).toEqual([
      'sample: no position tag nope',
    ]);
    expect(
      nextErrors(
        [{ ...base(), next: { kind: 'endgames', category: 'Pawns' } }],
        new Set(['Pawns']),
        new Set(),
      ),
    ).toEqual([]);
  });
});

describe('findMoveValidator', () => {
  const ENDING = '8/8/8/8/5k2/8/2P2r2/2K1R3 w - - 0 1'; // 5 pieces
  const EIGHT = '6k1/5ppp/8/8/2n5/8/5PPP/R5K1 w - - 0 1'; // 10 pieces

  it('sends an ending without a mate to the tablebase', () => {
    expect(findMoveValidator(ENDING, ['Kb2'])).toBe('tablebase');
    expect(findMoveValidator(ENDING, ['Kb2', 'Rf1', 'Re4+'])).toBe('tablebase');
  });

  it('sends a mate to Stockfish, however few pieces there are', () => {
    expect(findMoveValidator('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['Ra8#'])).toBe('stockfish');
  });

  it('sends a position with more than 7 pieces to Stockfish', () => {
    expect(findMoveValidator(EIGHT, ['Ra4'])).toBe('stockfish');
  });
});

describe('lessons', () => {
  const lessons = loadLessons();

  it('0. the lesson files and the catalogue hold exactly the authored lessons', () => {
    const authoredIds = authored.map((l) => l.id).sort();
    expect(authoredIds.length).toBeGreaterThan(0);
    expect(lessons.map((l) => l.id).sort()).toEqual(authoredIds);
    expect((loadLessonCatalogRaw() as { id: string }[]).map((c) => c.id).sort()).toEqual(
      authoredIds,
    );
  });

  it('1. every lesson matches the schema, and its file is named after its id', () => {
    expect(fileErrors(loadLessonFiles())).toEqual([]);
  });

  it('1. ids are unique, orders run from 1 without gaps, and the catalogue matches the files', () => {
    expect(setErrors(lessons, loadLessonCatalogRaw())).toEqual([]);
  });

  it('2. every FEN is legal (reach steps have none)', () => {
    expect(fenErrors(lessons)).toEqual([]);
  });

  it('3. the animated moves of an explanation are legal from its FEN', () => {
    expect(animationErrors(lessons)).toEqual([]);
  });

  it('4. reach: free squares, no star under attack, and minMoves is the real minimum', () => {
    expect(reachErrors(lessons)).toEqual([]);
  });

  it('5. find-move: rules give a move, and every move in `wrong` is legal and not accepted', () => {
    expect(findMoveErrors(lessons)).toEqual([]);
  });

  it('6. status questions: a legal board, a message for each wrong option, no odd endings', () => {
    expect(statusErrors(lessons)).toEqual([]);
  });

  it('6. engine questions list only legal moves', () => {
    expect(engineOptionErrors(lessons)).toEqual([]);
  });

  it('7. play-out positions have at most 7 pieces and the player is to move', () => {
    expect(playOutErrors(lessons)).toEqual([]);
  });

  it('8. glossary: lesson terms exist and point back, and every term with a lesson is listed by it', () => {
    expect(glossaryErrors(lessons, loadGlossary())).toEqual([]);
  });

  it('9. every next points to something that exists', () => {
    const categories = new Set(loadEndgames().map((e) => e.category.en));
    const tags = new Set(loadPositions().flatMap((p) => p.tags));
    expect(nextErrors(lessons, categories, tags)).toEqual([]);
  });

  it('10/13. every engine find-move goes to Stockfish or to the tablebase, never to neither', () => {
    const engineFindMoves = lessons.flatMap((l) =>
      l.steps.flatMap((s) =>
        s.kind === 'find-move' && s.check.by === 'engine'
          ? [findMoveValidator(s.board.fen, s.check.solution)]
          : [],
      ),
    );
    expect(engineFindMoves.length).toBeGreaterThan(0);
    expect(engineFindMoves.filter((v) => v !== 'stockfish' && v !== 'tablebase')).toEqual([]);
  });

  it('castling-en-passant: the castling question agrees with the rule', () => {
    const lesson = lessons.find((l) => l.id === 'castling-en-passant')!;
    const step = lesson.steps.find(
      (s) => s.kind === 'choice' && s.answer.by === 'fact' && s.board,
    )!;
    if (step.kind !== 'choice' || step.answer.by !== 'fact') return;
    const canCastle = acceptedMoves(positionFromFen(step.board!.fen), 'castle').length > 0;
    // Option 0 is "yes", option 1 is "no" in this question.
    expect(step.answer.correct).toBe(canCastle ? 0 : 1);
  });
});
