import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n';

@Component({
  selector: 'app-positions',
  template: `
    <h1>{{ i18n.t().nav.positions }}</h1>
    <p>{{ i18n.t().placeholder.comingSoon }}</p>
  `,
})
export class Positions {
  protected readonly i18n = inject(I18nService);
}
