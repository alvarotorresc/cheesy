import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService, type LessonSummary, type PuzzleCatalog } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService, type PuzzleProgress } from '../../../core/progress';
import { byLevelAndOrder } from '../learn-progress';
import { BATCH_SIZE } from './next-batch';

type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly catalog: PuzzleCatalog;
      readonly lessons: readonly LessonSummary[];
      readonly progress: readonly PuzzleProgress[];
    };

/** One row of the list: a lesson with puzzles and how far the learner got. */
export interface PuzzleRow {
  readonly lesson: LessonSummary;
  readonly themes: readonly string[];
  readonly count: number;
  readonly firstTry: number;
  readonly started: boolean;
  /** How full each batch-sized part of the bar is, from 0 to 1. */
  readonly parts: readonly number[];
}

/**
 * The rows of the list, in the order of the course. The counts come from the saved rows of each
 * lesson, without downloading its puzzles: a row left behind by puzzles generated again could
 * count, so the count never goes over the puzzles of the lesson.
 */
export const puzzleRows = (
  catalog: PuzzleCatalog,
  lessons: readonly LessonSummary[],
  progress: readonly PuzzleProgress[],
): PuzzleRow[] =>
  catalog.lessons
    .flatMap((entry) => {
      const lesson = lessons.find((summary) => summary.id === entry.lesson);
      if (!lesson) return [];
      const rows = progress.filter((row) => row.lessonId === entry.lesson);
      const firstTry = Math.min(entry.count, rows.filter((row) => row.lastFirstTry).length);
      const parts = Array.from({ length: Math.ceil(entry.count / BATCH_SIZE) }, (_, i) => {
        const size = Math.min(BATCH_SIZE, entry.count - i * BATCH_SIZE);
        return Math.min(1, Math.max(0, (firstTry - i * BATCH_SIZE) / size));
      });
      return [
        {
          lesson,
          themes: entry.themes,
          count: entry.count,
          firstTry,
          started: rows.length > 0,
          parts,
        },
      ];
    })
    .sort((a, b) => byLevelAndOrder(a.lesson, b.lesson));

/** "Practise more": the lessons with Lichess puzzles, how many went in at the first try, and the way in. */
@Component({
  selector: 'app-puzzle-list',
  imports: [RouterLink],
  templateUrl: './puzzle-list.html',
  styleUrl: './puzzle-list.css',
})
export class PuzzleList {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  protected readonly progress = inject(ProgressService);

  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly rows = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? puzzleRows(state.catalog, state.lessons, state.progress) : [];
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const [catalog, lessons, progress] = await Promise.all([
        this.content.puzzleCatalog(),
        this.content.lessonCatalog(),
        this.progress.puzzles(),
      ]);
      this.state.set({ status: 'ready', catalog, lessons, progress });
    } catch {
      this.state.set({ status: 'error' });
    }
  }

  /** The names of the themes of a row, in the active language. */
  protected themeNames(themes: readonly string[]): string {
    const names: Readonly<Record<string, string | undefined>> = this.i18n.t().learn.puzzles.themes;
    return themes.map((theme) => names[theme] ?? theme).join(', ');
  }
}
