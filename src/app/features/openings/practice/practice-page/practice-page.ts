import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Color, SquareName } from 'chessops';
import { GameService } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { PageTitle } from '../../../../core/page-title';
import {
  BoardComponent,
  type BoardArrow,
  type BoardMark,
  type BoardMove,
  type BoardRing,
} from '../../../../shared/board';
import { isFormField } from '../../../../shared/keyboard';
import { MoveList } from '../../../../shared/move-list';
import { numberedMove } from '../../opening-theory';
import { PracticeProgress } from '../practice-progress/practice-progress';
import { PracticeSession, type PracticePhase } from '../practice-session';
import { PracticeSetup } from '../practice-setup/practice-setup';
import { PracticeSummary } from '../practice-summary/practice-summary';

/** What the message above the board looks like: the colours and the icon go with it. */
type FeedbackTone = 'turn' | 'idle' | 'right' | 'wrong';

interface FeedbackView {
  readonly tone: FeedbackTone;
  readonly text: string;
  /** Second line, under the text: what comes next. */
  readonly sub?: string;
  /** Said to screen readers only: the move of the line, shown in its own box for everyone else. */
  readonly spoken?: string;
}

/**
 * Practice page of an opening (`/openings/:id/practice`): choose colour and line, then play the line
 * with only its moves accepted. The id in the URL is untrusted: the session checks it before
 * asking for content. No engine is provided here: the practice never needs Stockfish.
 */
