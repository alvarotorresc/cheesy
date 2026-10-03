import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { DrawBrushes } from '@lichess-org/chessground/draw';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Dests, Key } from '@lichess-org/chessground/types';
import {
  PROMOTION_ROLES,
  type BoardArrow,
  type BoardLabels,
  type BoardMark,
  type BoardMove,
  type BoardRing,
  type PendingPromotion,
  type PromotionRole,
} from './board.types';
import { isCursorKey, moveCursor, startSquare } from './cursor';
import { BoardSpotlight, resolveSpot } from './spotlight';

const PROMOTION_GLYPHS: Record<PromotionRole, string> = {
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
};

const isLastRank = (key: Key): boolean => key.endsWith('8') || key.endsWith('1');

/** Pieces jump instead of sliding when the user asks the system for less motion. */
const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Brush of the best move arrow. The colour is remapped to a theme token in board.css. */
const BEST_BRUSH = { key: 'best', color: '#15781b', opacity: 0.82, lineWidth: 11 };

/** Brush of the arrow of a pointed move. Remapped to a theme token in board.css. */
const SPOT_BRUSH = { key: 'spot', color: '#2f6fb3', opacity: 0.7, lineWidth: 9 };

/** Something the board says through its live region. `id` lets the same text be said twice. */
interface Announcement {
  readonly id: number;
  readonly text: string;
}

/**
 * Presentational chess board backed by chessground. It renders whatever its inputs describe and
 * reports user moves through `move`; the parent decides whether to accept them. After every user
 * move the board re-syncs with its inputs, so a rejected move snaps back.
 *
 * It can also be played with the keyboard: the board is one tab stop, the arrows move a cursor over
 * the squares, Enter or Space picks a piece and plays it, and Escape drops it. The moves go through
 * chessground's own selection, so they reach `move` the same way as with the mouse.
 */
