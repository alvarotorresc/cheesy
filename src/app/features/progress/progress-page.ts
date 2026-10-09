import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n';

/** The page "Your progress": for now only its title, the sync flows come with their own task. */
@Component({
  selector: 'app-progress-page',
  template: '<h1>{{ i18n.t().progressPage.title }}</h1>',
})
export class ProgressPage {
  protected readonly i18n = inject(I18nService);
}
