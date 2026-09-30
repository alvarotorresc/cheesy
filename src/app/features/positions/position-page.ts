import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Key } from '@lichess-org/chessground/types';
import type { Color } from 'chessops';
import { map } from 'rxjs';
import { analysisLink } from '../../core/analysis-link';
import type { CuratedPosition } from '../../core/content';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { colorOfPly, ReadingModeService } from '../../core/reading-mode';
import { PageTitle } from '../../core/page-title';
import { BoardComponent, BoardSpotlight, type BoardMark, type BoardRing } from '../../shared/board';
import { Icon } from '../../shared/icon';
import type { IconName } from '../../shared/icon';
import { isFormField } from '../../shared/keyboard';
import { MoveText } from '../../shared/move';
import { RichTextView } from '../../shared/rich-text';
import { TermView } from '../../shared/term';
import { sideToPlayLabel, tagLabel } from './position-labels';
import { numberOfContentId, POSITION_NUMBER } from './position-order';
import { PositionList } from './position-list';
import { PositionTrainer } from './position-trainer';
import type { SolutionStep } from './solution-line';

interface StepView {
  step: SolutionStep;
  /** Ply reached after this move, used to jump to it. */
  ply: number;
  /** Move number with dots, "6." for white and "6…" for black. */
  number: string;
  /** Side that plays the step, from the side to move in the starting position. */
  color: Color;
}

/** Main message of the exercise: its kind picks the colour and the icon. */
interface Message {
  kind: 'plain' | 'wrong' | 'right' | 'reveal';
  icon: IconName;
  main: string;
  sub?: string;
}

/** How long a wrong move stays marked on the board. */
export const WRONG_MARK_MS = 900;

/** No square marked. */
const NO_MARKS: ReadonlyMap<Key, BoardMark> = new Map();

/**
 * "Guess the move" page of one curated position, reached through `/positions/:id`.
 *
 * The segment comes from the URL and is untrusted: it is only read as the number of a position in
 * the gallery (see `orderPositions`), so anything else, or a number past the last position, shows
 * a "not found" message.
 *
 * No spoilers: the title, the themes, the game, the explanation and the link to Analysis (which
 * carries the solution) only exist once the position is solved or its solution is asked for, and
 * the tab says "Position N of M" until then.
 */
