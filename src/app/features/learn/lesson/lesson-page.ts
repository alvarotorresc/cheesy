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
  type GlossaryTerm,
  type Lesson,
  type LessonLevel,
  type LessonSummary,
} from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { PageTitle } from '../../../core/page-title';
import { ProgressService } from '../../../core/progress';
import { BoardSpotlight } from '../../../shared/board';
import { lessonAfter } from '../learn-progress';
import { isFormField } from '../../../shared/keyboard';
import { ChoiceStepView } from './steps/choice-step';
import { ExplainStepView } from './steps/explain-step';
import { FindMoveStepView } from './steps/find-move-step';
import { PlayOutStepView } from './steps/play-out-step';
import { ReachStepView } from './steps/reach-step';
import { TapSquareStepView } from './steps/tap-square-step';
import { injectPrerenderWait } from '../../../core/prerender';

type LessonState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'notFound' }
  | {
      readonly status: 'ready';
      readonly lesson: Lesson;
      readonly terms: readonly GlossaryTerm[];
      /** The lesson after this one: in its level or, after its last one, in the next level. */
      readonly next?: LessonSummary;
    };

/** No step has the focus yet, but the next heading to show must take it. */
const NO_STEP = -1;

/** Where "Practise" leads after a lesson; undefined when the lesson has nowhere to practise. */
const practiceLink = (
  lesson: Lesson,
): { path: string; queryParams?: Record<string, string> } | undefined => {
  const next = lesson.next;
  switch (next?.kind) {
    // The endgame list opens on the category named by its English name.
    case 'endgames':
      return { path: '/endgames', queryParams: { category: next.category } };
    case 'positions':
      return { path: '/positions' };
    case 'openings':
      return { path: '/openings' };
    default:
      return undefined;
  }
};

/**
 * One lesson, a step at a time. Exercises must be done before going on; the first result of each
 * one is what counts. Reaching the summary completes the lesson and saves it; leaving earlier
 * saves nothing, so the lesson starts again next time.
 */
