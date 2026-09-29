import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { Logo } from '../../shared/logo';

/** Footer of every page: the brand, what the site promises and the links to the legal pages. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Logo],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly t = inject(I18nService).t;
}
