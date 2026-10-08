import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injector,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { Location, ViewportScroller } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
} from '@angular/router';
import { ContentService, startingWith, type LessonSummary } from '../../../core/content';
import {
  GLOSSARY_GROUPS,
  type GlossaryLevel,
  type GlossaryTerm,
} from '../../../core/content/content.types';
import { I18nService } from '../../../core/i18n';
import { frameFromFen, MiniBoard, type MiniFrame } from '../../../shared/mini-board';
import { RichTextView } from '../../../shared/rich-text';
import {
  applyFilters,
  filtersFromParams,
  GLOSSARY_LEVELS,
  groupCounts,
  groupTerms,
  NO_FILTERS,
  paramsOf,
  type GlossaryFilters,
  type GroupFilter,
  type LevelFilter,
} from './glossary-catalog';
import { TermHints } from './term-hints';
import { PageLinks } from '../../../core/routing';

/** How long the card of the address keeps its ring after the page has taken the reader to it. */
export const ARRIVAL_MS = 2200;
/** Room left above a card the page scrolls to: the `scroll-margin-top` of the cards (1.5rem). */
const ARRIVAL_MARGIN_REM = 1.5;

const LEVEL_RANK: Record<GlossaryLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/**
 * Every glossary term, by family: a search box, family chips and a level switch (all three kept in
 * the address), and a card per term with a large board, its level and the lesson that teaches it.
 * A link to `#term` takes the reader to that card and rings it for a moment.
 */
@Component({
  selector: 'app-glossary-page',
  imports: [MiniBoard, RichTextView, RouterLink, TermHints],
  templateUrl: './glossary-page.html',
  styleUrl: './glossary-page.css',
  host: { class: 'catalog', '(click)': 'onClick($event)' },
})
export class GlossaryPage {
  protected readonly links = inject(PageLinks);
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly fragment = toSignal(this.route.fragment);

  protected readonly groupKeys = GLOSSARY_GROUPS;
  protected readonly levels = GLOSSARY_LEVELS;
  protected readonly levelRank = LEVEL_RANK;

  private readonly glossaryRef = resource({ loader: () => this.content.glossary() });
  // Both start with what a prerendered page carries, so it hydrates as it was rendered.
  protected readonly glossary = startingWith(this.glossaryRef, this.content.loadedGlossary());
  private readonly lessons = startingWith(
    resource({ loader: () => this.content.lessonCatalog() }),
    this.content.loadedLessonCatalog(),
  );

  protected readonly filters = signal<GlossaryFilters>(
    filtersFromParams(this.route.snapshot.queryParamMap),
  );
  /** Id of the card the reader has just been taken to (it wears the accent ring for a moment). */
  protected readonly arrived = signal<string | null>(null);

  protected readonly all = computed<readonly GlossaryTerm[]>(() =>
    this.glossary.hasValue() ? this.glossary.value() : [],
  );
  private readonly lessonById = computed(
    () =>
      new Map<string, LessonSummary>(
        (this.lessons.hasValue() ? this.lessons.value() : []).map((lesson) => [lesson.id, lesson]),
      ),
  );
  protected readonly visible = computed(() =>
    applyFilters(this.all(), this.filters(), this.i18n.lang()),
  );
  protected readonly groups = computed(() => groupTerms(this.visible(), this.i18n.lang()));
  protected readonly counts = computed(() =>
    groupCounts(this.all(), this.filters(), this.i18n.lang()),
  );
  protected readonly filtered = computed(() => {
    const { group, level, query } = this.filters();
    return group !== 'all' || level !== 'all' || query.trim() !== '';
  });
  protected readonly resultCount = computed(() => {
    const g = this.i18n.t().glossary;
    const total = this.all().length;
    const shown = this.visible().length;
    return shown === total ? g.count(total) : g.countSome(shown, total);
  });

  /** Both the terms and the lessons have answered: nothing will push the cards down any more. */
  private readonly settled = computed(() => this.glossary.hasValue() && !this.lessons.isLoading());

  private arrivalTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly frames = new Map<string, readonly MiniFrame[]>();

  constructor() {
    // Back and forward between entries of this page: the filters follow the address again. Other
    // navigations do not re-read it, because a link to a term drops the query on purpose.
    let popstate = false;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) popstate = event.navigationTrigger === 'popstate';
      else if (event instanceof NavigationEnd && popstate) {
        popstate = false;
        this.filters.set(filtersFromParams(this.route.snapshot.queryParamMap));
      }
    });
    // The terms arrive after the router has finished, so its own anchor scrolling finds nothing:
    // once they are drawn (and every later link to a term of this page), the page goes to the card.
    effect(() => {
      const id = this.fragment();
      if (id && this.settled()) untracked(() => this.reveal(id));
    });
    // The router scrolls to the anchor of a link itself, after the page: leave it the same room.
    const scroller = inject(ViewportScroller);
    scroller.setOffset(() => [0, ARRIVAL_MARGIN_REM * this.remPx()]);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.arrivalTimer);
      scroller.setOffset([0, 0]);
    });
  }

  protected reloadGlossary(): void {
    this.glossaryRef.reload();
  }

  private remPx(): number {
    const view = this.document.defaultView;
    return parseFloat(view?.getComputedStyle(this.document.documentElement).fontSize ?? '') || 16;
  }

  protected frameOf(term: GlossaryTerm): readonly MiniFrame[] {
    let frames = this.frames.get(term.id);
    if (!frames) {
      frames = [frameFromFen(term.example.fen)];
      this.frames.set(term.id, frames);
    }
    return frames;
  }

  protected lessonOf(term: GlossaryTerm): LessonSummary | undefined {
    return term.lesson ? this.lessonById().get(term.lesson) : undefined;
  }

  /**
   * A link to the term the address already names is the same URL to the router, which ignores it:
   * the page takes the reader to that card itself.
   */
  protected onClick(event: MouseEvent): void {
    const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a.term');
    const id = link?.hash.slice(1);
    if (id && id === this.fragment()) this.reveal(id);
  }

  protected setGroup(group: GroupFilter): void {
    this.update({ group });
  }

  protected setLevel(level: LevelFilter): void {
    this.update({ level });
  }

  protected setQuery(query: string): void {
    this.update({ query });
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
    this.writeAddress();
  }

  private update(patch: Partial<GlossaryFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...patch }));
    this.writeAddress();
  }

  /**
   * Keeps the filters in the address without a navigation: a navigation would scroll the window
   * to the top on every key typed in the search box.
   */
  private writeAddress(fragment?: string): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: paramsOf(this.filters()),
      ...(fragment ? { fragment } : {}),
    });
    // Keeps the router's history state, so Back still restores the scroll position.
    this.location.replaceState(this.router.serializeUrl(tree), '', this.location.getState());
  }

  /** Takes the reader to the card of a term, first clearing the filters that hide it. */
  private reveal(id: string): void {
    const term = this.all().find((t) => t.id === id);
    if (!term) return;
    if (!this.visible().some((t) => t.id === id)) this.filters.set(NO_FILTERS);
    // A link from a definition drops the query of the address: write the filters back.
    this.writeAddress(id);
    clearTimeout(this.arrivalTimer);
    this.arrived.set(id);
    this.arrivalTimer = setTimeout(() => this.arrived.set(null), ARRIVAL_MS);
    afterNextRender(
      () => {
        const card = this.document.getElementById(id);
        if (!card) return;
        const still = this.document.defaultView?.matchMedia?.(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        card.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
        card.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
