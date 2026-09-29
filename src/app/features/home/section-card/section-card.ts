import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n';
import { Icon } from '../../../shared/icon';
import { ReplayTrigger, type Replay } from '../../../shared/mini-board';

/**
 * A section of the app on the home page: a small live board (projected in `[figure]`), the name as
 * a link that covers the whole card, a count, a description and what the board shows (projected in
 * `[note]`). The play button sits next to the title, never over the board; the mouse, the keyboard
 * focus and the button start the replay that the page gives it.
 */
@Component({
  selector: 'app-section-card',
  imports: [Icon, ReplayTrigger, RouterLink],
  templateUrl: './section-card.html',
  styleUrl: './section-card.css',
  host: { class: 'card-host' },
})
export class SectionCard {
  readonly title = input.required<string>();
  readonly route = input.required<string>();
  readonly count = input.required<string>();
  readonly description = input.required<string>();
  /** Label of the play button while it is stopped. */
  readonly buttonLabel = input.required<string>();
  readonly replay = input.required<Replay>();

  protected readonly i18n = inject(I18nService);
}
