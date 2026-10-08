import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { analysisLink } from '../../../../core/analysis-link';
import { I18nService } from '../../../../core/i18n';
import { PracticeSession } from '../practice-session';
import { Streak } from '../streak/streak';

/** Result of a completed line: the numbers, what happened to the streak and what to do next. */
@Component({
  selector: 'app-practice-summary',
  imports: [RouterLink, Streak],
  templateUrl: './practice-summary.html',
  styleUrls: ['../practice-box.css', './practice-summary.css'],
})
export class PracticeSummary {
  protected readonly i18n = inject(I18nService);
  protected readonly session = inject(PracticeSession);

  protected readonly needed = this.session.masteryStreak;

  protected readonly saveMessage = computed(() => {
    const t = this.i18n.t().practice;
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

  /** Title and note of the streak block: what the run did to the streak of the line. */
  protected readonly streak = computed(() => {
    const t = this.i18n.t().practice;
    const change = this.session.streakChange();
    const summary = this.session.summary();
    if (!change || !summary) return undefined;
    const { before, after } = change;
    const color =
      this.i18n.t().openings[this.session.playerColor() === 'white' ? 'white' : 'black'];
    if (after >= this.needed) {
      return {
        mastered: true,
        title: t.streakMasteredTitle,
        note: t.streakMasteredNote(this.needed, color.toLocaleLowerCase(this.i18n.lang())),
      };
    }
    if (summary.mistakes === 0) {
      return {
        mastered: false,
        title: t.streakOf(after, this.needed),
        note: t.streakMore(this.needed - after),
      };
    }
    return before > 0
      ? { mastered: false, title: t.streakLostTitle, note: t.streakLostNote(this.needed) }
      : { mastered: false, title: t.streakNoneTitle, note: t.streakNoneNote(this.needed) };
  });

  /** Link to Analysis with the moves of the line, in English notation whatever the language. */
  protected readonly analysis = computed(() => {
    const line = this.session.currentLine();
    const opening = this.session.opening();
    if (!line || !opening) return undefined;
    return analysisLink({
      lang: this.i18n.lang(),
      moves: line.nodes.map((node) => node.san),
      from: { kind: 'practice', id: opening.id },
    });
  });
}
