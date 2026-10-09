import { inject, Injectable, InjectionToken, signal } from '@angular/core';
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
import { mergeDocuments } from '../sync/merge';
import {
  emptyDocument,
  parseSyncDocument,
  SECTION_TABLE,
  SYNC_FORMAT,
  SYNC_VERSION,
  type SyncDocument,
} from '../sync/sync-document';
import { PROGRESS_STORE_LOADER, type ProgressStore, type StoredTables } from './progress-store';
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
 * Told when a section is cleared, with the time. Nothing by default; the sync provides it to note
 * the clear in the progress document, so the rows do not come back from the server.
 */
export const PROGRESS_CLEARED = new InjectionToken<(section: ProgressSection, at: number) => void>(
  'PROGRESS_CLEARED',
  { providedIn: 'root', factory: () => () => undefined },
);

/** The valid rows of the tables as a canonical document, with no marks. */
const documentOf = (tables: StoredTables): SyncDocument => {
  const parsed = parseSyncDocument({
    format: SYNC_FORMAT,
    v: SYNC_VERSION,
    cleared: {},
    // A stored line must match its own key: the document derives the key again.
    lines: tables.lines.flatMap((row) => parseLineProgress(row) ?? []),
    endgames: tables.endgames,
    positions: tables.positions,
    lessons: tables.lessons,
    puzzles: tables.puzzles,
  });
  return parsed.ok ? parsed.doc : emptyDocument();
};

/** The rows of a document as they are stored: lines get their key back. */
const tablesOf = (doc: SyncDocument): StoredTables => ({
  lines: doc.lines.map((row) => ({
    key: progressKey(row.openingId, row.color, row.lineId),
    ...row,
  })),
  endgames: [...doc.endgames],
  positions: [...doc.positions],
  lessons: [...doc.lessons],
  puzzles: [...doc.puzzles],
});

