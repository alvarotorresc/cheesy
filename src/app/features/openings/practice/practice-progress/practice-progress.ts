import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../../core/i18n';
import { playerMoveCount, playerMovesDone } from '../practice-run';
import { PracticeSession } from '../practice-session';

type Cell = 'done' | 'now' | 'todo';

/**
 * Progress in the line being practised: one cell for each move of the player, and the mistakes made
 * on the move being looked for. Part of the practice page, which provides the session.
 */
@Component({
  selector: 'app-practice-progress',
  templateUrl: './practice-progress.html',
  styleUrls: ['../practice-box.css', './practice-progress.css'],
})
export class PracticeProgress {
  protected readonly i18n = inject(I18nService);
  protected readonly session = inject(PracticeSession);

  protected readonly total = computed(() => {
    const run = this.session.run();
    return run ? playerMoveCount(run.line, run.color) : 0;
  });

  protected readonly done = computed(() => {
    const run = this.session.run();
    return run ? playerMovesDone(run) : 0;
  });

  protected readonly cells = computed<Cell[]>(() =>
    Array.from({ length: this.total() }, (_, index) =>
      index < this.done() ? 'done' : index === this.done() ? 'now' : 'todo',
    ),
  );

  /** Move number of the player being looked for, never past the last one. */
  protected readonly current = computed(() => Math.min(this.done() + 1, this.total()));

  protected readonly mistakes = computed(() => this.session.run()?.mistakesOnMove ?? 0);

  protected readonly fails = computed(() =>
    Array.from({ length: this.session.maxMistakes }, (_, index) => index < this.mistakes()),
  );
}
