import { inject, Injectable, signal } from '@angular/core';
import { isContentId, isPuzzleId } from '../content/content-id';
import {
  applyResult,
  isValidResult,
  parseEndgameProgress,
  parseLessonProgress,
  parseLineProgress,
  parsePositionProgress,
  parsePuzzleProgress,
  progressKey,
} from './progress-record';
import { PROGRESS_STORE_LOADER, type ProgressStore } from './progress-store';
import type {
  EndgameProgress,
  LessonProgress,
  LessonResult,
  LineProgress,
  LineResult,
  PositionProgress,
  ProgressSection,
  PuzzleProgress,
  PuzzleResult,
} from './progress.types';

/**
 * `unknown`: the store has not been opened yet. `ready`: progress is read and saved.
 * `unavailable`: the browser refused the store, or an operation on it failed; the app goes on
 * without saved progress.
 */
export type ProgressStatus = 'unknown' | 'ready' | 'unavailable';

/**
 * Progress of the practised lines, endgames, positions, lessons and puzzles, kept only in this
 * browser (IndexedDB). Nothing is ever sent anywhere.
 *
 * Storage is best effort: every method resolves, never rejects. When the store cannot be opened
 * or an operation fails, reads return nothing, writes are dropped, and `status` turns
 * `unavailable` so the pages can say so.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly loader = inject(PROGRESS_STORE_LOADER);
  private readonly state = signal<ProgressStatus>('unknown');
  private readonly changes = signal(0);
  private store: Promise<ProgressStore | undefined> | undefined;

  readonly status = this.state.asReadonly();
  /** Bumped after every change, so views showing progress can read it again. */
  readonly revision = this.changes.asReadonly();

  /** Every valid row of the lines. Rows that fail validation are ignored, not deleted. */
  async lines(): Promise<LineProgress[]> {
    const rows = await this.run((store) => store.lines.all());
    return (rows ?? []).flatMap((row) => parseLineProgress(row) ?? []);
  }

  /** Every valid row of one opening. */
  async linesOf(openingId: string): Promise<LineProgress[]> {
    if (!isContentId(openingId)) return [];
    return (await this.lines()).filter((progress) => progress.openingId === openingId);
  }

  /**
   * Adds a completed run to the progress of its line. Resolves with the new progress, or
   * undefined when it could not be saved.
   */
  async recordLine(result: LineResult, now = Date.now()): Promise<LineProgress | undefined> {
    if (!isValidResult(result)) return undefined;
    const key = progressKey(result.openingId, result.color, result.lineId);
    return this.save(async (store) => {
      const next = applyResult(parseLineProgress(await store.lines.get(key)), result, now);
      await store.lines.put({ key, ...next });
      return next;
    });
  }

  /** Every valid row of the endgames. */
  async endgames(): Promise<EndgameProgress[]> {
    const rows = await this.run((store) => store.endgames.all());
    return (rows ?? []).flatMap((row) => parseEndgameProgress(row) ?? []);
  }

  /** Counts one more time that the goal of an endgame was reached. */
  async recordEndgame(endgameId: string, now = Date.now()): Promise<EndgameProgress | undefined> {
    if (!isContentId(endgameId)) return undefined;
    return this.save(async (store) => {
      const previous = parseEndgameProgress(await store.endgames.get(endgameId));
      const next: EndgameProgress = {
        endgameId,
        completions: (previous?.completions ?? 0) + 1,
        firstCompletedAt: previous?.firstCompletedAt ?? now,
        lastCompletedAt: Math.max(now, previous?.firstCompletedAt ?? now),
      };
      await store.endgames.put(next);
      return next;
    });
  }

  /** Every valid row of the positions. */
  async positions(): Promise<PositionProgress[]> {
    const rows = await this.run((store) => store.positions.all());
    return (rows ?? []).flatMap((row) => parsePositionProgress(row) ?? []);
  }

  /**
   * Notes that a mistake, a hint or the solution came before the first solve. It does nothing once
   * the position has been solved: "first try" is fixed by then.
   */
  async markPositionSpoiled(positionId: string): Promise<void> {
    if (!isContentId(positionId)) return;
    await this.save(async (store) => {
      const previous = parsePositionProgress(await store.positions.get(positionId));
      if (previous && previous.solves > 0) return undefined;
      const next: PositionProgress = { positionId, solves: 0, firstTry: false, spoiled: true };
      await store.positions.put(next);
      return next;
    });
  }

  /** Counts one more solve. The first one decides whether it was on the first try. */
  async recordPositionSolve(
    positionId: string,
    now = Date.now(),
  ): Promise<PositionProgress | undefined> {
    if (!isContentId(positionId)) return undefined;
    return this.save(async (store) => {
      const previous = parsePositionProgress(await store.positions.get(positionId));
      const first = !previous || previous.solves === 0;
      const spoiled = previous?.spoiled ?? false;
      const next: PositionProgress = {
        positionId,
        solves: (previous?.solves ?? 0) + 1,
        firstTry: first ? !spoiled : (previous?.firstTry ?? false),
        spoiled,
        lastSolvedAt: now,
      };
      await store.positions.put(next);
      return next;
    });
  }

  /** Every valid row of the lessons. */
  async lessons(): Promise<LessonProgress[]> {
    const rows = await this.run((store) => store.lessons.all());
    return (rows ?? []).flatMap((row) => parseLessonProgress(row) ?? []);
  }

  /** Saves that a lesson reached its summary, replacing an earlier result. */
  async recordLesson(result: LessonResult, now = Date.now()): Promise<LessonProgress | undefined> {
    const next = parseLessonProgress({ ...result, completedAt: now });
    if (!next) return undefined;
    return this.save(async (store) => {
      await store.lessons.put(next);
      return next;
    });
  }

  /** Every valid row of the puzzles, or of the puzzles of one lesson. */
  async puzzles(lessonId?: string): Promise<PuzzleProgress[]> {
    if (lessonId !== undefined && !isContentId(lessonId)) return [];
    const rows = await this.run((store) =>
      lessonId === undefined ? store.puzzles.all() : store.puzzles.ofLesson(lessonId),
    );
    return (rows ?? [])
      .flatMap((row) => parsePuzzleProgress(row) ?? [])
      .filter((row) => lessonId === undefined || row.lessonId === lessonId);
  }

  /** Saves a finished puzzle: one more try, and its result replaces the last one. */
  async recordPuzzle(result: PuzzleResult, now = Date.now()): Promise<PuzzleProgress | undefined> {
    const { puzzleId, lessonId, firstTry } = result;
    if (!isPuzzleId(puzzleId) || !isContentId(lessonId) || typeof firstTry !== 'boolean') {
      return undefined;
    }
    return this.save(async (store) => {
      const previous = parsePuzzleProgress(await store.puzzles.get(puzzleId));
      const next: PuzzleProgress = {
        puzzleId,
        lessonId,
        tries: (previous?.tries ?? 0) + 1,
        lastFirstTry: firstTry,
        lastPlayedAt: now,
      };
      await store.puzzles.put(next);
      return next;
    });
  }

  /** Deletes the progress of one section, and only that one. Resolves with false on failure. */
  async clear(section: ProgressSection): Promise<boolean> {
    const table = {
      openings: 'lines',
      endgames: 'endgames',
      positions: 'positions',
      lessons: 'lessons',
      puzzles: 'puzzles',
    } as const;
    const cleared = await this.run(async (store) => {
      await store[table[section]].clear();
      return true;
    });
    if (cleared) this.changes.update((value) => value + 1);
    return cleared ?? false;
  }

  /** Runs a write and bumps the revision when it produced something. */
  private async save<T>(operation: (store: ProgressStore) => Promise<T>): Promise<T | undefined> {
    const saved = await this.run(operation);
    if (saved !== undefined) this.changes.update((value) => value + 1);
    return saved;
  }

  /** Runs an operation on the store, turning any failure into `unavailable`. */
  private async run<T>(operation: (store: ProgressStore) => Promise<T>): Promise<T | undefined> {
    const store = await this.open();
    if (!store) return undefined;
    try {
      return await operation(store);
    } catch (error) {
      console.error(error);
      this.state.set('unavailable');
      return undefined;
    }
  }

  /**
   * Opens the store once. Loading the database module can fail too (a chunk that does not
   * download), so the import and the opening are guarded together.
   */
  private open(): Promise<ProgressStore | undefined> {
    this.store ??= (async () => {
      try {
        const store = await this.loader();
        this.state.set('ready');
        return store;
      } catch (error) {
        console.error(error);
        this.state.set('unavailable');
        return undefined;
      }
    })();
    return this.store;
  }
}
