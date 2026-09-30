import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import type { Color } from 'chessops';
import { describeMove, I18nService, localizeSan } from '../i18n';

export type ReadingMode = 'words' | 'notation';

export const READING_MODE_STORAGE_KEY = 'cheesy.notation';

const isReadingMode = (value: unknown): value is ReadingMode =>
  value === 'words' || value === 'notation';

const readStoredMode = (storage: () => Storage | undefined): ReadingMode | undefined => {
  try {
    const stored = storage()?.getItem(READING_MODE_STORAGE_KEY);
    return isReadingMode(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
};

/** Side that plays a ply counted from 1 at the initial position: odd plies are White's. */
export const colorOfPly = (ply: number): Color => (ply % 2 === 1 ? 'white' : 'black');

/**
 * How moves are written on screen: in words (the default, for people who do not read chess
 * notation) or in notation. The choice is kept in the browser, like the language.
 */
@Injectable({ providedIn: 'root' })
export class ReadingModeService {
  private readonly i18n = inject(I18nService);
  private readonly window = inject(DOCUMENT).defaultView ?? undefined;
  private readonly current = signal<ReadingMode>(
    readStoredMode(() => this.window?.localStorage) ?? 'words',
  );

  readonly mode = this.current.asReadonly();
  readonly words = computed(() => this.current() === 'words');

  setMode(mode: ReadingMode): void {
    this.current.set(mode);
    try {
      this.window?.localStorage.setItem(READING_MODE_STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this visit.
    }
  }

  /** A move inside a message or an explanation: the sentence in words mode, SAN in notation. */
  full(san: string, options: { start?: boolean } = {}): string {
    const lang = this.i18n.lang();
    return this.words() ? describeMove(san, lang, options) : localizeSan(san, lang);
  }

  /** A move with its number: `3. Alfil a b5` / `3... Peón a a6`, or `3.Ab5` / `3...a6`. */
  numbered(ply: number, san: string): string {
    const number = `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '...'}`;
    return this.words() ? `${number} ${this.full(san)}` : `${number}${this.full(san)}`;
  }

  /** The sentence of a move whatever the mode, for screen readers. */
  spoken(san: string, options: { start?: boolean } = {}): string {
    return describeMove(san, this.i18n.lang(), options);
  }
}
