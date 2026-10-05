import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n';

export const SOURCE_URL = 'https://github.com/alvarotorresc/cheesy';

export type CreditId =
  | 'stockfish'
  | 'tablebase'
  | 'openings'
  | 'puzzles'
  | 'chessground'
  | 'chessops'
  | 'pieces'
  | 'bricolage'
  | 'phosphor';

interface CreditItem {
  readonly id: CreditId;
  /** Names that are not translated; the others come from the dictionary. */
  readonly name?: string;
  readonly url?: string;
  /** Free services and the like get a quieter licence pill. */
  readonly quiet?: boolean;
}

export interface CreditGroup {
  readonly id: 'engine' | 'board' | 'look';
  readonly items: readonly CreditItem[];
}

export const CREDIT_GROUPS: readonly CreditGroup[] = [
  {
    id: 'engine',
    items: [
      {
        id: 'stockfish',
        name: 'Stockfish',
        url: 'https://github.com/official-stockfish/Stockfish',
      },
      { id: 'tablebase', url: 'https://tablebase.lichess.ovh', quiet: true },
      { id: 'openings', url: 'https://github.com/lichess-org/chess-openings' },
      { id: 'puzzles', url: 'https://database.lichess.org' },
    ],
  },
  {
    id: 'board',
    items: [
      { id: 'chessground', name: 'chessground', url: 'https://github.com/lichess-org/chessground' },
      { id: 'chessops', name: 'chessops', url: 'https://github.com/niklasf/chessops' },
      { id: 'pieces' },
    ],
  },
  {
    id: 'look',
    items: [
      {
        id: 'bricolage',
        name: 'Bricolage Grotesque',
        url: 'https://github.com/ateliertriay/bricolage',
      },
      { id: 'phosphor', url: 'https://phosphoricons.com' },
    ],
  },
];

/** The credits by group, and the block about the source code. */
@Component({
  selector: 'app-about-credits',
  templateUrl: './about-credits.html',
  styleUrl: './about-credits.css',
})
export class AboutCredits {
  protected readonly t = inject(I18nService).t;
  protected readonly creditGroups = CREDIT_GROUPS;
  protected readonly sourceUrl = SOURCE_URL;

  /** The translated parts of a credit; the names of the projects are the same in both languages. */
  protected credit(item: CreditItem): { name: string; license: string; text: string } {
    const texts = this.t().about.credit[item.id] as {
      name?: string;
      license: string;
      text?: string;
    };
    return { name: item.name ?? texts.name ?? '', license: texts.license, text: texts.text ?? '' };
  }
}
