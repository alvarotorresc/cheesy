import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { CuratedPosition } from '../../core/content';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { PageTitle } from '../../core/page-title';
import { BoardComponent } from '../../shared/board';
import { isFormField } from '../../shared/keyboard';
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
}

/**
 * "Guess the move" page of one curated position, reached through `/positions/:id`.
 *
 * The segment comes from the URL and is untrusted: it is only read as the number of a position in
 * the gallery (see `orderPositions`), so anything else, or a number past the last position, shows
 * a "not found" message.
 */
@Component({
  selector: 'app-position-page',
  imports: [BoardComponent, RouterLink],
  providers: [GameService, PositionTrainer, PositionList],
  templateUrl: './position-page.html',
  styleUrl: './position-page.css',
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class PositionPage {
  protected readonly i18n = inject(I18nService);
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

  protected readonly steps = computed<StepView[]>(() => {
    const startPly = this.game.startPly();
    const shown = this.trainer.isReplay() ? this.trainer.line().length : this.game.moves().length;
    return this.trainer
      .line()
      .slice(0, shown)
      .map((step, index) => {
        const absolute = startPly + index;
        const number = Math.floor(absolute / 2) + 1;
        return { step, ply: index + 1, number: absolute % 2 === 0 ? `${number}.` : `${number}…` };
      });
  });

  /** Main message of the exercise, announced to screen readers when it changes. */
  protected readonly status = computed(() => {
    const t = this.i18n.t().positions;
    const feedback = this.trainer.feedback();
    const phase = this.trainer.phase();
    if (phase === 'revealed') return t.revealed;
    if (feedback?.kind === 'wrong') return t.wrong(feedback.played);
    if (feedback?.kind === 'correct') {
      const correct = t.correct(feedback.played);
      if (phase === 'solved') return `${correct} ${t.solved}`;
      return feedback.reply ? `${correct} ${t.reply(feedback.reply)}` : correct;
    }
    return t.findMove(this.trainer.playerMoveCount());
  });

  protected readonly hintText = computed(() => {
    const hint = this.trainer.hint();
    const t = this.i18n.t().positions;
    return hint ? t.hintText(t.pieces[hint.role], hint.from) : undefined;
  });

  /** Description of the displayed step of the solution while replaying. */
  protected readonly stepText = computed(() => {
    const t = this.i18n.t().positions;
    const current = this.steps()[this.game.ply() - 1];
    if (!current) return t.startPosition;
    const { step, number } = current;
    const notes = [
      step.isCapture ? t.capture : undefined,
      step.isMate ? t.mate : step.isCheck ? t.check : undefined,
    ].filter((note) => note !== undefined);
    const who = step.byPlayer ? t.yourMove : t.opponentMove;
    return `${who}: ${number} ${step.san}${notes.length ? ` (${notes.join(', ')})` : ''}.`;
  });

  protected readonly tagLabel = tagLabel;
  protected readonly sideToPlayLabel = sideToPlayLabel;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly statusMessage = viewChild<ElementRef<HTMLElement>>('statusMessage');
  private readonly document = inject(DOCUMENT);
  private focusedId: string | undefined;
  private wasReplay: boolean | undefined;

  constructor() {
    const router = inject(Router);
    inject(PageTitle).showDetail(() => {
      const position = this.position();
      return position && this.i18n.localize(position.title);
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
