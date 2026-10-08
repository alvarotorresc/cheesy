import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { PageMeta } from '../../core/seo';

/**
 * Where the page sits in the site: home, its section, its level and the page itself, the last one
 * not a link. It is the same trail search engines get as structured data (`PageMeta`), so it shows
 * nothing until the page knows what it shows.
 */
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length > 0) {
      <nav class="crumbs" [attr.aria-label]="i18n.t().seo.breadcrumb">
        <ol>
          @for (crumb of crumbs(); track crumb.path; let last = $last) {
            <li>
              @if (last) {
                <span class="here" aria-current="page">{{ crumb.name }}</span>
              } @else {
                <a [routerLink]="crumb.path">{{ crumb.name }}</a>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  protected readonly i18n = inject(I18nService);
  protected readonly crumbs = inject(PageMeta).crumbs;
}