@Component({
  selector: 'app-board',
  templateUrl: './board.html',
  styleUrl: './board.css',
  host: {
    '[class.ring-accent]': "ring() === 'accent'",
    '[class.ring-danger]': "ring() === 'danger'",
  },
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
  /** Arrows drawn by the app, not by the user. */
  readonly arrows = input<readonly BoardArrow[]>([]);
  /** Squares painted with one of the board's marks. */
  readonly marks = input<ReadonlyMap<Key, BoardMark>>(new Map());
  /** Ring around the whole board. */
  readonly ring = input<BoardRing>('none');
  /** Draws the file and rank letters inside the edge squares. Read when the board is created. */
  readonly coordinates = input(true);

  readonly move = output<BoardMove>();

  protected readonly promotionRoles = PROMOTION_ROLES;
  protected readonly glyphs = PROMOTION_GLYPHS;
  /**
   * Promotion waiting for the user to pick a piece. A new position (the user browsed the moves, or
   * the game changed) closes it: its squares belong to the position it was opened on.
   */
  protected readonly pendingPromotion = linkedSignal<string, PendingPromotion | undefined>({
    source: this.fen,
    computation: () => undefined,
  });

  /** Square under the keyboard cursor. Unset until the board first gets the focus. */
  private readonly cursor = signal<Key | undefined>(undefined);
  protected readonly announcement = signal<Announcement>({ id: 0, text: '' });

  private readonly boardElement = viewChild.required<ElementRef<HTMLElement>>('board');
  private readonly promotionButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('promotionButton');

  /** Bumped after each user move to force a re-sync even when the inputs did not change. */
  private readonly syncRequest = signal(0);

  private readonly spotlight = inject(BoardSpotlight, { optional: true });
  private readonly spot = computed(() => resolveSpot(this.spotlight?.request(), this.fen()));

  /**
   * Squares and shapes drawn over the position. They are applied without `fen`: chessground resets
   * its pieces from the fen it is given, which would snap back a pawn waiting for its promotion
   * every time a text is pointed at.
   */
  private readonly overlay = computed<Config>(() => {
    const spot = this.spot();
    // The marks of the page go after the pointed squares, so they win on a shared square.
    const custom = new Map<Key, string>([
      ...spot.squares.map((square) => [square as Key, 'mark-spot'] as const),
      ...[...this.marks()].map(([key, mark]) => [key, `mark-${mark}`] as const),
    ]);
    // The cursor is a ring added to whatever the square already has; board.css only shows it
    // while the board has the keyboard focus.
    const cursor = this.cursor();
    if (cursor) custom.set(cursor, [custom.get(cursor), 'mark-cursor'].filter(Boolean).join(' '));
    return {
      highlight: { custom },
      drawable: {
        autoShapes: [
          ...this.arrows().map((arrow) => ({
            orig: arrow.from,
            dest: arrow.to,
            brush: BEST_BRUSH.key,
          })),
          ...(spot.arrow
            ? [{ orig: spot.arrow.from, dest: spot.arrow.to, brush: SPOT_BRUSH.key }]
            : []),
        ],
      },
    };
  });

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
      highlight: { lastMove: true, check: true },
      drawable: { enabled: false, visible: true },
    };
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private api: Api | undefined;

  constructor() {
    afterNextRender(() => {
      // Chessground watches the board size itself (ResizeObserver), so it follows the layout.
      const api = Chessground(this.boardElement().nativeElement, {
        ...this.config(),
        highlight: { ...this.config().highlight, ...this.overlay().highlight },
        // Both are read once, when chessground wraps the element.
        coordinates: this.coordinates(),
        ranksPosition: 'left',
        animation: { enabled: !prefersReducedMotion(), duration: 200 },
        premovable: { enabled: false },
        draggable: { ...this.config().draggable, showGhost: true },
        drawable: {
          ...this.config().drawable,
          ...this.overlay().drawable,
          // Chessground merges this into its default brushes; the type wants them all.
          brushes: {
            [BEST_BRUSH.key]: BEST_BRUSH,
            [SPOT_BRUSH.key]: SPOT_BRUSH,
          } as unknown as DrawBrushes,
        },
        movable: {
          ...this.config().movable,
          free: false,
          showDests: true,
          events: { after: (from, to) => this.onUserMove(from, to) },
        },
      });
      this.api = api;

      // Chessground caches where the board is and only refreshes it on scroll and resize. When
      // content above the board grows (a message after a move), the board moves without either,
      // and clicks would land on the wrong square. Refresh it before chessground reads it.
      const wrap = this.boardElement().nativeElement;
      const refreshBounds = () => api.state.dom.bounds.clear();
      const options = { capture: true, passive: true };
      wrap.addEventListener('mousedown', refreshBounds, options);
      wrap.addEventListener('touchstart', refreshBounds, options);

      this.destroyRef.onDestroy(() => {
        wrap.removeEventListener('mousedown', refreshBounds, options);
        wrap.removeEventListener('touchstart', refreshBounds, options);
        api.destroy();
        this.api = undefined;
      });
    });

    effect(() => {
      const config = this.config();
      this.syncRequest();
      this.api?.set(config);
    });

    effect(() => {
      const overlay = this.overlay();
      this.api?.set(overlay);
    });

    afterRenderEffect(() => {
      if (this.pendingPromotion()) this.promotionButtons()[0]?.nativeElement.focus();
    });
  }

  protected choosePromotion(role: PromotionRole): void {
    const pending = this.pendingPromotion();
    if (!pending) return;
    this.closePromotion();
    this.move.emit({ from: pending.from, to: pending.to, promotion: role });
  }

  protected cancelPromotion(): void {
    this.closePromotion();
  }

  /** The first visit puts the cursor on a useful square; later visits find it where it was. */
  protected onFocus(): void {
    const api = this.api;
    if (!api) return;
    const cursor =
      this.cursor() ??
      startSquare(this.lastMove(), api.state.pieces, this.turnColor(), this.orientation());
    this.cursor.set(cursor);
    this.readSquare(cursor);
  }

  protected onKey(event: KeyboardEvent): void {
    // Alt + arrow is the browser's back and forward, and the picker has keys of its own.
    if (event.altKey || event.ctrlKey || event.metaKey || this.pendingPromotion()) return;
    const cursor = this.cursor();
    if (!this.api || !cursor) return;
    if (isCursorKey(event.key)) {
      const next = moveCursor(cursor, event.key, this.orientation());
      this.cursor.set(next);
      this.readSquare(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (!this.viewOnly()) this.pick(cursor);
    } else if (event.key === 'Escape' && this.api.state.selected) {
      this.deselect();
    } else {
      return;
    }
    // The keys the board uses are not for the page: the arrows also browse the moves there.
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Enter on a square: play the picked piece there if it can go, else pick the piece on it, else
   * drop the picked piece. Chessground's `selectSquare` plays the move as a click would.
   */
  private pick(square: Key): void {
    const api = this.api;
    if (!api) return;
    const selected = api.state.selected;
    if (selected && this.destsOf(selected).includes(square)) {
      api.selectSquare(square);
      return;
    }
    if (selected === square) {
      this.deselect();
      return;
    }
    const piece = api.state.pieces.get(square);
    const moves = this.destsOf(square).length;
    if (piece && piece.color === this.turnColor() && moves > 0) {
      api.selectSquare(square);
      const name = this.labels().piece(piece.role, piece.color);
      this.announce(this.labels().picked(name, square, moves));
    } else if (selected) {
      this.deselect();
    } else {
      this.announce(piece ? this.labels().cannotPick : this.labels().noPiece);
    }
  }

  private deselect(): void {
    this.api?.selectSquare(null);
    this.announce(this.labels().deselected);
  }

  private destsOf(square: Key): readonly Key[] {
    return this.dests().get(square) ?? [];
  }

  private readSquare(square: Key): void {
    const piece = this.api?.state.pieces.get(square);
    const name = piece ? this.labels().piece(piece.role, piece.color) : undefined;
    this.announce(this.labels().square(square, name));
  }

  private announce(text: string): void {
    this.announcement.update(({ id }) => ({ id: id + 1, text }));
  }

  /** Closes the picker, and gives the focus back to the board if the picker had it. */
  private closePromotion(): void {
    const hadFocus = this.host.nativeElement.contains(this.document.activeElement);
    this.pendingPromotion.set(undefined);
    this.requestSync();
    if (hadFocus) this.boardElement().nativeElement.focus();
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
