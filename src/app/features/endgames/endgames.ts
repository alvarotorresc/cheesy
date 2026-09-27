import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { groupByCategory } from './endgame-catalog';

/** Catalogue of endgames grouped by category, each one linking to its practice page. */
@Component({
  selector: 'app-endgames',
  imports: [RouterLink],
  templateUrl: './endgames.html',
  styleUrl: './endgames.css',
})
export class Endgames {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);

  protected readonly endgames = resource({ loader: () => this.content.endgames() });

  protected readonly categories = computed(() =>
    this.endgames.hasValue() ? groupByCategory(this.endgames.value()) : [],
  );
}
