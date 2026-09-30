import { Directive, inject, input } from '@angular/core';
import { BoardSpotlight, type SpotRequest } from './spotlight';

/**
 * Points the page's board at a move or squares: while the mouse is over the element or it has the
 * focus, or after a tap until the next press elsewhere. Does nothing on a page without a board.
 */
@Directive({
  selector: '[appSpot]',
  host: {
    '[attr.data-spot]': 'spotlight ? "" : null',
    '[attr.tabindex]': 'spotlight && focusable() ? 0 : null',
    '(pointerenter)': 'onEnter($event)',
    '(pointerleave)': 'onLeave($event)',
    '(pointerup)': 'onTap($event)',
    '(focus)': 'show(false)',
    '(blur)': 'hide()',
  },
})
export class SpotTrigger {
  readonly appSpot = input<SpotRequest | undefined>(undefined);
  /** Whether the element takes a tab stop of its own (false when it is already a button). */
  readonly focusable = input(true);

  protected readonly spotlight = inject(BoardSpotlight, { optional: true });

  protected onEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.show(false);
  }

  protected onLeave(event: PointerEvent): void {
    // A finger leaves as soon as it lifts: touch requests stay until a press elsewhere.
    if (event.pointerType === 'mouse') this.hide();
  }

  protected onTap(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') this.show(true);
  }

  protected show(sticky: boolean): void {
    const request = this.appSpot();
    if (request) this.spotlight?.point(request, this, sticky);
  }

  protected hide(): void {
    this.spotlight?.clear(this);
  }
}
