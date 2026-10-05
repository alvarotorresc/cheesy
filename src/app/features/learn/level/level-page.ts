import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentService, type LessonLevel, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ProgressService } from '../../../core/progress';
import { nextLesson } from '../learn-progress';

type LevelState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly catalog: readonly LessonSummary[];
      readonly done: ReadonlySet<string>;
    };

/** The lessons of one level in order, with the completed ones marked and the next one highlighted. */
@Component({
  selector: 'app-level-page',
  imports: [RouterLink],
  templateUrl: './level-page.html',
  styleUrl: './level-page.css',
})
export class LevelPage {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressService);

  protected readonly level = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('level') as LessonLevel)),
    { requireSync: true },
  );
  protected readonly state = signal<LevelState>({ status: 'loading' });

  protected readonly lessons = computed(() => {
    const current = this.state();
    return current.status === 'ready'
      ? current.catalog
          .filter((lesson) => lesson.level === this.level())
          .sort((a, b) => a.order - b.order)
      : [];
  });

  protected readonly done = computed(() => {
    const current = this.state();
    return current.status === 'ready' ? current.done : new Set<string>();
  });

  protected readonly next = computed(() => {
    const current = this.state();
    return current.status === 'ready'
      ? nextLesson(this.lessons(), current.done, this.level())
      : undefined;
  });

  /** Ids of the lessons with Lichess puzzles; loaded apart, so the list never waits for them. */
  private readonly puzzleLessons = signal<ReadonlySet<string>>(new Set());
  /** "Practise more" at the foot, when a lesson of this level has puzzles. */
  protected readonly hasPuzzles = computed(() =>
    this.lessons().some((lesson) => this.puzzleLessons().has(lesson.id)),
  );

  constructor() {
    const t = () => this.i18n.t();
    inject(PageTitle).showDetail(() => `${t().learn.levels[this.level()].name} · ${t().nav.learn}`);
    void this.load();
    void this.loadPuzzles();
  }

  private async loadPuzzles(): Promise<void> {
    try {
      const { lessons } = await this.content.puzzleCatalog();
      this.puzzleLessons.set(new Set(lessons.map((entry) => entry.lesson)));
    } catch {
      // Without the puzzle catalogue the level shows no link to them.
    }
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const [catalog, rows] = await Promise.all([
        this.content.lessonCatalog(),
        this.progress.lessons(),
      ]);
      this.state.set({
        status: 'ready',
        catalog,
        done: new Set(rows.map((row) => row.lessonId)),
      });
    } catch {
      this.state.set({ status: 'error' });
    }
  }
}