@Component({
  selector: 'app-position-page',
  imports: [BoardComponent, Icon, MoveText, NgTemplateOutlet, RichTextView, RouterLink, TermView],
  providers: [GameService, PositionTrainer, PositionList, BoardSpotlight],
  templateUrl: './position-page.html',
  styleUrl: './position-page.css',
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class PositionPage {
  protected readonly i18n = inject(I18nService);
  protected readonly reading = inject(ReadingModeService);
  protected readonly game = inject(GameService);
  protected readonly trainer = inject(PositionTrainer);
  protected readonly list = inject(PositionList);

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  /** Place of the position in the gallery: its number in the URL, minus one. */
  private readonly index = computed(() => {
    const id = this.id();
    const index = POSITION_NUMBER.test(id) ? Number(id) - 1 : -1;
    return index < this.list.positions().length ? index : -1;
  });

  /** Number that replaces the id of an old link, while the page is on its way there. */
  private readonly redirect = computed(() =>
    this.list.status() === 'ready' && this.index() < 0
      ? numberOfContentId(this.list.positions(), this.id())
      : undefined,
  );

  protected readonly redirecting = computed(() => this.redirect() !== undefined);

  protected readonly position = computed<CuratedPosition | undefined>(
    () => this.list.positions()[this.index()],
  );

  /** Position number and total, for the bar and the neutral title of the tab. */
  protected readonly where = computed(() => {
    const total = this.list.positions().length;
    return this.position() ? this.i18n.t().positions.positionOf(this.index() + 1, total) : '';
  });

  protected readonly previousId = computed(() => this.neighbourId(-1));
  protected readonly nextId = computed(() => this.neighbourId(1));

  /** Result of starting the exercise on the position shown, set once the trainer has tried. */
  private readonly started = signal<{ position: CuratedPosition; ok: boolean } | undefined>(
    undefined,
  );

  /** 'unplayable' when the content has a position the board cannot play. */
  protected readonly exercise = computed<'pending' | 'ready' | 'unplayable'>(() => {
    const started = this.started();
    if (!started || started.position !== this.position()) return 'pending';
    return started.ok ? 'ready' : 'unplayable';
  });

  /** The exercise is on the board: the top bar then moves into the panel beside it. */
  protected readonly ready = computed(
    () =>
      this.list.status() !== 'error' &&
      this.list.status() !== 'loading' &&
      !this.redirecting() &&
      this.exercise() === 'ready',
  );

  /** True once the position is solved or its solution is shown: what was hidden can be told. */
  protected readonly revealed = computed(() => this.trainer.isReplay());

  protected readonly steps = computed<StepView[]>(() => {
    const startPly = this.game.startPly();
    const shown = this.trainer.isReplay() ? this.trainer.line().length : this.game.moves().length;
    return this.trainer
      .line()
      .slice(0, shown)
      .map((step, index) => {
        const absolute = startPly + index;
        const number = Math.floor(absolute / 2) + 1;
        return {
          step,
          ply: index + 1,
          number: absolute % 2 === 0 ? `${number}.` : `${number}…`,
          color: colorOfPly(absolute + 1),
        };
      });
  });

  /** Moves of the player already found, while guessing. */
  protected readonly found = computed(() => Math.floor(this.game.moves().length / 2));

  protected readonly pips = computed(() =>
    Array.from({ length: this.trainer.playerMoveCount() }, (_, index) =>
      index < this.found() ? 'done' : index === this.found() ? 'now' : '',
    ),
  );

  /** Main message of the exercise, announced to screen readers when it changes. */
  protected readonly message = computed<Message>(() => {
    const t = this.i18n.t().positions;
    const feedback = this.trainer.feedback();
    const phase = this.trainer.phase();
    if (phase === 'revealed') {
      return { kind: 'reveal', icon: 'mini-eye', main: t.revealed, sub: t.revealedSub };
    }
    if (feedback?.kind === 'wrong') {
      const main = t.wrong(this.reading.full(feedback.played, { start: false }));
      return { kind: 'wrong', icon: 'mini-cross', main, sub: t.wrongSub };
    }
    if (phase === 'solved') {
      if (this.game.canGoForward()) {
        return { kind: 'right', icon: 'mini-check', main: t.reviewing, sub: t.reviewingSub };
      }
      const played = feedback?.played;
      const main = played
        ? `${t.correct(this.reading.full(played, { start: false }))} ${t.solved}`
        : t.solved;
      return { kind: 'right', icon: 'mini-check', main, sub: t.solvedSub };
    }
    if (feedback?.kind === 'correct') {
      const correct = t.correct(this.reading.full(feedback.played, { start: false }));
      const main = feedback.reply
        ? `${correct} ${t.reply(this.reading.full(feedback.reply, { start: false }))}`
        : correct;
      return { kind: 'right', icon: 'mini-check', main };
    }
    return {
      kind: 'plain',
      icon: 'mini-target',
      main: t.findMove(this.trainer.playerMoveCount()),
      // The hint line takes the place of the reminder.
      sub: this.trainer.hint() ? undefined : t.findMoveSub,
    };
  });

  protected readonly hintText = computed(() => {
    const hint = this.trainer.hint();
    const t = this.i18n.t().positions;
    return hint ? t.hintText(t.pieces[hint.role], hint.from) : undefined;
  });

  /**
   * Description of the displayed step of the solution while replaying. In words mode the sentence
   * already tells captures, checks and mates; in notation they go in a note after the move.
   */
  protected readonly stepText = computed(() => {
    const t = this.i18n.t().positions;
    const current = this.steps()[this.game.ply() - 1];
    if (!current) return t.startPosition;
    const { step, number } = current;
    const notes = this.reading.words()
      ? []
      : [
          step.isCapture ? t.capture : undefined,
          step.isMate ? t.mate : step.isCheck ? t.check : undefined,
        ].filter((note) => note !== undefined);
    const who = step.byPlayer ? t.yourMove : t.opponentMove;
    return `${who}: ${number} ${this.reading.full(step.san, { start: false })}${notes.length ? ` (${notes.join(', ')})` : ''}.`;
  });

  /** Analysis with this position and its solution: only after the solution is out. */
  protected readonly analysis = computed(() => {
    const position = this.position();
    if (!position || !this.revealed()) return undefined;
    return analysisLink({
      fen: position.fen,
      moves: position.solution,
      from: { kind: 'position', id: position.id },
    });
  });

  /** The wrong move stays marked on the board for a moment while the piece goes back. */
  private readonly wrongMarks = signal<ReadonlyMap<Key, BoardMark>>(NO_MARKS);

  protected readonly marks = computed<ReadonlyMap<Key, BoardMark>>(() => {
    if (this.wrongMarks().size) return this.wrongMarks();
    const hint = this.trainer.hint();
    return hint ? new Map<Key, BoardMark>([[hint.from as Key, 'hint']]) : NO_MARKS;
  });

  protected readonly ring = computed<BoardRing>(() => {
    if (this.wrongMarks().size) return 'danger';
    return this.trainer.phase() === 'solved' ? 'accent' : 'none';
  });

  protected readonly tagLabel = tagLabel;
  protected readonly sideToPlayLabel = sideToPlayLabel;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly statusMessage = viewChild<ElementRef<HTMLElement>>('statusMessage');
  private readonly document = inject(DOCUMENT);
  private focusedId: string | undefined;
  private wasReplay: boolean | undefined;
  private wrongTimer: ReturnType<typeof setTimeout> | undefined;
  private shownMessage: Message | undefined;

  constructor() {
    const router = inject(Router);
    inject(DestroyRef).onDestroy(() => clearTimeout(this.wrongTimer));

    // The tab is neutral ("Position 3 of 13") until the position is solved or its solution is out.
    inject(PageTitle).showDetail(() => {
      const position = this.position();
      if (!position) return undefined;
      return this.revealed() ? this.i18n.localize(position.title) : this.where();
    });
    effect(() => {
      const number = this.redirect();
      if (number) untracked(() => router.navigate(['/positions', number], { replaceUrl: true }));
    });
    effect(() => {
      const position = this.position();
      if (position) {
        this.started.set({ position, ok: untracked(() => this.trainer.start(position)) });
      }
    });

    // A wrong move marks its two squares for a moment, and any new state of the exercise clears it.
    effect(() => {
      const feedback = this.trainer.feedback();
      untracked(() => {
        clearTimeout(this.wrongTimer);
        if (feedback?.kind !== 'wrong') {
          this.wrongMarks.set(NO_MARKS);
          return;
        }
        this.wrongMarks.set(
          new Map<Key, BoardMark>([
            [feedback.from, 'wrong'],
            [feedback.to, 'wrong'],
          ]),
        );
        this.wrongTimer = setTimeout(() => this.wrongMarks.set(NO_MARKS), WRONG_MARK_MS);
      });
    });

    // Moving to the previous or next position reuses this page: take the focus to the new title so
    // keyboard and screen reader users know the content changed. The first load keeps the focus.
    afterRenderEffect(() => {
      const heading = this.heading();
      const id = this.position()?.id;
      if (!heading || !id || id === this.focusedId) return;
      if (this.focusedId !== undefined) heading.nativeElement.focus();
      this.focusedId = id;
    });

    // Showing or leaving the solution removes the button that was pressed: keep the focus in the
    // exercise, on its message, instead of letting it fall back to the page.
    afterRenderEffect(() => {
      const replay = this.trainer.isReplay();
      const status = this.statusMessage()?.nativeElement;
      const lost = this.document.activeElement === this.document.body;
      if (this.wasReplay !== undefined && replay !== this.wasReplay && lost) status?.focus();
      this.wasReplay = replay;
    });

    // Every new message settles in with a short movement, and a wrong one shakes.
    afterRenderEffect(() => {
      const message = this.message();
      const element = this.statusMessage()?.nativeElement;
      if (!element || message === this.shownMessage) return;
      const first = this.shownMessage === undefined;
      this.shownMessage = message;
      if (first || typeof element.animate !== 'function') return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      element.animate(
        message.kind === 'wrong'
          ? [
              { transform: 'none' },
              { transform: 'translateX(-5px)', offset: 0.25 },
              { transform: 'translateX(4px)', offset: 0.5 },
              { transform: 'translateX(-2px)', offset: 0.75 },
              { transform: 'none' },
            ]
          : [
              { transform: 'translateY(4px)', opacity: 0.4 },
              { transform: 'none', opacity: 1 },
            ],
        {
          duration: message.kind === 'wrong' ? 360 : 300,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      );
    });
  }

  protected browse(event: Event, step: -1 | 1): void {
    if (isFormField(event.target)) return;
    if (step < 0) this.trainer.goBack();
    else this.trainer.goForward();
  }

  protected onReplayKey(event: Event, target: 'start' | 'end'): void {
    event.preventDefault();
    if (target === 'start') this.trainer.goToStart();
    else this.trainer.goToEnd();
  }

  /** Number in the URL of the position next to this one, if there is one. */
  private neighbourId(offset: number): string | undefined {
    const neighbour = this.index() + offset;
    if (this.index() < 0 || neighbour < 0 || neighbour >= this.list.positions().length) {
      return undefined;
    }
    return String(neighbour + 1);
  }
}
