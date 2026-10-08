import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ContentService, type OpeningSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService, type LineProgress, type ProgressColor } from '../../../core/progress';
import { Icon } from '../../../shared/icon';
import { OpeningCard } from '../opening-card/opening-card';
import {
  activeFilterCount,
  familiesOf,
  FIRST_MOVES,
  matchesFilters,
  NO_FILTERS,
  type OpeningFilters,
} from '../opening-filters';
import { familyOf, groupByFamily } from '../opening-families';
import { summarizeByColor, type ColorProgress, type OpeningStatus } from '../opening-progress';
import { injectPrerenderWait } from '../../../core/prerender';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; catalog: readonly OpeningSummary[] };

type Summary = Record<ProgressColor, ColorProgress>;

/**
 * Catalogue of openings: filters by first move and family, side and progress, and a shelf of live
 * cards for each family. Each card leads to Play and to Practise. Only the openings with saved
 * progress have their tree downloaded, to count their lines as they are now.
 */
@Component({
  selector: 'app-opening-list',
  imports: [Icon, OpeningCard],
  templateUrl: './opening-list.html',
  styleUrl: './opening-list.css',
  host: { class: 'catalog' },
})
export class OpeningList {
  protected readonly i18n = inject(I18nService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  protected readonly progressService = inject(ProgressService);
  private readonly content = inject(ContentService);

  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly filters = signal<OpeningFilters>(NO_FILTERS);
  /** The filters fold behind a button on a phone. */
  protected readonly filtersOpen = signal(false);
  /** Progress of each opening that has any, by opening id. */
  protected readonly progress = signal<ReadonlyMap<string, Summary>>(new Map());
  protected readonly hasProgress = signal(false);
  protected readonly clearing = signal(false);
  protected readonly message = signal('');

  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  protected readonly catalog = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.catalog : [];
  });

  protected readonly visible = computed(() => {
    const filters = this.filters();
    const progress = this.progress();
    return this.catalog().filter((opening) =>
      matchesFilters(opening, filters, progress.get(opening.id)),
    );
  });

  protected readonly groups = computed(() => groupByFamily(this.visible()));

  /** First moves with their families, only those the catalogue has. */
  protected readonly clusters = computed(() => {
    const present = new Set(this.catalog().map((opening) => familyOf(opening.eco)));
    return FIRST_MOVES.map((move) => ({
      move,
      families: familiesOf(move).filter((family) => present.has(family)),
    })).filter((cluster) => cluster.families.length > 0);
  });

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private progressGeneration = 0;

  constructor() {
    this.wait(() => this.load());
    // Reads the progress again whenever it changes, such as after deleting it.
    effect(() => {
      this.progressService.revision();
      untracked(() => this.wait(() => this.loadProgress()));
    });
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      this.state.set({ status: 'ready', catalog: await this.content.openingCatalog() });
    } catch (error) {
      console.error(error);
      this.state.set({ status: 'error' });
    }
  }

  protected setScope(scope: OpeningFilters['scope']): void {
    this.filters.update((filters) => ({ ...filters, scope }));
  }

  protected setSide(value: string): void {
    const side = value === 'white' || value === 'black' ? value : 'all';
    this.filters.update((filters) => ({ ...filters, side }));
  }

  protected setStatus(value: string): void {
    const status: OpeningStatus | 'all' =
      value === 'none' || value === 'progress' || value === 'mastered' ? value : 'all';
    this.filters.update((filters) => ({ ...filters, status }));
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected askToClear(): void {
    this.message.set('');
    if (!this.hasProgress()) {
      this.message.set(this.i18n.t().openings.noProgress);
      return;
    }
    this.dialog()?.nativeElement.showModal();
  }

  protected cancelClear(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmClear(): Promise<void> {
    this.clearing.set(true);
    const cleared = await this.progressService.clear('openings');
    this.clearing.set(false);
    this.dialog()?.nativeElement.close();
    const t = this.i18n.t().practice;
    this.message.set(cleared ? t.cleared : t.clearFailed);
  }

  /**
   * Progress is a bonus: an opening that cannot be downloaded is shown without it, and the saved
   * progress can still be deleted.
   */
  private async loadProgress(): Promise<void> {
    const generation = ++this.progressGeneration;
    const rows = await this.progressService.lines();
    if (generation !== this.progressGeneration) return;
    this.hasProgress.set(rows.length > 0);
    const byOpening = new Map<string, LineProgress[]>();
    for (const row of rows)
      byOpening.set(row.openingId, [...(byOpening.get(row.openingId) ?? []), row]);
    const results = await Promise.allSettled(
      [...byOpening].map(async ([id, openingRows]) => {
        const book = await this.content.openingBook(id);
        return book ? ([id, summarizeByColor(book, openingRows)] as const) : undefined;
      }),
    );
    if (generation !== this.progressGeneration) return;
    const entries: (readonly [string, Summary])[] = [];
    for (const result of results) {
      if (result.status === 'rejected') console.error(result.reason);
      else if (result.value) entries.push(result.value);
    }
    this.progress.set(new Map(entries));
  }
}
