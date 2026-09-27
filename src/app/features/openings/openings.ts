import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n';

@Component({
  selector: 'app-openings',
  template: `
    <h1>{{ i18n.t().nav.openings }}</h1>
    <p>{{ i18n.t().placeholder.comingSoon }}</p>
  `,
})
export class Openings {
  protected readonly i18n = inject(I18nService);
}
