import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContentService, startingWith, type EndgamePosition } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { ProgressService } from '../../core/progress';
import { Icon } from '../../shared/icon';
import { frameFromFen, MiniBoard, type MiniFrame } from '../../shared/mini-board';
import {
  applyFilters,
  groupByCategory,
  NO_FILTERS,
  pieceCount,
  type EndgameFilters,
  type GoalFilter,
} from './endgame-catalog';
import { fill } from './endgame-goal';
import { PageLinks } from '../../core/routing';
import { CategoryAbout } from '../../shared/category-about';

interface Card {
  readonly endgame: EndgamePosition;
  readonly frames: readonly MiniFrame[];
  readonly pieces: number;
  readonly done: boolean;
  /** Position in the list, for the staggered entrance of the seals. */
  readonly index: number;
}

/**
 * The list of endgames: filters by kind and goal, one shelf per category with a static board on
 * every card, and the endgames the player has passed (kept only in this browser).
 */
@Component({
  selector: 'app-endgames',
  imports: [CategoryAbout, RouterLink, Icon, MiniBoard],
  templateUrl: './endgames.html',
  styleUrl: './endgames.css',
  host: { class: 'catalog' },
})
export class Endgames {
  protected readonly links = inject(PageLinks);
  protected readonly i18n = inject(I18nService);
  protected readonly progress = inject(ProgressService);
  private readonly content = inject(ContentService);

  private readonly endgamesRef = resource({ loader: () => this.content.endgames() });
  /** Starts with the endgames a prerendered page carries, so it hydrates as it was rendered. */
  protected readonly endgames = startingWith(this.endgamesRef, this.content.loadedEndgames());
  private readonly passed = resource({
    params: () => this.progress.revision(),
    loader: () => this.progress.endgames(),
  });

  protected readonly filters = signal<EndgameFilters>(NO_FILTERS);
  /** The seals grow in when the progress first paints, not while the filters change. */
  protected readonly reveal = signal(true);
  protected readonly message = signal('');
  /** `?category=<English name>` opens the list on that category; an unknown one filters nothing. */
  private pendingCategory = inject(ActivatedRoute).snapshot.queryParamMap.get('category');

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  private readonly all = computed(() => (this.endgames.hasValue() ? this.endgames.value() : []));
  protected readonly categories = computed(() => groupByCategory(this.all()));
  protected readonly total = computed(() => this.all().length);

  /** Ids of the passed endgames that still exist in the content. */
  private readonly doneIds = computed(() => {
    const known = new Set(this.all().map((endgame) => endgame.id));
    const rows = this.passed.hasValue() ? this.passed.value() : [];
    return new Set(rows.map((row) => row.endgameId).filter((id) => known.has(id)));
  });
  protected readonly doneCount = computed(() => this.doneIds().size);

  private readonly cards = computed(() => {
    const done = this.doneIds();
    return new Map<string, Card>(
      this.all().map((endgame, index) => [
        endgame.id,
        {
          endgame,
          frames: [frameFromFen(endgame.fen)],
          pieces: pieceCount(endgame.fen),
          done: done.has(endgame.id),
          index,
        },
      ]),
    );
  });

  protected readonly groups = computed(() => {
    const cards = this.cards();
    return groupByCategory(applyFilters(this.all(), this.filters())).map((group) => {
      const list = group.endgames.map((endgame) => cards.get(endgame.id)!);
      return {
        key: group.key,
        name: group.name,
        cards: list,
        done: list.filter((c) => c.done).length,
      };
    });
  });

  protected readonly visibleCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.cards.length, 0),
  );
  protected readonly filtered = computed(
    () => this.filters().category !== 'all' || this.filters().goal !== 'all',
  );

  constructor() {
    effect(() => {
      const keys = this.categories().map((group) => group.key);
      if (this.pendingCategory === null || keys.length === 0) return;
      const category = this.pendingCategory;
      this.pendingCategory = null;
      if (keys.includes(category)) {
        untracked(() => this.filters.update((filters) => ({ ...filters, category })));
      }
    });
  }

  protected reloadEndgames(): void {
    this.endgamesRef.reload();
  }

  protected countOf(category: string): number {
    return category === 'all'
      ? this.total()
      : this.all().filter((endgame) => endgame.category.en === category).length;
  }

  protected countText(count: number): string {
    const t = this.i18n.t().endgames;
    return count === 1 ? t.countOne : fill(t.countMany, { n: count });
  }

  protected doneNumbers(): string {
    return fill(this.i18n.t().endgames.doneSummary, { n: this.doneCount(), total: this.total() });
  }

  protected resultCount(): string {
    const t = this.i18n.t().endgames;
    const count = this.visibleCount();
    return count === this.total()
      ? fill(t.countAll, { n: count })
      : fill(t.countSome, { n: this.countText(count), total: this.total() });
  }

  protected groupCount(group: { cards: readonly Card[]; done: number }): string {
    const t = this.i18n.t().endgames;
    const count = this.countText(group.cards.length);
    return group.done ? `${count}, ${fill(t.groupDone, { n: group.done })}` : count;
  }

  protected cardLabel(card: Card): string {
    const t = this.i18n.t().endgames;
    return fill(t.cardLabel, {
      name: this.i18n.localize(card.endgame.name),
      pieces: card.pieces === 1 ? t.piecesOne : fill(t.piecesMany, { n: card.pieces }),
      view: card.endgame.playerSide === 'black' ? t.blackView : '',
    });
  }

  protected setCategory(category: string): void {
    this.filters.update((filters) => ({ ...filters, category }));
    this.reveal.set(false);
  }

  protected setGoal(goal: GoalFilter): void {
    this.filters.update((filters) => ({ ...filters, goal }));
    this.reveal.set(false);
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
    this.reveal.set(false);
  }

  protected askToClear(): void {
    if (this.doneCount() === 0) {
      this.message.set(this.i18n.t().endgames.nothingSaved);
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
    const t = this.i18n.t().endgames;
    this.message.set((await this.progress.clear('endgames')) ? t.cleared : t.clearFailed);
  }
}
