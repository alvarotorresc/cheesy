import {
  inject,
  Injectable,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { ResolveEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import type { LessonLevel } from '../content/content.types';
import { I18nService } from '../i18n';
import type { CategoryId, Page } from './page-url';
import { pageUrls } from './site-urls';

/**
 * Links to the pages of the site in the language on screen, as `routerLink` takes them: always
 * the canonical address (no trailing slash, the slug of that language). Read in a template, they
 * follow the language.
 */
@Injectable({ providedIn: 'root' })
export class PageLinks {
  private readonly i18n = inject(I18nService);

  to(page: Page): string {
    return pageUrls.pathOf(page, this.i18n.lang());
  }

  home(): string {
    return this.to({ kind: 'home' });
  }

  category(category: CategoryId): string {
    return this.to({ kind: 'category', category });
  }

  opening(id: string): string {
    return this.to({ kind: 'opening', id });
  }

  practice(id: string): string {
    return this.to({ kind: 'practice', id });
  }

  endgame(id: string): string {
    return this.to({ kind: 'endgame', id });
  }

  position(id: string): string {
    return this.to({ kind: 'position', id });
  }

  level(level: LessonLevel): string {
    return this.to({ kind: 'level', level });
  }

  lesson(level: LessonLevel, id: string): string {
    return this.to({ kind: 'lesson', level, id });
  }

  glossary(): string {
    return this.to({ kind: 'glossary' });
  }

  about(): string {
    return this.to({ kind: 'about' });
  }

  analysis(): string {
    return this.to({ kind: 'analysis' });
  }

  puzzles(): string {
    return this.to({ kind: 'puzzles' });
  }

  puzzle(lesson: string): string {
    return this.to({ kind: 'puzzle', lesson });
  }
}

/**
 * The language on screen follows the address: it changes once the router knows the page it goes
 * to and before that page is created, so the page never renders in the language of the last one.
 */
export const provideLangFromUrl = () =>
  makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const i18n = inject(I18nService);
      inject(Router)
        .events.pipe(filter((event) => event instanceof ResolveEnd))
        .subscribe((event) => i18n.followUrl(event.urlAfterRedirects));
    }),
  ]);
