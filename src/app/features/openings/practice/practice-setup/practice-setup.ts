import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import type { Color } from 'chessops';
import { I18nService } from '../../../../core/i18n';
import { isMastered, MASTERY_STREAK } from '../../../../core/progress';
import { colorOfPly } from '../../../../core/reading-mode';
import { MoveText } from '../../../../shared/move';
import { PracticeClear } from '../practice-clear/practice-clear';
import { ALL_LINES, PracticeSession, type PracticeLine } from '../practice-session';
import { Streak } from '../streak/streak';

/** A move of the line with its number in front (empty for Black's). */
interface ShownMove {
  readonly prefix: string;
  readonly san: string;
  readonly color: Color;
}

const COLORS: readonly Color[] = ['white', 'black'];

interface LineOption {
  readonly id: string;
  readonly title: string;
  readonly variation: string | undefined;
  readonly moves: readonly ShownMove[];
  /** Streak of the line, or undefined when it was never practised. */
  readonly streak: number | undefined;
  readonly mastered: boolean;
  /** "Practised 5 times, last on 24 Sep 2026". Empty when never practised. */
  readonly when: string;
}

/**
 * Choice of colour and line before a practice, with the progress of each line kept in this
 * browser. Part of the practice page, which provides the session.
 */
@Component({
  selector: 'app-practice-setup',
  imports: [MoveText, PracticeClear, Streak],
  templateUrl: './practice-setup.html',
  styleUrls: ['../practice-box.css', './practice-setup.css'],
})
export class PracticeSetup {
  protected readonly session = inject(PracticeSession);
  protected readonly i18n = inject(I18nService);

  protected readonly colors = COLORS;
  protected readonly allLines = ALL_LINES;
  protected readonly needed = MASTERY_STREAK;

  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  /** Moves of the line as in a score sheet, each with its number when White plays it. */
  private readonly movesOf = (line: PracticeLine): ShownMove[] =>
    line.nodes.map((node) => ({
      prefix: node.ply % 2 === 1 ? `${Math.ceil(node.ply / 2)}.` : '',
      san: node.san,
      color: colorOfPly(node.ply),
    }));

  protected readonly options = computed<LineOption[]>(() => {
    const t = this.i18n.t().practice;
    const progress = this.session.lineProgress();
    const format = new Intl.DateTimeFormat(this.i18n.lang(), { dateStyle: 'medium' });
    return this.session.lines().map((line) => {
      const variation = line.nodes.at(-1)?.variation;
      const row = progress.get(line.id);
      return {
        id: line.id,
        title: line.index === 0 ? t.mainLine : t.lineNumber(line.index + 1),
        variation: variation && this.i18n.localize(variation),
        moves: this.movesOf(line),
        streak: row && Math.min(row.streak, MASTERY_STREAK),
        mastered: isMastered(row),
        when: row
          ? `${t.practiced(row.practiced)}, ${t.lastPracticed(format.format(row.lastPracticed))}`
          : '',
      };
    });
  });

  /** Whether the browser keeps the progress: if it does not, no progress is shown at all. */
  protected readonly canSave = computed(() => this.session.storageStatus() !== 'unavailable');

  /** "Sin empezar" or "2 de 5 dominadas" for each colour. */
  protected readonly summaries = computed(() => {
    const t = this.i18n.t().practice;
    const progress = this.session.colorProgress();
    return Object.fromEntries(
      COLORS.map((color) => {
        const summary = progress?.[color];
        return [
          color,
          !summary || summary.practiced === 0
            ? t.notStarted
            : t.colorMastered(summary.mastered, summary.total),
        ];
      }),
    ) as Record<Color, string>;
  });

  protected readonly count = computed(() => {
    const { practiced, mastered } = this.session.progressCount();
    const color = this.colorName(this.session.playerColor()).toLocaleLowerCase(this.i18n.lang());
    return this.i18n
      .t()
      .practice.colorProgressCount(practiced, mastered, this.session.lines().length, color);
  });

  protected colorName(color: Color): string {
    const t = this.i18n.t().openings;
    return color === 'white' ? t.white : t.black;
  }

  /** Puts the focus on the title of the setup, when the button that was pressed went away. */
  focusTitle(): void {
    this.title().nativeElement.focus();
  }

  protected onColorChange(color: Color): void {
    this.session.setPlayerColor(color);
  }

  protected onLineChange(id: string): void {
    this.session.chooseLine(id);
  }
}
