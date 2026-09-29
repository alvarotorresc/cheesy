import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * The single place where {@link ToastService} messages appear. It is always in the page, so screen
 * readers announce each new text; the styles (`.toast`, `.toast.show`) are global.
 */
@Component({
  selector: 'app-toast',
  template: `<div class="toast" [class.show]="toast.visible()" role="status" aria-live="polite">
    {{ toast.message() }}
  </div>`,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
