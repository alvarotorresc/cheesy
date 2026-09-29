import { Component, computed, inject } from '@angular/core';
import type { Color } from 'chessops';
import { I18nService, type Messages } from '../../../../core/i18n';
import { isMastered, type LineProgress } from '../../../../core/progress';
import { numberedMove } from '../../opening-theory';
import { ProgressNote } from '../../progress-note/progress-note';
import { ALL_LINES, PracticeSession, type PracticeLine } from '../practice-session';

const COLORS: readonly Color[] = ['white', 'black'];

interface LineOption {
  readonly id: string;
  readonly title: string;
  readonly variation: string | undefined;
  readonly moves: string;
  readonly progress: string;
  readonly mastered: boolean;
}

/** One line about the progress of a line: times, best result, last date and whether mastered. */
export const describeProgress = (
  progress: LineProgress | undefined,
  t: Messages['practice'],
  formatDate: (time: number) => string,
): string => {
  if (!progress) return t.notPracticed;
  return [
    t.practiced(progress.practiced),
    isMastered(progress) ? t.mastered : t.bestResult(progress.bestMistakes),
    t.lastPracticed(formatDate(progress.lastPracticed)),
  ].join(' · ');
};

/** Moves of the line as in a score sheet: "1.e4 e5 2.Nf3". */
const movesOf = (line: PracticeLine): string =>
  line.nodes
    .map((node) => (node.ply % 2 === 1 ? numberedMove(node.ply, node.san) : node.san))
    .join(' ');

/**
 * Choice of colour and line before a practice, with the progress of each line kept in this
 * browser. Part of the practice page, which provides the session.
 */
@Component({
  selector: 'app-practice-setup',
  imports: [ProgressNote],
  templateUrl: './practice-setup.html',
  styleUrl: './practice-setup.css',
})
export class PracticeSetup {
  protected readonly session = inject(PracticeSession);
  protected readonly i18n = inject(I18nService);

  protected readonly colors = COLORS;
  protected readonly allLines = ALL_LINES;

  protected readonly options = computed<LineOption[]>(() => {
    const t = this.i18n.t().practice;
    const progress = this.session.lineProgress();
    const format = new Intl.DateTimeFormat(this.i18n.lang(), { dateStyle: 'medium' });
    return this.session.lines().map((line) => {
      const variation = line.nodes.at(-1)?.variation;
      const lineProgress = progress.get(line.id);
      return {
        id: line.id,
        title: line.index === 0 ? t.mainLine : t.lineNumber(line.index + 1),
        variation: variation && this.i18n.localize(variation),
        moves: movesOf(line),
        progress: describeProgress(lineProgress, t, (time) => format.format(time)),
        mastered: isMastered(lineProgress),
      };
    });
  });

  protected readonly count = computed(() => {
    const { practiced, mastered } = this.session.progressCount();
    return this.i18n.t().practice.progressCount(practiced, mastered, this.session.lines().length);
  });

  protected onColorChange(color: Color): void {
    this.session.setPlayerColor(color);
  }

  protected onLineChange(id: string): void {
    this.session.chooseLine(id);
  }
}