@Component({
  selector: 'app-practice-page',
  imports: [BoardComponent, MoveList, PracticeProgress, PracticeSetup, PracticeSummary, RouterLink],
  providers: [GameService, PracticeSession],
  templateUrl: './practice-page.html',
  styleUrls: ['../practice-box.css', './practice-page.css'],
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class PracticePage {
  protected readonly game = inject(GameService);
  protected readonly session = inject(PracticeSession);
  protected readonly i18n = inject(I18nService);

  private readonly route = inject(ActivatedRoute);
  /** Id of the opening in the URL, for the link to play it while it loads. */
  protected readonly openingId = toSignal(this.route.paramMap, { initialValue: undefined });

  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));
  protected readonly isReviewing = computed(() => this.game.ply() < this.game.moves().length);

  protected readonly colorName = computed(() => {
    const t = this.i18n.t().openings;
    return (this.session.playerColor() === 'white' ? t.white : t.black).toLocaleLowerCase(
      this.i18n.lang(),
    );
  });

  /** Title of the line being practised: the main line, or its number. */
  protected readonly lineTitle = computed(() => {
    const line = this.session.currentLine();
    const t = this.i18n.t().practice;
    return line && (line.index === 0 ? t.mainLine : t.lineNumber(line.index + 1));
  });

  protected readonly lineVariation = computed(() => {
    const variation = this.session.currentLine()?.nodes.at(-1)?.variation;
    return variation && this.i18n.localize(variation);
  });

  /** "Line 3: Open Variation", or just the title when the line has no variation name. */
  protected readonly lineLabel = computed(() => {
    const variation = this.lineVariation();
    return variation ? `${this.lineTitle()}: ${variation}` : this.lineTitle();
  });

  /** The move shown after too many mistakes, with its squares for those who cannot see arrows. */
  protected readonly help = computed(() => {
    const node = this.session.help();
    return (
      node && {
        move: this.i18n.san(node.san),
        from: node.from,
        to: node.to,
      }
    );
  });

  private readonly numbered = (ply: number, san: string): string =>
    numberedMove(ply, this.i18n.san(san));

  /** Main message of the practice, announced to screen readers when it changes. */
  protected readonly feedback = computed<FeedbackView | undefined>(() => {
    const t = this.i18n.t().practice;
    const phase = this.session.phase();
    if (phase === 'complete') {
      const all = this.session.position().total > 1 && !this.session.hasNextLine();
      return { tone: 'right', text: all ? t.allDone : t.complete };
    }
    if (phase !== 'running') return undefined;
    const feedback = this.session.feedback();
    const max = this.session.maxMistakes;
    const thinking = this.session.isThinking();
    const next = thinking ? t.rivalMoving : t.yourMove;
    const spoken = this.spokenHelp();
    switch (feedback?.kind) {
      case 'correct':
        // Only while the rival answers: once it is the player's turn again, the praise has done
        // its job and the message goes back to asking for the next move.
        return thinking
          ? {
              tone: 'right',
              text: t.correct(this.numbered(feedback.ply, feedback.san)),
              sub: next,
            }
          : { tone: 'turn', text: next };
      case 'wrong':
        return {
          tone: 'wrong',
          text: t.wrong(this.numbered(feedback.ply, feedback.san), feedback.attempt, max),
          spoken,
        };
      case 'other-line': {
        // Before the first named variation, the line is the opening itself.
        const name = feedback.variation ?? this.session.opening()?.name;
        const variation = name ? this.i18n.localize(name) : '';
        return {
          tone: 'wrong',
          text: t.otherLine(
            this.numbered(feedback.ply, feedback.san),
            variation,
            feedback.attempt,
            max,
          ),
          spoken,
        };
      }
      default:
        return { tone: thinking ? 'idle' : 'turn', text: next };
    }
  });

  private readonly spokenHelp = computed(() => {
    const help = this.help();
    const t = this.i18n.t().practice;
    return help ? `${t.helpLead} ${help.move}${t.helpTail(help.from, help.to)}` : undefined;
  });

  /** Ring of the board: red for a move taken back, cheddar for a right answer and for the help. */
  protected readonly ring = computed<BoardRing>(() => {
    if (this.session.retracted()) return 'danger';
    const right =
      this.session.phase() === 'complete' ||
      this.help() !== undefined ||
      (this.session.feedback()?.kind === 'correct' && this.session.isThinking());
    return right ? 'accent' : 'none';
  });

  protected readonly marks = computed<ReadonlyMap<SquareName, BoardMark>>(() => {
    const marks = new Map<SquareName, BoardMark>();
    const retracted = this.session.retracted();
    if (retracted) {
      marks.set(retracted.from, 'wrong');
      marks.set(retracted.to, 'wrong');
    }
    const node = this.session.help();
    if (node) {
      marks.set(node.from, 'help');
      marks.set(node.to, 'help');
    }
    return marks;
  });

  protected readonly arrows = computed<BoardArrow[]>(() => {
    const node = this.session.help();
    return node ? [{ from: node.from, to: node.to }] : [];
  });

  private readonly message = viewChild<ElementRef<HTMLElement>>('message');
  private readonly setup = viewChild(PracticeSetup);
  private readonly document = inject(DOCUMENT);
  private lastPhase: PracticePhase | undefined;
  private lastFeedback: unknown;

  constructor() {
    inject(PageTitle).showDetail(() => {
      const opening = this.session.opening();
      return opening && this.i18n.t().practice.practiceLinkLabel(this.i18n.localize(opening.name));
    });
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => void this.session.load(params.get('id') ?? ''));

    // Starting or finishing a line removes the button that was pressed: keep the focus in the
    // practice, on its message (or on the title of the choice of line), instead of letting it fall
    // back to the page. Loading the opening removes no button, and an empty message has nothing
    // to read.
    afterRenderEffect(() => {
      const phase = this.session.phase();
      const message = this.message()?.nativeElement;
      const setup = this.setup();
      const active = this.document.activeElement;
      const lost = !active || active === this.document.body;
      const wasLoaded = this.lastPhase !== undefined && this.lastPhase !== 'idle';
      if (wasLoaded && phase !== this.lastPhase && lost) {
        if (phase === 'setup') setup?.focusTitle();
        else if (this.feedback()) message?.focus();
      }
      this.lastPhase = phase;
    });

    // A move taken back shakes the message. The animation is restarted by hand because the
    // message keeps its element from one mistake to the next.
    afterRenderEffect(() => {
      const feedback = this.session.feedback();
      const message = this.message()?.nativeElement;
      if (!message || feedback === this.lastFeedback) return;
      this.lastFeedback = feedback;
      message.classList.remove('shake');
      if (feedback && feedback.kind !== 'correct') {
        void message.offsetWidth;
        message.classList.add('shake');
      }
    });
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected browse(event: Event, step: number): void {
    if (isFormField(event.target) || this.session.phase() === 'setup') return;
    this.game.goTo(this.game.ply() + step);
  }

  protected colorOf(color: Color): 'wK' | 'bK' {
    return color === 'white' ? 'wK' : 'bK';
  }
}
