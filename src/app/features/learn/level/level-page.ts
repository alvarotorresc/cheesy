import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentService, type LessonLevel, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
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

  constructor() {
    void this.load();
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
