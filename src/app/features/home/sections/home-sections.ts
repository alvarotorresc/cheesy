import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n';
import { createReplay, MiniBoard } from '../../../shared/mini-board';
import { prefersReducedMotion } from '../../../shared/mini-board/replay';
import { PUZZLE_COUNT, type HomeData } from '../home-data';
import { createPuzzleReplay } from '../puzzle-replay';
import { SectionCard } from '../section-card/section-card';

/**
 * Levels of the illustrative bar of the Analysis card, one per move of the line. The bar is
 * decoration approved for the home page: it swings a little and never states an evaluation.
 */
const SWING = [50, 56, 47, 54, 48, 53, 46, 52, 50] as const;
const BALANCED = 50;
const ANALYSIS_STEP_MS = 900;

/**
 * The four section cards of the home page, each with a small board that shows something real of
 * its section: an opening being played, an endgame with a ring on every piece, the starting
 * positions of some exercises (never their solution) and a line with the bar swinging. They play
 * one at a time.
 */
@Component({
  selector: 'app-home-sections',
  imports: [MiniBoard, SectionCard],
  templateUrl: './home-sections.html',
  styleUrl: './home-sections.css',
})
export class HomeSections {
  readonly data = input.required<HomeData>();

  protected readonly i18n = inject(I18nService);

  protected readonly opening = createReplay({
    frames: () => this.data().dragon.frames,
    restPly: 'last',
  });
  protected readonly endgame = createReplay({
    frames: () => this.data().endgame.frames,
    restPly: 'first',
  });
  protected readonly puzzle = createPuzzleReplay(PUZZLE_COUNT);
  protected readonly analysis = createReplay({
    frames: () => this.data().italian.frames,
    restPly: 'last',
    timing: prefersReducedMotion() ? undefined : { stepMs: ANALYSIS_STEP_MS },
  });

  protected readonly puzzleShown = computed(() => this.data().puzzles[this.puzzle.ply()]);
  protected readonly evalLevel = computed(() =>
    this.analysis.playing() ? SWING[this.analysis.ply() % SWING.length] : BALANCED,
  );

  /** The move that has just been played: "1.e4", "1...c5", in the language of the page. */
  protected plyLabel(sans: readonly string[], ply: number): string {
    if (ply < 1 || ply > sans.length) return '';
    const dots = ply % 2 === 0 ? '...' : '.';
    return `${Math.ceil(ply / 2)}${dots}${this.i18n.san(sans[ply - 1])}`;
  }

  /** The whole line: "1.e4 c5 2.Nf3". */
  protected lineLabel(sans: readonly string[]): string {
    return sans
      .map((san, index) => (index % 2 === 0 ? `${index / 2 + 1}.` : '') + this.i18n.san(san))
      .join(' ');
  }
}