@Component({
  selector: 'app-lesson-page',
  imports: [
    ChoiceStepView,
    ExplainStepView,
    FindMoveStepView,
    NgTemplateOutlet,
    PlayOutStepView,
    ReachStepView,
    RouterLink,
    TapSquareStepView,
  ],
  providers: [BoardSpotlight],
  templateUrl: './lesson-page.html',
  styleUrl: './lesson-page.css',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class LessonPage {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  private readonly progress = inject(ProgressService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly params = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => ({ level: params.get('level') ?? '', id: params.get('lesson') ?? '' })),
    ),
    { requireSync: true },
  );
  /** The guard only lets known levels in. */
  protected readonly level = computed(() => this.params().level as LessonLevel);

  protected readonly state = signal<LessonState>({ status: 'loading' });
  protected readonly lesson = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.lesson : undefined;
  });
  protected readonly steps = computed(() => this.lesson()?.steps ?? []);
  protected readonly index = signal(0);
  /** Step index → whether it was done at the first try. Only the first result of a step counts. */
  protected readonly outcomes = signal<ReadonlyMap<number, boolean>>(new Map());

  protected readonly onSummary = computed(
    () => this.lesson() !== undefined && this.index() === this.steps().length,
  );
  protected readonly step = computed(() => this.steps()[this.index()]);
  protected readonly exercises = computed(
    () => this.steps().filter((step) => step.kind !== 'explain').length,
  );
  protected readonly firstTries = computed(
    () => [...this.outcomes().values()].filter(Boolean).length,
  );
  protected readonly canGoBack = computed(() => this.index() > 0);
  protected readonly canGoOn = computed(() => {
    const step = this.step();
    return step !== undefined && (step.kind === 'explain' || this.outcomes().has(this.index()));
  });
  protected readonly isLast = computed(() => this.index() === this.steps().length - 1);
  /** Lessons with Lichess puzzles; loaded apart, so a lesson never waits for them. */
  private readonly puzzleLessons = signal<ReadonlySet<string>>(new Set());
  protected readonly hasPuzzles = computed(() => {
    const lesson = this.lesson();
    return lesson !== undefined && this.puzzleLessons().has(lesson.id);
  });
  /**
   * "Practise more" takes the place of "Practise" when that leads to Positions, which is not by
   * theme; a practice of endgames is another kind of practice and stays next to it.
   */
  protected readonly practice = computed(() => {
    const lesson = this.lesson();
    if (!lesson || (this.hasPuzzles() && lesson.next?.kind === 'positions')) return undefined;
    return practiceLink(lesson);
  });

  /** The index of the step whose heading has the focus, so the first render keeps the page's. */
  private focusedIndex: number | undefined;
  /** A lesson has been shown on this page already. */
  private shownOnce = false;
  /** Whether this arrival at the summary was already saved. */
  private saved = false;

  constructor() {
    // "El caballo · Aprender": the lesson once it is loaded, the section until then.
    inject(PageTitle).showDetail(() => {
      const lesson = this.lesson();
      return lesson && `${this.i18n.localize(lesson.title)} · ${this.i18n.t().nav.learn}`;
    });
    // The first lesson starts loading here, not in the effect: effects run with the first render,
    // which would then show the loading state instead of the prerendered lesson it hydrates.
    let requested = this.params().id;
    this.wait(() => this.load(requested));
    effect(() => {
      const id = this.params().id;
      if (id === requested) return;
      requested = id;
      untracked(() => this.wait(() => this.load(id)));
    });
    this.wait(() => this.loadPuzzles());

    effect(() => {
      if (!this.onSummary()) {
        this.saved = false;
        return;
      }
      if (this.saved) return;
      this.saved = true;
      const lesson = this.lesson()!;
      const result = {
        lessonId: lesson.id,
        exercises: this.exercises(),
        firstTry: this.firstTries(),
      };
      untracked(() => void this.progress.recordLesson(result));
    });

    // A new step moves the focus to its heading, so keyboard and screen reader users follow it.
    afterRenderEffect(() => {
      const index = this.index();
      const ready = this.lesson() !== undefined;
      if (!ready || index === this.focusedIndex) return;
      const heading = this.host.nativeElement.querySelector<HTMLElement>('[data-step-heading]');
      if (!heading) return;
      if (this.focusedIndex !== undefined) heading.focus();
      this.focusedIndex = index;
    });
  }

  protected async load(id: string): Promise<void> {
    this.state.set({ status: 'loading' });
    this.index.set(0);
    this.outcomes.set(new Map());
    // The first lesson of the visit keeps the focus where the page put it; one reached by a link
    // from another lesson (the same page, new address) gets it on its title, like a new step.
    this.focusedIndex = this.shownOnce ? NO_STEP : undefined;
    try {
      const [lesson, catalog] = await Promise.all([
        this.content.lesson(id),
        this.content.lessonCatalog(),
      ]);
      if (id !== this.params().id) return;
      if (!lesson) {
        this.state.set({ status: 'notFound' });
        return;
      }
      const terms = await Promise.all(
        lesson.terms.map((term) => this.content.glossaryTerm(term).catch(() => undefined)),
      );
      if (id !== this.params().id) return;
      this.shownOnce = true;
      this.state.set({
        status: 'ready',
        lesson,
        terms: terms.filter((term) => term !== undefined),
        next: lessonAfter(catalog, lesson),
      });
    } catch {
      if (id === this.params().id) this.state.set({ status: 'error' });
    }
  }

  private async loadPuzzles(): Promise<void> {
    try {
      const { lessons } = await this.content.puzzleCatalog();
      this.puzzleLessons.set(new Set(lessons.map((entry) => entry.lesson)));
    } catch {
      // Without the puzzle catalogue the summary shows no link to them.
    }
  }

  protected retry(): void {
    void this.load(this.params().id);
  }

  protected previous(): void {
    if (this.canGoBack()) this.index.update((index) => index - 1);
  }

  protected next(): void {
    if (this.canGoOn()) this.index.update((index) => index + 1);
  }

  protected onDone(index: number, result: { firstTry: boolean }): void {
    this.outcomes.update((outcomes) =>
      outcomes.has(index) ? outcomes : new Map(outcomes).set(index, result.firstTry),
    );
  }

  protected onKey(event: KeyboardEvent): void {
    // Alt + arrow is the browser's back and forward: leave it alone.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (this.lesson() === undefined || isFormField(event.target)) return;
    if (event.key === 'ArrowLeft') this.previous();
    else if (event.key === 'ArrowRight') this.next();
  }
}
