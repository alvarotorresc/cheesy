import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService } from '../../../core/progress';
import { LEVELS, nextLesson } from '../learn-progress';

type HomeState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly catalog: readonly LessonSummary[];
      readonly done: ReadonlySet<string>;
    };

/** The landing of "Learn": a card per level and a way to continue where the learner left off. */
@Component({
  selector: 'app-learn-home',
  imports: [RouterLink],
  templateUrl: './learn-home.html',
  styleUrl: './learn-home.css',
})
export class LearnHome {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressService);

  protected readonly state = signal<HomeState>({ status: 'loading' });

  protected readonly levels = computed(() => {
    const current = this.state();
    const catalog = current.status === 'ready' ? current.catalog : [];
    return LEVELS.map((level) => ({
      level,
      lessons: catalog.filter((lesson) => lesson.level === level),
    }));
  });

  protected readonly continueWith = computed(() => {
    const current = this.state();
    return current.status === 'ready' && current.done.size
      ? nextLesson(
          [...current.catalog].sort(
            (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order,
          ),
          current.done,
        )
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
