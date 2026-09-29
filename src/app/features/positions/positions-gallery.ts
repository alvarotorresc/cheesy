import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { sideToPlayLabel, tagLabel } from './position-labels';
import { PositionList } from './position-list';

/** Gallery of the curated tactical positions, from fewest to most moves of the player. */
@Component({
  selector: 'app-positions-gallery',
  imports: [RouterLink],
  templateUrl: './positions-gallery.html',
  styleUrl: './positions-gallery.css',
  providers: [PositionList],
})
export class PositionsGallery {
  protected readonly i18n = inject(I18nService);
  protected readonly list = inject(PositionList);

  protected readonly tagLabel = tagLabel;
  protected readonly sideToPlayLabel = sideToPlayLabel;
}
