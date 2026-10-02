import { ElementRef, inject } from '@angular/core';

/**
 * Where the focus goes inside a step. The lesson page projects the step heading into every step,
 * so an action button that removes itself (Hint, Show solution, Start again) hands the focus to
 * the heading instead of dropping it on the page. Call it in a field initializer.
 */
export const stepFocus = () => {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return {
    toHeading: (): void => host.querySelector<HTMLElement>('[data-step-heading]')?.focus(),
  };
};
