import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { parseFen } from 'chessops/fen';
import { umamiEnabled } from '../../core/analytics';
import { ContentService } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { PageLinks } from '../../core/routing';
import { AboutCredits } from './credits/about-credits';
import { tablebaseRequestUrl } from '../../core/tablebase';
import {
  frameFromFen,
  MiniBoard,
  type MiniFrame,
  prefersReducedMotion,
} from '../../shared/mini-board';
import { injectPrerenderWait } from '../../core/prerender';

/** Whether the visits counter is on, so this page only mentions Umami when it is. Specs replace it. */
export const ABOUT_UMAMI = new InjectionToken<boolean>('ABOUT_UMAMI', {
  factory: () => umamiEnabled(),
});

/** The endgame whose starting position shows what is sent to Lichess: the same one Endgames lists. */
export const SENT_ENDGAME_ID = 'philidor-position';

/** The pieces of the «In short» column, one square each. */
export const BRIEF_PIECES = ['wK', 'bR', 'wP', 'bN'] as const;

/** Time the sweep spends on each rank, and the wait before it starts and after it ends. */
const SWEEP_STEP_MS = 420;
const SWEEP_START_MS = 300;
const SWEEP_END_MS = 500;

/** What Endgames sends to the tablebase for the first position of an endgame. */
interface SentPosition {
  readonly name: string;
  readonly side: 'white' | 'black';
  readonly turn: 'white' | 'black';
  readonly frames: readonly MiniFrame[];
  /** The eight ranks of the board part of the FEN, from the 8th to the 1st. */
  readonly rows: readonly string[];
  /** Turn, castling, en passant and counters. */
  readonly rest: string;
  readonly request: string;
}

/**
 * The About page: what is saved in the browser, what leaves it (the positions of Endgames go to the
 * Lichess tablebase, drawn here with the real request) and what the site is built on.
 */
@Component({
  selector: 'app-about',
  imports: [AboutCredits, MiniBoard, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  protected readonly i18n = inject(I18nService);
  /** Keeps the prerender waiting until the content is on the page. */
  private readonly wait = injectPrerenderWait();
  protected readonly t = this.i18n.t;
  protected readonly links = inject(PageLinks);
  private readonly content = inject(ContentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly briefPieces = BRIEF_PIECES;
  protected readonly umami = inject(ABOUT_UMAMI);

  protected readonly sent = signal<SentPosition | undefined>(undefined);
  /** The rank lit on the board and in the FEN (1 to 8), if any. */
  protected readonly rank = signal<number | undefined>(undefined);

  private readonly figure = viewChild<ElementRef<HTMLElement>>('figure');
  private sweepTimer: ReturnType<typeof setTimeout> | undefined;
  private swept = false;

  constructor() {
    this.wait(() => this.load());
    this.destroyRef.onDestroy(() => this.stopSweep());
    effect(() => {
      const figure = this.figure();
      if (figure) this.sweepOnFirstView(figure.nativeElement);
    });
  }

  /**
   * Cuts a sentence at the buttons of the page «Your progress» it names between «», so each one
   * can link to the page where it is.
   */
  protected segments(text: string): readonly { text: string; link: boolean }[] {
    const p = this.t().progressPage;
    const labels = [p.export, p.deleteRemote].map((label) => `«${label}»`);
    const parts: { text: string; link: boolean }[] = [];
    let rest = text;
    while (rest) {
      const found = labels
        .map((label) => ({ label, at: rest.indexOf(label) }))
        .filter((hit) => hit.at >= 0)
        .sort((a, b) => a.at - b.at)[0];
      if (!found) break;
      if (found.at > 0) parts.push({ text: rest.slice(0, found.at), link: false });
      parts.push({ text: found.label, link: true });
      rest = rest.slice(found.at + found.label.length);
    }
    if (rest) parts.push({ text: rest, link: false });
    return parts;
  }

  protected show(rank: number | undefined): void {
    this.stopSweep();
    this.rank.set(rank);
  }

  private async load(): Promise<void> {
    try {
      const endgame = await this.content.endgame(SENT_ENDGAME_ID);
      if (!endgame) return;
      const setup = parseFen(endgame.fen);
      const request = tablebaseRequestUrl(endgame.fen);
      if (setup.isErr || !request) return;
      const [board, ...rest] = endgame.fen.split(' ');
      this.sent.set({
        name: this.i18n.localize(endgame.name),
        side: endgame.playerSide,
        turn: setup.value.turn,
        frames: [frameFromFen(endgame.fen)],
        rows: board.split('/'),
        rest: rest.join(' '),
        request,
      });
    } catch {
      // Without the content the page still says everything; only the drawing is missing.
    }
  }

  /** One animated moment: the first time the board is seen, it is read rank by rank, like the FEN. */
  private sweepOnFirstView(figure: HTMLElement): void {
    if (this.swept || prefersReducedMotion() || typeof IntersectionObserver !== 'function') return;
    this.swept = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        this.sweepTimer = setTimeout(() => this.sweep(8), SWEEP_START_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(figure);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private sweep(rank: number): void {
    if (rank < 1) {
      this.sweepTimer = setTimeout(() => this.rank.set(undefined), SWEEP_END_MS);
      return;
    }
    this.rank.set(rank);
    this.sweepTimer = setTimeout(() => this.sweep(rank - 1), SWEEP_STEP_MS);
  }

  private stopSweep(): void {
    clearTimeout(this.sweepTimer);
    this.sweepTimer = undefined;
  }
}
