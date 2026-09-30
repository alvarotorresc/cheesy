import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  Injector,
  resource,
  signal,
} from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../../core/content';
import type { GlossaryTerm } from '../../../core/content/content.types';
import { I18nService, type Lang } from '../../../core/i18n';
import { frameFromFen, MiniBoard } from '../../../shared/mini-board';
import { RichTextView } from '../../../shared/rich-text';

const fold = (text: string): string =>
  text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

export const sortTerms = (terms: readonly GlossaryTerm[], lang: Lang): GlossaryTerm[] =>
  [...terms].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));

/** Whether the name of the term, in the given language, contains the query (case and accents aside). */
export const matchesSearch = (term: GlossaryTerm, query: string, lang: Lang): boolean =>
  fold(term.name[lang]).includes(fold(query));

/** Every glossary term, in alphabetical order, with a search box and a small board each. */
@Component({
  selector: 'app-glossary-page',
  imports: [MiniBoard, RichTextView],
  templateUrl: './glossary-page.html',
  styleUrl: './glossary-page.css',
})
export class GlossaryPage {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly injector = inject(Injector);
  private readonly scroller = inject(ViewportScroller);
  private readonly fragment = toSignal(inject(ActivatedRoute).fragment);

  protected readonly query = signal('');
  protected readonly glossary = resource({ loader: () => this.content.glossary() });
  protected readonly terms = computed(() => {
    const lang = this.i18n.lang();
    const query = this.query();
    return sortTerms(this.glossary.value() ?? [], lang).filter((t) =>
      matchesSearch(t, query, lang),
    );
  });
  /** The search found nothing in a loaded glossary (what the always-present live region says). */
  protected readonly noMatch = computed(
    () => this.glossary.hasValue() && this.terms().length === 0,
  );
  protected readonly frameOf = (term: GlossaryTerm) => [frameFromFen(term.example.fen)];

  constructor() {
    // The terms arrive after the router has finished, so its own anchor scrolling finds nothing:
    // once they are drawn, the page goes to the term of the address.
    effect(() => {
      const id = this.fragment();
      if (id && this.glossary.hasValue()) {
        afterNextRender(() => this.scroller.scrollToAnchor(id), { injector: this.injector });
      }
    });
  }
}
