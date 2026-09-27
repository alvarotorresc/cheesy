import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameService } from '../../../../core/game';
import { I18nService } from '../../../../core/i18n';
import { PageTitle } from '../../../../core/page-title';
import { BoardComponent, type BoardMove } from '../../../../shared/board';
import { isFormField } from '../../../../shared/keyboard';
import { MoveList } from '../../../../shared/move-list';
import { numberedMove } from '../../opening-theory';
import { DrillSession, type DrillPhase } from '../drill-session';
import { DrillSetup } from '../drill-setup/drill-setup';

/**
 * Drill page of an opening (`/openings/:id/drill`): choose colour and line, then play the line
 * with only its moves accepted. The id in the URL is untrusted: the session checks it before
 * asking for content. No engine is provided here: the drill never needs Stockfish.
 */
@Component({
  selector: 'app-drill-page',
  imports: [BoardComponent, DrillSetup, MoveList, RouterLink],
  providers: [GameService, DrillSession],
  templateUrl: './drill-page.html',
  styleUrl: './drill-page.css',
  host: {
    '(document:keydown.arrowleft)': 'browse($event, -1)',
    '(document:keydown.arrowright)': 'browse($event, 1)',
  },
})
export class DrillPage {
  protected readonly game = inject(GameService);
  protected readonly session = inject(DrillSession);
  protected readonly i18n = inject(I18nService);

  protected readonly sans = computed(() => this.game.moves().map((move) => move.san));
  protected readonly isReviewing = computed(() => this.game.ply() < this.game.moves().length);

  /** The move shown after too many mistakes, with its squares for those who cannot see arrows. */
  protected readonly help = computed(() => {
    const node = this.session.help();
    return node && this.i18n.t().drill.help(numberedMove(node.ply, node.san), node.from, node.to);
  });

  /** Main message of the drill, announced to screen readers when it changes. */
  protected readonly status = computed(() => {
    const t = this.i18n.t().drill;
    const phase = this.session.phase();
    if (phase === 'complete') {
      return this.session.position().total > 1 && !this.session.hasNextLine()
        ? t.allDone
        : t.complete;
    }
    if (phase !== 'drilling') return '';
    const feedback = this.session.feedback();
    const max = this.session.maxMistakes;
    const next = this.session.isThinking() ? t.rivalMoving : t.yourMove;
    switch (feedback?.kind) {
      case 'correct':
        return `${t.correct(numberedMove(feedback.ply, feedback.san))} ${next}`;
      case 'wrong':
        return [
          t.wrong(numberedMove(feedback.ply, feedback.san), feedback.attempt, max),
          this.help(),
        ]
          .filter(Boolean)
          .join(' ');
      case 'other-line': {
        // Before the first named variation, the line is the opening itself.
        const name = feedback.variation ?? this.session.opening()?.name;
        const variation = name ? this.i18n.localize(name) : '';
        return [
          t.otherLine(numberedMove(feedback.ply, feedback.san), variation, feedback.attempt, max),
          this.help(),
        ]
          .filter(Boolean)
          .join(' ');
      }
      default:
        return next;
    }
  });

  protected readonly saveMessage = computed(() => {
    const t = this.i18n.t().drill;
    switch (this.session.saveState()) {
      case 'saving':
        return t.saving;
      case 'saved':
        return t.saved;
      case 'failed':
        return t.saveFailed;
      default:
        return '';
    }
  });

  private readonly statusMessage = viewChild<ElementRef<HTMLElement>>('statusMessage');
  private readonly document = inject(DOCUMENT);
  private lastPhase: DrillPhase | undefined;

  constructor() {
    inject(PageTitle).showDetail(() => {
      const opening = this.session.opening();
      return opening && this.i18n.t().drill.drillLinkLabel(this.i18n.localize(opening.name));
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => void this.session.load(params.get('id') ?? ''));

    // Starting or finishing a line removes the button that was pressed: keep the focus in the
    // drill, on its message, instead of letting it fall back to the page. Loading the opening
    // removes no button, and an empty message has nothing to read.
    afterRenderEffect(() => {
      const phase = this.session.phase();
      const status = this.statusMessage()?.nativeElement;
      const active = this.document.activeElement;
      const lost = !active || active === this.document.body;
      const wasLoaded = this.lastPhase !== undefined && this.lastPhase !== 'idle';
      if (wasLoaded && phase !== this.lastPhase && lost && this.status()) status?.focus();
      this.lastPhase = phase;
    });
  }

  protected onMove(move: BoardMove): void {
    this.session.play(move);
  }

  protected browse(event: Event, step: number): void {
    if (isFormField(event.target) || this.session.phase() === 'setup') return;
    this.game.goTo(this.game.ply() + step);
  }
}
