import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { categoryTexts } from '../../core/content/category-texts';
import { I18nService } from '../../core/i18n';
import type { CategoryId } from '../../core/routing';

/**
 * The two paragraphs about a category (what is in it and how to use it), at the end of its page:
 * the list comes first, the reading after. They are also where its description for search engines
 * is cut from.
 */
@Component({
  selector: 'app-category-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="category-about" [attr.aria-labelledby]="headingId()">
      <h2 [id]="headingId()">{{ i18n.t().seo.categoryAbout[category()] }}</h2>
      @for (paragraph of paragraphs(); track $index) {
        <p>{{ paragraph }}</p>
      }
    </section>
  `,
  styleUrl: './category-about.css',
})
export class CategoryAbout {
  readonly category = input.required<CategoryId>();

  protected readonly i18n = inject(I18nService);
  protected readonly headingId = computed(() => `about-${this.category()}`);
  protected readonly paragraphs = computed(() => categoryTexts[this.category()][this.i18n.lang()]);
}
