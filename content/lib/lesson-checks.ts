// The checks of the fast lesson tests, as functions over a list of lessons so that the tests can
// run them both on the real content and on seeded bad lessons. Each returns its errors.
import { forbiddenSquares, minReachMoves } from '../../src/app/core/lessons/reach.ts';
import { acceptedMoves } from '../../src/app/core/lessons/find-move-rules.ts';
import { STATUS_OPTIONS, positionStatus } from '../../src/app/core/lessons/position-status.ts';
import { countPieces, fenError, playSan, positionFromFen } from './chess.ts';
import { lessonSummary } from './lesson-build.ts';
import { validateLesson } from './schema.ts';
import type { Chess } from 'chessops/chess';
import type { GlossaryTerm, Lesson, LessonSummary, Step } from '../types.ts';

export const LESSON_LEVELS = ['beginner', 'intermediate', 'advanced'];

interface Located<K extends Step['kind']> {
  at: string;
  s: Extract<Step, { kind: K }>;
}

const located = (lessons: Lesson[]) =>
  lessons.flatMap((l) => l.steps.map((s, i) => ({ at: `${l.id} step ${i + 1}`, s })));

const stepsOf = <K extends Step['kind']>(lessons: Lesson[], kind: K): Located<K>[] =>
  located(lessons).filter((x): x is Located<K> => x.s.kind === kind);

/** The position of a FEN, or undefined when it is not legal (test 2 reports those). */
const positionOf = (fen: string): Chess | undefined =>
  fenError(fen) ? undefined : positionFromFen(fen);

/** Test 1: schema and file name for each file as read from disk. */
export const fileErrors = (files: { file: string; data: unknown }[]): string[] =>
  files.flatMap(({ file, data }) => [
    ...validateLesson(data, file),
    ...((data as Lesson).id + '.json' === file ? [] : [`${file}: id does not match the file name`]),
  ]);

/** Test 1: unique ids, orders from 1 without gaps in each level, and no stale or missing catalogue entry. */
export const setErrors = (lessons: Lesson[], catalog: unknown): string[] => {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const { id } of lessons) {
    if (seen.has(id)) errors.push(`duplicate lesson id ${id}`);
    seen.add(id);
  }
  for (const level of LESSON_LEVELS) {
    const orders = lessons
      .filter((l) => l.level === level)
      .map((l) => l.order)
      .sort((a, b) => a - b);
    if (orders.some((o, i) => o !== i + 1))
      errors.push(`${level}: orders ${orders.join(',')} do not run from 1 without gaps`);
  }
  const expected: LessonSummary[] = [...lessons]
    .sort(
      (a, b) =>
        LESSON_LEVELS.indexOf(a.level) - LESSON_LEVELS.indexOf(b.level) || a.order - b.order,
    )
    .map(lessonSummary);
  if (JSON.stringify(catalog) !== JSON.stringify(expected))
    errors.push(
      `catalogue [${Array.isArray(catalog) ? catalog.map((c: { id: string }) => c.id).join(' ') : '?'}] does not match the lessons [${expected.map((c) => c.id).join(' ')}]`,
    );
  return errors;
};

/** Test 2: every FEN is legal (reach steps have none). */
export const fenErrors = (lessons: Lesson[]): string[] =>
  located(lessons).flatMap(({ at, s }) => {
    const fen = s.kind === 'play-out' ? s.fen : 'board' in s ? s.board?.fen : undefined;
    const error = fen === undefined ? undefined : fenError(fen);
    return error ? [`${at}: ${error}`] : [];
  });

/** Test 3: the animated moves of an explanation are legal from its FEN. */
export const animationErrors = (lessons: Lesson[]): string[] =>
  stepsOf(lessons, 'explain').flatMap(({ at, s }) => {
    if (!s.board?.moves) return [];
    let pos = positionOf(s.board.fen);
    if (!pos) return [];
    for (const san of s.board.moves) {
      const next = playSan(pos, san);
      if (!next) return [`${at}: illegal ${san}`];
      pos = next;
    }
    return [];
  });

