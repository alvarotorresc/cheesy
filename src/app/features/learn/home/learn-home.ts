import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentService, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService } from '../../../core/progress';
import { byLevelAndOrder, LEVELS, nextLesson } from '../learn-progress';
import { injectPrerenderWait } from '../../../core/prerender';
import { PageLinks } from '../../../core/routing';

type HomeState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly catalog: readonly LessonSummary[];
      readonly done: ReadonlySet<string>;
      /** Puzzles of "Practise more" saved: they are deleted with the lessons. */
      readonly puzzlesSaved: number;
    };

/**
 * The landing of "Learn": a card per level, the glossary and "Practise more", a way to continue
 * where the learner left off, and the action to delete the saved lessons and puzzles after a
 * confirmation.
 */
@Component({
  selector: 'app-learn-home',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './learn-home.html',
  styleUrl: './learn-home.css',
})
export class LearnHome {
  protected readonly links = inject(PageLinks);
  protected readonly i18n = inject(I18nService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  private readonly content = inject(ContentService);
  protected readonly progress = inject(ProgressService);

  protected readonly state = signal<HomeState>({ status: 'loading' });

  /** Result of the last try to delete the progress, announced to screen readers. */
  protected readonly message = signal('');
  /** Lessons with puzzles; the "Practise more" card only shows when there is one. */
  protected readonly puzzleLessons = signal(0);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

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
      ? nextLesson([...current.catalog].sort(byLevelAndOrder), current.done)
      : undefined;
  });

  constructor() {
    this.wait(() => this.load());
    this.wait(() => this.loadPuzzles());

    // Before the lessons, Learn was the glossary, and links to a term (`/learn#pin`, which Netlify
    // now sends to `/en/learn#pin`) are out there. They still land on the term. It happens once the
    // page is on screen, so the prerendered page hydrates as it is.
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const document = inject(DOCUMENT);
    afterNextRender(() => {
      const fragment = route.snapshot.fragment;
      if (!fragment || document.getElementById(fragment)) return;
      void router.navigateByUrl(`${this.links.glossary()}#${encodeURIComponent(fragment)}`, {
        replaceUrl: true,
      });
    });
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
    this.state.set({ status: 'ready', catalog, done: new Set(), puzzlesSaved: 0 });
    await this.refresh();
  }

  /** Reads the saved progress again, keeping the catalogue and the page as they are. */
  private async refresh(): Promise<void> {
    try {
      const [rows, puzzles] = await Promise.all([this.progress.lessons(), this.progress.puzzles()]);
      this.state.update((current) =>
        current.status === 'ready'
          ? {
              ...current,
              done: new Set(rows.map((row) => row.lessonId)),
              puzzlesSaved: puzzles.length,
            }
          : current,
      );
    } catch {
      // The rows shown stay; the message already says whether the deletion worked.
    }
  }

  /** Apart from the lessons: without the puzzle catalogue, Learn works as before. */
  private async loadPuzzles(): Promise<void> {
    try {
      const { lessons } = await this.content.puzzleCatalog();
      this.puzzleLessons.set(lessons.filter((lesson) => lesson.count > 0).length);
    } catch {
      this.puzzleLessons.set(0);
    }
  }

  protected askToClear(): void {
    const current = this.state();
    if (current.status !== 'ready' || (current.done.size === 0 && current.puzzlesSaved === 0)) {
      this.message.set(this.i18n.t().learn.nothingSaved);
      return;
    }
    this.message.set('');
    this.dialog()?.nativeElement.showModal();
  }

  protected cancelClear(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmClear(): Promise<void> {
    this.dialog()?.nativeElement.close();
    const t = this.i18n.t().learn;
    // The puzzles practise the lessons: "Delete progress" in Learn deletes both.
    const [lessons, puzzles] = await Promise.all([
      this.progress.clear('lessons'),
      this.progress.clear('puzzles'),
    ]);
    const cleared = lessons && puzzles;
    // One clear can work and the other fail: the page shows what is stored, not what was hoped.
    await this.refresh();
    this.message.set(cleared ? t.cleared : t.clearFailed);
  }
}
