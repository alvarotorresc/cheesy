import { afterNextRender, ElementRef, inject, Injector } from '@angular/core';

/**
 * Where the focus goes inside a step. The lesson page projects the step heading and the Next button
 * into every step, so an action button that removes itself (Hint, Show solution, Start again)
 * hands the focus to the heading instead of dropping it on the page, and skipping an exercise
 * hands it to Next. Call it in a field initializer.
 */
export const stepFocus = () => {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const injector = inject(Injector);
  return {
    toHeading: (): void => host.querySelector<HTMLElement>('[data-step-heading]')?.focus(),
    /** After the next render, once the page has enabled Next for the finished step. */
    toNext: (): void => {
      afterNextRender(() => host.querySelector<HTMLElement>('[data-step-next]')?.focus(), {
        injector,
      });
    },
  };
};
