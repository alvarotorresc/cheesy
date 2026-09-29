import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../core/i18n';
import { ProgressService } from '../../../core/progress';

type ClearState = 'idle' | 'confirming' | 'clearing' | 'cleared' | 'failed';

/**
 * Where the progress is kept, said in one line, a discreet notice when the browser does not let
 * us keep it, and the action to delete it after a confirmation.
 */
@Component({
  selector: 'app-progress-note',
  templateUrl: './progress-note.html',
  styleUrl: './progress-note.css',
})
export class ProgressNote {
  /** Whether there is saved progress to delete. */
  readonly hasProgress = input(false);
  /** Extra line under the privacy note, already translated. */
  readonly note = input<string | undefined>(undefined);

  protected readonly i18n = inject(I18nService);
  protected readonly progress = inject(ProgressService);
  protected readonly clearState = signal<ClearState>('idle');

  private readonly injector = inject(Injector);
  private readonly clearButton = viewChild<ElementRef<HTMLButtonElement>>('clearButton');
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly result = viewChild<ElementRef<HTMLElement>>('result');

  protected askToClear(): void {
    this.clearState.set('confirming');
    this.focusAfterRender(() => this.cancelButton());
  }

  protected cancel(): void {
    this.clearState.set('idle');
    this.focusAfterRender(() => this.clearButton());
  }

  protected async confirmClear(): Promise<void> {
    this.clearState.set('clearing');
    const cleared = await this.progress.clear('openings');
    this.clearState.set(cleared ? 'cleared' : 'failed');
    this.focusAfterRender(() => this.result());
  }

  /** The pressed button disappears: keep the focus inside this block. */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}