/** Test 4: free squares, no star under attack, reachable, and minMoves is the real minimum. */
export const reachErrors = (lessons: Lesson[]): string[] =>
  stepsOf(lessons, 'reach').flatMap(({ at, s }) => {
    const out: string[] = [];
    if (new Set(s.targets).size !== s.targets.length) out.push(`${at}: duplicate stars`);
    const taken = [
      s.piece.square,
      ...(s.blockers ?? []),
      ...(s.enemies ?? []).map((e) => e.square),
    ];
    if (new Set(taken).size !== taken.length) out.push(`${at}: two pieces on one square`);
    const onPiece = s.targets.filter((t) => taken.includes(t));
    if (onPiece.length) out.push(`${at}: stars on pieces ${onPiece.join(' ')}`);
    const attacked = s.targets.filter((t) => forbiddenSquares(s).includes(t));
    if (attacked.length) out.push(`${at}: stars under attack ${attacked.join(' ')}`);
    const min = minReachMoves(s);
    if (min === undefined) out.push(`${at}: some star cannot be reached`);
    else if (min !== s.minMoves)
      out.push(`${at}: minMoves ${s.minMoves} but the minimum is ${min}`);
    return out;
  });

/** Test 5: a rule accepts a move (escape-check starts in check); wrong moves are legal and not accepted. */
export const findMoveErrors = (lessons: Lesson[]): string[] =>
  stepsOf(lessons, 'find-move').flatMap(({ at, s }) => {
    const pos = positionOf(s.board.fen);
    if (!pos) return [];
    const out: string[] = [];
    if (s.check.by === 'rule') {
      if (s.check.rule === 'escape-check' && !pos.isCheck()) out.push(`${at}: not in check`);
      else if (!acceptedMoves(pos, s.check.rule).length)
        out.push(`${at}: ${s.check.rule} accepts no move`);
    }
    const good = s.check.by === 'rule' ? acceptedMoves(pos, s.check.rule) : [s.check.solution[0]];
    for (const san of Object.keys(s.wrong ?? {}))
      if (!playSan(pos, san)) out.push(`${at}: wrong move ${san} is illegal`);
      else if (good.includes(san)) out.push(`${at}: ${san} is accepted`);
    return out;
  });

/** Test 6: a status question has a legal board, and its wrong options all have a message. */
export const statusErrors = (lessons: Lesson[]): string[] =>
  stepsOf(lessons, 'choice').flatMap(({ at, s }) => {
    if (s.answer.by !== 'status') return [];
    const fen = s.board?.fen;
    const pos = fen === undefined ? undefined : positionOf(fen);
    if (!pos) return [`${at}: a status question needs a legal board`];
    const status = positionStatus(pos);
    if (status === 'none' && pos.isEnd())
      return [`${at}: the game is over but not by mate or stalemate`];
    return STATUS_OPTIONS.flatMap((option, i) =>
      option !== status && s.whyWrong[i] === null
        ? [`${at}: whyWrong for ${option} is missing`]
        : [],
    );
  });

/** Test 7: at most 7 pieces and the player is to move. */
export const playOutErrors = (lessons: Lesson[]): string[] =>
  stepsOf(lessons, 'play-out').flatMap(({ at, s }) => {
    const pos = positionOf(s.fen);
    if (!pos) return [];
    return [
      ...(countPieces(pos) > 7 ? [`${at}: more than 7 pieces`] : []),
      ...(pos.turn !== s.playerSide ? [`${at}: ${pos.turn} is to move`] : []),
    ];
  });

/** Test 8: lesson terms exist and point back, and every glossary term with a lesson is listed by it. */
export const glossaryErrors = (lessons: Lesson[], terms: GlossaryTerm[]): string[] => {
  const glossary = new Map(terms.map((t) => [t.id, t]));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  return [
    ...lessons.flatMap((l) =>
      l.terms.flatMap((id) => {
        const term = glossary.get(id);
        return !term
          ? [`${l.id}: unknown term ${id}`]
          : term.lesson !== l.id
            ? [`${l.id}: term ${id} points to ${term.lesson ?? 'no lesson'}`]
            : [];
      }),
    ),
    ...terms.flatMap((t) => {
      const lesson = t.lesson === undefined ? undefined : byId.get(t.lesson);
      return t.lesson === undefined
        ? []
        : !lesson
          ? [`glossary ${t.id}: unknown lesson ${t.lesson}`]
          : !lesson.terms.includes(t.id)
            ? [`glossary ${t.id}: lesson ${t.lesson} does not list it`]
            : [];
    }),
  ];
};

/** Test 9: every next points to something that exists. */
export const nextErrors = (
  lessons: Lesson[],
  categories: Set<string>,
  tags: Set<string>,
): string[] =>
  lessons.flatMap((l) =>
    l.next?.kind === 'endgames' && !categories.has(l.next.category)
      ? [`${l.id}: no endgame category ${l.next.category}`]
      : l.next?.kind === 'positions' && !tags.has(l.next.tag)
        ? [`${l.id}: no position tag ${l.next.tag}`]
        : [],
  );
