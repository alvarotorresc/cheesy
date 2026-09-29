import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n';
import type { OpponentMode } from '../opening-session';

/** Named engine strengths offered to the player, with their Stockfish skill level. */
export const STRENGTH_LEVELS = [
  { key: 'beginner', skill: 0 },
  { key: 'casual', skill: 5 },
  { key: 'club', skill: 10 },
  { key: 'strong', skill: 15 },
  { key: 'maximum', skill: 20 },
] as const;

const OPPONENT_MODES: readonly OpponentMode[] = ['book', 'engine'];

/**
 * "Game settings" of the play page: a folded box above the board whose summary tells the current
 * choice in one line. Presentational: the page owns the values.
 */
@Component({
  selector: 'app-play-options',
  templateUrl: './play-options.html',
  styleUrl: './play-options.css',
})
export class PlayOptions {
  readonly opponentMode = input.required<OpponentMode>();
  readonly mainOnly = input.required<boolean>();
  readonly skillLevel = input.required<number>();

  readonly opponentModeChange = output<OpponentMode>();
  readonly mainOnlyChange = output<boolean>();
  readonly skillLevelChange = output<number>();

  protected readonly i18n = inject(I18nService);
  protected readonly strengthLevels = STRENGTH_LEVELS;
  protected readonly opponentModes = OPPONENT_MODES;

  /** One line with the current choice, shown while the box is folded. */
  protected readonly summary = computed(() => {
    const t = this.i18n.t().openings;
    const rival =
      this.opponentMode() === 'engine'
        ? t.play.summaryEngine
        : this.mainOnly()
          ? t.play.summaryMain
          : t.play.summaryBook;
    const level = STRENGTH_LEVELS.find((entry) => entry.skill === this.skillLevel());
    const levelName = level ? t.strengthLevels[level.key] : String(this.skillLevel());
    return t.play.summary(rival, levelName.toLocaleLowerCase(this.i18n.lang()));
  });

  protected readonly hint = computed(() => {
    const t = this.i18n.t().openings.play;
    if (this.opponentMode() === 'engine') return t.hintEngine;
    return this.mainOnly() ? t.hintMain : t.hintBook;
  });

  protected onStrength(event: Event): void {
    this.skillLevelChange.emit(Number((event.target as HTMLSelectElement).value));
  }

  protected onMainOnly(event: Event): void {
    this.mainOnlyChange.emit((event.target as HTMLInputElement).checked);
  }
}
