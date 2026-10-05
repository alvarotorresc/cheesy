import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  ContentService,
  type LessonSummary,
  type Puzzle,
  type PuzzleFile,
} from '../../../core/content';
import { DICTIONARIES, I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ProgressService } from '../../../core/progress';
import { BoardSpotlight } from '../../../shared/board';
import { FindMoveStepView } from '../lesson/steps/find-move-step';
import { firstTryCount, nextBatch } from './next-batch';
import { puzzleStep, type PuzzleTexts } from './puzzle-step';

const TEXTS: PuzzleTexts = {
  es: DICTIONARIES.es.learn.puzzles,
  en: DICTIONARIES.en.learn.puzzles,
};

type PageState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'notFound' }
  | {
      readonly status: 'ready';
      readonly file: PuzzleFile;
      /** The lesson in the lesson catalogue, for its title and the way back to it. */
      readonly lesson?: LessonSummary;
    };

/** What the summary says about the whole lesson; unknown while the results are being saved. */
interface LessonTally {
  readonly firstTry: number;
  readonly total: number;
}

/**
 * A batch of Lichess puzzles of one lesson, played in the "Find the move" view of the lessons.
 * Each puzzle is saved when it ends (solved or skipped), so leaving halfway keeps what was done.
 * The batch is fixed when it starts; the summary offers another one.
 */
@Component({
  selector: 'app-puzzle-page',
  imports: [FindMoveStepView, NgTemplateOutlet, RouterLink],
  providers: [BoardSpotlight],
  templateUrl: './puzzle-page.html',
  // The head, the progress bar and the summary are those of a lesson.
  styleUrls: ['../lesson/lesson-page.css', './puzzle-page.css'],
})
export class PuzzlePage {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  protected readonly progress = inject(ProgressService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly lessonId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('lesson') ?? '')),
    { requireSync: true },
  );

  protected readonly state = signal<PageState>({ status: 'loading' });
  protected readonly batch = signal<readonly Puzzle[]>([]);
  /** Counts the batches of this visit, so a view is never reused from one batch to the next. */
  protected readonly batchNumber = signal(0);
  protected readonly index = signal(0);
  /** Puzzle index → whether it was solved at the first try. Only the first result counts. */
  protected readonly outcomes = signal<ReadonlyMap<number, boolean>>(new Map());
  protected readonly tally = signal<LessonTally | undefined>(undefined);

  protected readonly title = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') return '';
    return state.lesson ? this.i18n.localize(state.lesson.title) : '';
  });
  /** The steps of the batch, built once per batch: each step holds both languages. */
  protected readonly steps = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') return [];
    return this.batch().map((puzzle) => puzzleStep(puzzle, state.file.themes, TEXTS));
  });
  protected readonly current = computed(() => this.steps()[this.index()]);
  protected readonly onSummary = computed(
    () => this.state().status === 'ready' && this.index() === this.batch().length,
  );
  protected readonly canGoOn = computed(() => this.outcomes().has(this.index()));
  protected readonly isLast = computed(() => this.index() === this.batch().length - 1);
  protected readonly firstTries = computed(
    () => [...this.outcomes().values()].filter(Boolean).length,
  );
  /** One key per puzzle shown: a fresh view each time, so nothing scheduled reaches the next. */
  protected readonly viewKey = computed(() => `${this.batchNumber()}:${this.index()}`);

  /** Saves still on their way, awaited before the summary counts the lesson. */
  private readonly writes: Promise<unknown>[] = [];
  private focusedKey: string | undefined;

  constructor() {
    // "La horquilla · Practica más": the lesson once it is loaded, the section until then.
    inject(PageTitle).showDetail(() => {
      const title = this.title();
      return title && `${title} · ${this.i18n.t().learn.puzzles.title}`;
    });
    effect(() => {
      const id = this.lessonId();
      untracked(() => void this.load(id));
    });

    effect(() => {
      if (this.onSummary()) untracked(() => void this.countLesson());
    });

    // A new puzzle, or the summary, moves the focus to its heading; the first one keeps the page's.
    afterRenderEffect(() => {
      const key = this.onSummary() ? `${this.batchNumber()}:summary` : this.viewKey();
      if (this.state().status !== 'ready' || key === this.focusedKey) return;
      const heading = this.host.nativeElement.querySelector<HTMLElement>('[data-step-heading]');
      if (!heading) return;
      if (this.focusedKey !== undefined) heading.focus();
      this.focusedKey = key;
    });
  }

  protected async load(id: string): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const [file, catalog, rows] = await Promise.all([
        this.content.puzzles(id),
        // Without the lesson catalogue the puzzles still work, only without the lesson title.
        this.content.lessonCatalog().catch(() => []),
        this.progress.puzzles(id),
      ]);
      if (id !== this.lessonId()) return;
      if (!file) {
        this.state.set({ status: 'notFound' });
        return;
      }
      this.startBatch(file, rows);
      this.state.set({
        status: 'ready',
        file,
        lesson: catalog.find((lesson) => lesson.id === id),
      });
    } catch {
      if (id === this.lessonId()) this.state.set({ status: 'error' });
    }
  }

  protected retry(): void {
    void this.load(this.lessonId());
  }

  protected onDone(index: number, result: { firstTry: boolean }): void {
    if (this.outcomes().has(index)) return;
    this.outcomes.update((outcomes) => new Map(outcomes).set(index, result.firstTry));
    const puzzle = this.batch()[index];
    this.writes.push(
      this.progress.recordPuzzle({
        puzzleId: puzzle.id,
        lessonId: this.lessonId(),
        firstTry: result.firstTry,
      }),
    );
  }

  protected next(): void {
    if (this.canGoOn()) this.index.update((index) => index + 1);
  }

  protected async anotherBatch(): Promise<void> {
    const state = this.state();
    if (state.status !== 'ready') return;
    await Promise.all(this.writes);
    this.startBatch(state.file, await this.progress.puzzles(state.file.lesson));
  }

  private startBatch(file: PuzzleFile, rows: Parameters<typeof nextBatch>[1]): void {
    this.batch.set(nextBatch(file.puzzles, rows));
    this.batchNumber.update((n) => n + 1);
    this.index.set(0);
    this.outcomes.set(new Map());
    this.tally.set(undefined);
  }

  /** Waits for the saves of the batch, then counts the lesson from what is stored. */
  private async countLesson(): Promise<void> {
    const state = this.state();
    if (state.status !== 'ready') return;
    const batch = this.batchNumber();
    await Promise.all(this.writes);
    const rows = await this.progress.puzzles(state.file.lesson);
    if (batch !== this.batchNumber()) return;
    this.tally.set({
      firstTry: firstTryCount(state.file.puzzles, rows),
      total: state.file.puzzles.length,
    });
  }
}
