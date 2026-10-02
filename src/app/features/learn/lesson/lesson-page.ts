import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n';

/** Placeholder until the lesson player arrives. */
@Component({
  selector: 'app-lesson-page',
  template: '<p class="notice">{{ i18n.t().learn.notFound }}</p>',
})
export class LessonPage {
  protected readonly i18n = inject(I18nService);
}
