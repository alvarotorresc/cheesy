import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ContentService, type LessonLevel, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ProgressService } from '../../../core/progress';
import { nextLesson } from '../learn-progress';
import { injectPrerenderWait } from '../../../core/prerender';
import { PageLinks, routeId, routeLang } from '../../../core/routing';
import { Breadcrumbs } from '../../../shared/breadcrumbs';
import { PageMeta } from '../../../core/seo';

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
  imports: [Breadcrumbs, RouterLink],
  templateUrl: './level-page.html',
  styleUrl: './level-page.css',
})
export class LevelPage {
  /** The breadcrumb of the page, once it knows what it shows. */
  protected readonly crumbs = inject(PageMeta).crumbs;
  protected readonly links = inject(PageLinks);
  protected readonly i18n = inject(I18nService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressService);

  private readonly route = inject(ActivatedRoute);
  /** The guard only lets known levels in. */
  protected readonly level = toSignal(
    this.route.paramMap.pipe(
      map(
        (params) =>
          routeId(params, routeLang(this.route.snapshot), 'level', 'level') as LessonLevel,
      ),
    ),
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
    this.wait(() => this.load());
    this.wait(() => this.loadPuzzles());
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
    let catalog: readonly LessonSummary[];
    try {
      catalog = await this.content.lessonCatalog();
    } catch {
      this.state.set({ status: 'error' });
      return;
    }
    // The lessons first, as the prerendered page shows them, and the saved progress when it is read:
    // a page that waited for both would not hydrate the HTML it was sent with.
    this.state.set({ status: 'ready', catalog, done: new Set() });
    const rows = await this.progress.lessons();
    this.state.update((current) =>
      current.status === 'ready'
        ? { ...current, done: new Set(rows.map((row) => row.lessonId)) }
        : current,
    );
  }
}
