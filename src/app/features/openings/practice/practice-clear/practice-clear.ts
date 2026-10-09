import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../../core/i18n';
import { ProgressService } from '../../../../core/progress';
import { PageLinks } from '../../../../core/routing';

/**
 * Where the progress is kept, said in one line, and the action to delete the progress of the
 * openings after a confirmation in a dialog. When the browser does not let us keep progress the
 * page shows its own notice instead of this block.
 */
@Component({
  selector: 'app-practice-clear',
  imports: [RouterLink],
  templateUrl: './practice-clear.html',
  styleUrl: './practice-clear.css',
})
export class PracticeClear {
  /** Whether there is saved progress to delete. */
  readonly hasProgress = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(PageLinks);
  private readonly progress = inject(ProgressService);

  /** Result of the last try, announced to screen readers. */
  protected readonly result = signal('');

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly clearButton = viewChild.required<ElementRef<HTMLButtonElement>>('clearButton');

  protected ask(): void {
    if (!this.hasProgress()) {
      this.result.set(this.i18n.t().practice.nothingToClear);
      return;
    }
    this.result.set('');
    this.dialog().nativeElement.showModal();
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected async confirm(): Promise<void> {
    this.dialog().nativeElement.close();
    const cleared = await this.progress.clear('openings');
    const t = this.i18n.t().practice;
    this.result.set(cleared ? t.cleared : t.clearFailed);
    this.clearButton().nativeElement.focus();
  }
}
