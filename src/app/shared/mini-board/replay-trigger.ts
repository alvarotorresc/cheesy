import { DestroyRef, Directive, ElementRef, inject, input, type OnInit } from '@angular/core';
import { hasFinePointer, prefersReducedMotion, type Replay } from './replay';

/**
 * Starts and stops the replay of the card it sits on. A mouse over the card or the keyboard focus
 * inside it starts it and leaving stops it, unless the play button pinned it; touch only plays from
 * the button. A card that scrolls out of view stops and lets go of its pin. Nothing starts by
 * itself when the user asked for less motion.
 */
@Directive({
  selector: '[appReplayTrigger]',
  host: {
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ReplayTrigger implements OnInit {
  readonly appReplayTrigger = input.required<Replay>();

  private readonly card = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => !entry.isIntersecting)) this.appReplayTrigger().stop();
      },
      { threshold: 0.35 },
    );
    observer.observe(this.card);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected onPointerEnter(): void {
    if (hasFinePointer() && !prefersReducedMotion()) this.appReplayTrigger().start();
  }

  protected onPointerLeave(): void {
    const replay = this.appReplayTrigger();
    if (hasFinePointer() && !replay.pinned()) replay.stop();
  }

  /** Only keyboard focus starts it: a tap on the button also focuses it and must not start and stop. */
  protected onFocusIn(event: FocusEvent): void {
    if (prefersReducedMotion() || !isFocusVisible(event.target)) return;
    this.appReplayTrigger().start();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    const replay = this.appReplayTrigger();
    if (!(next instanceof Node && this.card.contains(next)) && !replay.pinned()) replay.stop();
  }
}

const isFocusVisible = (target: EventTarget | null): boolean => {
  try {
    return target instanceof Element && target.matches(':focus-visible');
  } catch {
    // Browsers without :focus-visible: treat focus as keyboard focus.
    return true;
  }
};
