import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n';

/**
 * Provisional page of `/acerca`: the title and the three sections the footer links to, so the
 * anchors work. The real content comes with the About screen.
 */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  protected readonly t = inject(I18nService).t;
}
