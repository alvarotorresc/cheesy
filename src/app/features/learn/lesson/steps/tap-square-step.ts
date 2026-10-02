import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { makeSquare, type SquareName } from 'chessops';
import type { TapSquareStep } from '../../../../core/content';
import { I18nService } from '../../../../core/i18n';
import { RichTextView } from '../../../../shared/rich-text';
import { TapSquareSession } from '../tap-square-session';

/** How long a tapped square keeps its colour. */
const FLASH_MS = 600;

/** Ranks from 8 to 1 and files from a to h: the order of a board seen from White. */
const SQUARES: readonly { square: SquareName; dark: boolean }[] = Array.from(
  { length: 64 },
  (_, i) => ({
    square: makeSquare((7 - Math.floor(i / 8)) * 8 + (i % 8)),
    dark: ((i % 8) + Math.floor(i / 8)) % 2 === 1,
  }),
);

/**
 * "Tap e4": a grid of 64 buttons of our own instead of chessground, which does not report taps on
 * a board that cannot be moved. No coordinates are shown: finding the square is the exercise.
 */
@Component({
  selector: 'app-tap-square-step',
  imports: [RichTextView],
  templateUrl: './tap-square-step.html',
  styleUrls: ['./step-layout.css', './tap-square-step.css'],
})
export class TapSquareStepView {
  readonly step = input.required<TapSquareStep>();
  readonly done = output<{ firstTry: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly session = computed(() => new TapSquareSession(this.step()));
  protected readonly squares = SQUARES;
  protected readonly flashing = signal(false);

  private emittedFor: TapSquareSession | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    effect(() => {
      const session = this.session();
      if (!session.done() || this.emittedFor === session) return;
      this.emittedFor = session;
      this.done.emit({ firstTry: session.tracker.firstTry() });
    });
  }

  /** Colour of a square while the last tap is still shown. */
  protected stateOf(square: SquareName): 'right' | 'wrong' | 'expected' | undefined {
    const last = this.session().last();
    if (!this.flashing() || !last) return undefined;
    if (square === last.square) return last.right ? 'right' : 'wrong';
    return !last.right && square === last.expected ? 'expected' : undefined;
  }

  protected tap(square: SquareName): void {
    const session = this.session();
    if (session.done()) return;
    session.tap(square);
    this.flashing.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flashing.set(false), FLASH_MS);
  }
}
