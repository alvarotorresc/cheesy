import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Dests, Key } from '@lichess-org/chessground/types';
import {
  PROMOTION_ROLES,
  type BoardLabels,
  type BoardMove,
  type PendingPromotion,
  type PromotionRole,
} from './board.types';

const PROMOTION_GLYPHS: Record<PromotionRole, string> = {
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
};

const isLastRank = (key: Key): boolean => key.endsWith('8') || key.endsWith('1');

/**
 * Presentational chess board backed by chessground. It renders whatever its inputs describe and
 * reports user moves through `move`; the parent decides whether to accept them. After every user
 * move the board re-syncs with its inputs, so a rejected move snaps back.
 */
@Component({
  selector: 'app-board',
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class BoardComponent {
  readonly fen = input.required<string>();
  readonly orientation = input<Color>('white');
  readonly turnColor = input<Color>('white');
  /** Legal destinations per origin square. Only the side in `turnColor` can move. */
  readonly dests = input<Dests>(new Map());
  readonly lastMove = input<readonly Key[] | undefined>(undefined);
  /** Highlights the king of the side to move. */
  readonly check = input(false);
  /** Shows the position without letting the user move. Can be toggled at any time. */
  readonly viewOnly = input(false);
  /** Texts of the promotion picker, already translated. */
  readonly labels = input.required<BoardLabels>();

  readonly move = output<BoardMove>();

  protected readonly promotionRoles = PROMOTION_ROLES;
  protected readonly glyphs = PROMOTION_GLYPHS;
  protected readonly pendingPromotion = signal<PendingPromotion | undefined>(undefined);

  private readonly boardElement = viewChild.required<ElementRef<HTMLElement>>('board');
  private readonly promotionButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('promotionButton');

  /** Bumped after each user move to force a re-sync even when the inputs did not change. */
  private readonly syncRequest = signal(0);

  private readonly config = computed<Config>(() => {
    const viewOnly = this.viewOnly();
    const lastMove = this.lastMove();
    return {
      fen: this.fen(),
      orientation: this.orientation(),
      turnColor: this.turnColor(),
      check: this.check(),
      lastMove: lastMove ? [...lastMove] : undefined,
      // Chessground's own `viewOnly` only takes effect at creation (it skips binding the input
      // events), so view-only mode is emulated with settings that can change later.
      movable: {
        color: viewOnly ? undefined : this.turnColor(),
        dests: new Map(this.dests()),
      },
      draggable: { enabled: !viewOnly },
      selectable: { enabled: !viewOnly },
    };
  });

  private readonly destroyRef = inject(DestroyRef);
  private api: Api | undefined;

  constructor() {
    afterNextRender(() => {
      // Chessground watches the board size itself (ResizeObserver), so it follows the layout.
      const api = Chessground(this.boardElement().nativeElement, {
        ...this.config(),
        animation: { enabled: true, duration: 200 },
        premovable: { enabled: false },
        draggable: { ...this.config().draggable, showGhost: true },
        movable: {
          ...this.config().movable,
          free: false,
          showDests: true,
          events: { after: (from, to) => this.onUserMove(from, to) },
        },
      });
      this.api = api;

      this.destroyRef.onDestroy(() => {
        api.destroy();
        this.api = undefined;
      });
    });

    effect(() => {
      const config = this.config();
      this.syncRequest();
      this.api?.set(config);
    });

    afterRenderEffect(() => {
      if (this.pendingPromotion()) this.promotionButtons()[0]?.nativeElement.focus();
    });
  }

  protected choosePromotion(role: PromotionRole): void {
    const pending = this.pendingPromotion();
    if (!pending) return;
    this.pendingPromotion.set(undefined);
    this.move.emit({ from: pending.from, to: pending.to, promotion: role });
    this.requestSync();
  }

  protected cancelPromotion(): void {
    this.pendingPromotion.set(undefined);
    this.requestSync();
  }

  private onUserMove(from: Key, to: Key): void {
    const piece = this.api?.state.pieces.get(to);
    if (piece?.role === 'pawn' && isLastRank(to)) {
      this.pendingPromotion.set({ from, to, color: piece.color });
      return;
    }
    this.move.emit({ from, to });
    this.requestSync();
  }

  private requestSync(): void {
    this.syncRequest.update((value) => value + 1);
  }
}
