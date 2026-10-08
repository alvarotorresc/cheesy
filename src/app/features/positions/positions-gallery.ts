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
import { RouterLink } from '@angular/router';
import type { CuratedPosition } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { ProgressService, type PositionProgress } from '../../core/progress';
import { Icon } from '../../shared/icon';
import { frameFromFen, MiniBoard, type MiniFrame } from '../../shared/mini-board';
import { sideToPlayLabel } from './position-labels';
import {
  activeFilterCount,
  groupOf,
  matchesFilters,
  MOVE_GROUPS,
  NO_FILTERS,
  statusOf,
  type MoveGroup,
  type OwnFilter,
  type PositionFilters,
  type PositionStatus,
  type SideFilter,
  type StatusFilter,
} from './position-filters';
import { PositionList } from './position-list';
import { playerMoveCount } from './position-order';
import { injectPrerenderWait } from '../../core/prerender';

interface Card {
  readonly position: CuratedPosition;
  /** Number in the URL: place in the whole gallery, whatever the filters hide. */
  readonly number: number;
  /** Moves of the player. */
  readonly own: number;
  readonly status: PositionStatus;
  readonly frames: readonly MiniFrame[];
  /** Order of appearance, to stagger the entrance of the cards. */
  readonly order: number;
}

interface Group {
  readonly id: MoveGroup;
  readonly cards: readonly Card[];
}

/**
 * Gallery of the curated tactical positions, from fewest to most moves of the player. It shows
 * only the side to play and the number of moves: the name, themes and game of a position are a
 * spoiler, so they stay out until the position is solved or its solution is asked for.
 */
@Component({
  selector: 'app-positions-gallery',
  imports: [RouterLink, Icon, MiniBoard],
  templateUrl: './positions-gallery.html',
  styleUrl: './positions-gallery.css',
  providers: [PositionList],
  host: { class: 'catalog' },
})
export class PositionsGallery {
  protected readonly i18n = inject(I18nService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  protected readonly list = inject(PositionList);
  protected readonly progress = inject(ProgressService);

  protected readonly skeletons = [0, 1, 2, 3];
  protected readonly sideToPlayLabel = sideToPlayLabel;

  protected readonly filters = signal<PositionFilters>(NO_FILTERS);
  protected readonly foldOpen = signal(false);
  /** Set once the filters change, so the cards come in with a short fade (never on first load). */
  protected readonly entering = signal(false);
  /** Bumped on every change of filters: new cards are drawn, and their entrance plays again. */
  protected readonly generation = signal(0);
  protected readonly message = signal('');

  /** Saved rows by content id; undefined until they are read. */
  private readonly rows = signal<ReadonlyMap<string, PositionProgress> | undefined>(undefined);
  private loads = 0;

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  // Not waiting for the saved progress: the prerendered page shows the gallery without it, and a
  // first render that waited would not hydrate that HTML. The marks appear when it is read.
  protected readonly ready = computed(() => this.list.status() === 'ready');
  protected readonly failed = computed(() => this.list.status() === 'error');

  /** One frame per position, kept while the rows change so the boards are not redrawn. */
  private readonly frames = computed(
    () => new Map(this.list.positions().map((p) => [p.id, [frameFromFen(p.fen)]])),
  );

  private readonly cards = computed<readonly Card[]>(() => {
    const rows = this.rows();
    const frames = this.frames();
    return this.list.positions().map((position, index) => ({
      position,
      number: index + 1,
      own: playerMoveCount(position),
      status: statusOf(rows?.get(position.id)),
      frames: frames.get(position.id) ?? [],
      order: 0,
    }));
  });

  private readonly visible = computed(() =>
    this.cards().filter((card) => matchesFilters(card.position, card.status, this.filters())),
  );

  protected readonly groups = computed<readonly Group[]>(() => {
    let order = 0;
    return MOVE_GROUPS.map((id) => ({
      id,
      cards: this.visible()
        .filter((card) => groupOf(card.position) === id)
        .map((card) => ({ ...card, order: order++ })),
    })).filter((group) => group.cards.length > 0);
  });

  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  protected readonly resultCount = computed(() => {
    const cards = this.cards();
    const solved = cards.filter((card) => card.status !== 'none').length;
    return this.i18n.t().positions.resultCount(this.visible().length, cards.length, solved);
  });

  constructor() {
    // Read the rows again whenever progress changes (deleted from here, or saved by an exercise).
    effect(() => {
      this.progress.revision();
      untracked(() => this.wait(() => this.loadRows()));
    });
  }

  protected groupTitle(id: MoveGroup): string {
    const t = this.i18n.t().positions;
    return id === 1 ? t.groupOne : id === 2 ? t.groupTwo : t.groupThree;
  }

  protected statusText(status: PositionStatus): string {
    const t = this.i18n.t().positions;
    return status === 'first'
      ? t.firstTryStatus
      : status === 'solved'
        ? t.solvedStatus
        : t.unsolved;
  }

  protected cardLabel(card: Card): string {
    const t = this.i18n.t().positions;
    return t.cardLabel(
      card.number,
      this.cards().length,
      sideToPlayLabel(card.position.playerSide, t),
      t.ownMoves(card.own),
      this.statusText(card.status),
    );
  }

  protected setSide(side: SideFilter): void {
    this.change({ ...this.filters(), side });
  }

  protected setOwn(own: OwnFilter): void {
    this.change({ ...this.filters(), own });
  }

  protected setStatus(status: StatusFilter): void {
    this.change({ ...this.filters(), status });
  }

  protected clearFilters(): void {
    this.change(NO_FILTERS);
  }

  protected toggleFold(): void {
    this.foldOpen.update((open) => !open);
  }

  protected async askToClear(): Promise<void> {
    // The gallery shows before the saved progress is read: wait for it rather than say "nothing".
    if (!this.rows()) await this.loadRows();
    if (this.rows()?.size) {
      this.message.set('');
      this.dialog()?.nativeElement.showModal();
    } else {
      this.message.set(this.i18n.t().positions.nothingToClear);
    }
  }

  protected closeDialog(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmClear(): Promise<void> {
    const cleared = await this.progress.clear('positions');
    this.closeDialog();
    const t = this.i18n.t().positions;
    this.message.set(cleared ? t.progressCleared : t.clearFailed);
  }

  private change(filters: PositionFilters): void {
    this.filters.set(filters);
    this.entering.set(true);
    this.generation.update((value) => value + 1);
  }

  private async loadRows(): Promise<void> {
    const load = ++this.loads;
    const rows = await this.progress.positions();
    if (load === this.loads) this.rows.set(new Map(rows.map((row) => [row.positionId, row])));
  }
}
