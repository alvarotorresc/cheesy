import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ICONS, type IconName } from './icons';

/**
 * Inline SVG icon. The size follows the font (1.15em); a screen sets another one with a selector
 * on the element, for example `.alert app-icon { width: 1.3rem; height: 1.3rem; }`. Icons are
 * decorative: the text next to them carries the meaning.
 */
@Component({
  selector: 'app-icon',
  template: '',
  host: { '[innerHTML]': 'svg()' },
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 1.15em;
      height: 1.15em;
      vertical-align: -0.2em;
    }

    /* The SVG is inserted as HTML, so the component's own style attribute never reaches it. */
    :host ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();

  private readonly sanitizer = inject(DomSanitizer);

  // Safe to trust: the markup comes from the constants in icons.ts, never from data.
  protected readonly svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
