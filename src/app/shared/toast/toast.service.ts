import { Injectable, OnDestroy, signal } from '@angular/core';

/** How long a message stays on screen. */
export const TOAST_MS = 2600;

/** A short message that fades away by itself. Only one shows at a time: a new one replaces it. */
@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  private readonly text = signal('');
  private readonly shown = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly message = this.text.asReadonly();
  readonly visible = this.shown.asReadonly();

  show(message: string): void {
    clearTimeout(this.timer);
    this.text.set(message);
    this.shown.set(true);
    this.timer = setTimeout(() => this.shown.set(false), TOAST_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
