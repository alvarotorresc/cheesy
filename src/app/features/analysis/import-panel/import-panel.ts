import { Component, computed, inject, signal } from '@angular/core';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { loadImport, type ImportOutcome } from './load-import';

/** Form to load a FEN or a PGN into the game of the analysis page. */
@Component({
  selector: 'app-import-panel',
  templateUrl: './import-panel.html',
  styleUrl: './import-panel.css',
})
export class ImportPanel {
  private readonly game = inject(GameService);
  protected readonly i18n = inject(I18nService);

  private readonly outcome = signal<ImportOutcome | undefined>(undefined);

  protected readonly hasError = computed(() => this.outcome()?.ok === false);

  /** Feedback of the last attempt, translated at render time so it follows the language. */
  protected readonly message = computed(() => {
    const outcome = this.outcome();
    if (!outcome) return '';
    const t = this.i18n.t().importer;
    if (outcome.ok) return outcome.loaded === 'game' ? t.gameLoaded : t.positionLoaded;
    switch (outcome.error) {
      case 'empty':
        return t.empty;
      case 'too-long':
        return t.tooLong;
      case 'invalid-fen':
        return t.invalidFen;
      case 'impossible-position':
        return t.impossiblePosition;
      case 'no-game':
        return t.noGame;
      case 'unsupported-variant':
        return t.unsupportedVariant;
      case 'invalid-start-position':
        return t.invalidStartPosition;
      case 'illegal-move':
        return `${t.illegalMove} ${outcome.move}`;
    }
  });

  protected load(event: Event, text: string): void {
    // A plain form: without this the browser would submit it and reload the page.
    event.preventDefault();
    this.outcome.set(loadImport(this.game, text));
  }
}