/**
 * Progress of the practised lines, endgames, positions, lessons and puzzles, kept in this browser
 * (IndexedDB). It sends nothing itself: the sync reads it with `snapshot` and writes what comes
 * from the server with `mergeRemote`.
 *
 * Storage is best effort: every method resolves, never rejects. When the store cannot be opened
 * or an operation fails, reads return nothing, writes are dropped, and `status` turns
 * `unavailable` so the pages can say so.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly loader = inject(PROGRESS_STORE_LOADER);
  private readonly state = signal<ProgressStatus>('unknown');
  private readonly onCleared = inject(PROGRESS_CLEARED);
  private readonly changes = signal(0);
  private readonly localChanges = signal(0);
  private store: Promise<ProgressStore | undefined> | undefined;

  readonly status = this.state.asReadonly();
  /** Bumped after every change, so views showing progress can read it again. */
  readonly revision = this.changes.asReadonly();
  /**
   * Bumped only by changes made in this browser (recording, clearing, importing), never by data
   * merged from the server: the sync uploads after it, and must not upload what it just got.
   */
  readonly localRevision = this.localChanges.asReadonly();

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
      let next: LineProgress | undefined;
      const stored = await store.lines.update(key, (current) => {
        next = applyResult(parseLineProgress(current), result, now);
        return { key, ...next };
      });
      return stored && next;
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
      return store.endgames.update(endgameId, (current) => {
        const previous = parseEndgameProgress(current);
        return {
          endgameId,
          completions: (previous?.completions ?? 0) + 1,
          firstCompletedAt: previous?.firstCompletedAt ?? now,
          lastCompletedAt: Math.max(now, previous?.firstCompletedAt ?? now),
        };
      });
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
  async markPositionSpoiled(positionId: string, now = Date.now()): Promise<void> {
    if (!isContentId(positionId)) return;
    await this.save((store) =>
      store.positions.update(positionId, (current) => {
        const previous = parsePositionProgress(current);
        if (previous && previous.solves > 0) return undefined;
        return {
          positionId,
          solves: 0,
          firstTry: false,
          spoiled: true,
          // The first time it was spoiled: later spoils do not move it.
          spoiledAt: previous?.spoiledAt ?? now,
        };
      }),
    );
  }

  /** Counts one more solve. The first one decides whether it was on the first try. */
  async recordPositionSolve(
    positionId: string,
    now = Date.now(),
  ): Promise<PositionProgress | undefined> {
    if (!isContentId(positionId)) return undefined;
    return this.save((store) =>
      store.positions.update(positionId, (current) => {
        const previous = parsePositionProgress(current);
        const first = !previous || previous.solves === 0;
        const spoiled = previous?.spoiled ?? false;
        return {
          positionId,
          solves: (previous?.solves ?? 0) + 1,
          firstTry: first ? !spoiled : (previous?.firstTry ?? false),
          spoiled,
          lastSolvedAt: now,
          ...(previous?.spoiledAt === undefined ? {} : { spoiledAt: previous.spoiledAt }),
        };
      }),
    );
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
    return this.save((store) =>
      store.puzzles.update(puzzleId, (current) => ({
        puzzleId,
        lessonId,
        tries: (parsePuzzleProgress(current)?.tries ?? 0) + 1,
        lastFirstTry: firstTry,
        lastPlayedAt: now,
      })),
    );
  }

  /**
   * Deletes the progress of one section, and only that one, and tells `PROGRESS_CLEARED`.
   * Resolves with false on failure.
   */
  async clear(section: ProgressSection, now = Date.now()): Promise<boolean> {
    const cleared = await this.run(async (store) => {
      await store[SECTION_TABLE[section]].clear();
      return true;
    });
    if (!cleared) return false;
    this.bumpLocal();
    this.onCleared(section, now);
    return true;
  }

  /** The valid rows of every table as a canonical document, or undefined without a store. */
  async snapshot(): Promise<SyncDocument | undefined> {
    const tables = await this.run(async (store) => {
      const [lines, endgames, positions, lessons, puzzles] = await Promise.all([
        store.lines.all(),
        store.endgames.all(),
        store.positions.all(),
        store.lessons.all(),
        store.puzzles.all(),
      ]);
      return { lines, endgames, positions, lessons, puzzles };
    });
    return tables && documentOf(tables);
  }

  /**
   * Writes a document from the server: merged with the progress kept here (its marks delete the
   * rows they cover), or in place of it with `replace`. All in one transaction. Bumps `revision`
   * so the views read again, but not `localRevision`: it is not a change made here. Resolves with
   * the document written, or undefined on failure.
   */
  async mergeRemote(
    remote: SyncDocument,
    mode: 'merge' | 'replace' = 'merge',
  ): Promise<SyncDocument | undefined> {
    const written = await this.write(remote, mode);
    if (written) this.changes.update((value) => value + 1);
    return written;
  }

  /**
   * Merges a copy exported from a file. Its marks are ignored: importing a copy never deletes
   * anything. It is a change made here, so the sync uploads it. Resolves with false on failure.
   */
  async importDocument(doc: SyncDocument): Promise<boolean> {
    const written = await this.write({ ...doc, cleared: {} }, 'merge');
    if (written) this.bumpLocal();
    return written !== undefined;
  }

  private async write(
    incoming: SyncDocument,
    mode: 'merge' | 'replace',
  ): Promise<SyncDocument | undefined> {
    let result: SyncDocument | undefined;
    const written = await this.run((store) =>
      store.rewrite((current) => {
        const base = mode === 'replace' ? emptyDocument() : documentOf(current);
        result = mergeDocuments(base, incoming);
        return tablesOf(result);
      }),
    );
    return written && result;
  }

  /** Runs a write made here and bumps both revisions when it produced something. */
  private async save<T>(operation: (store: ProgressStore) => Promise<T>): Promise<T | undefined> {
    const saved = await this.run(operation);
    if (saved !== undefined) this.bumpLocal();
    return saved;
  }

  private bumpLocal(): void {
    this.changes.update((value) => value + 1);
    this.localChanges.update((value) => value + 1);
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
