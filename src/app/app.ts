import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { I18nService, LANGS, type Lang } from './core/i18n';
import { type ReadingMode, ReadingModeService } from './core/reading-mode';
import { PageLinks, pageUrls } from './core/routing';
import { mainKindOf } from './layout/main-kind';
import { SiteFooter } from './layout/site-footer';
import { Logo } from './shared/logo';
import { Toast } from './shared/toast';

type NavSection = 'learn' | 'openings' | 'endgames' | 'positions' | 'analysis';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, SiteFooter, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    // A play page is one window tall when the board and its panel sit side by side.
    '[class.play-shell]': "mainKind() === 'play'",
  },
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly langs = LANGS;
  protected readonly reading = inject(ReadingModeService);
  protected readonly readingModes: readonly ReadingMode[] = ['words', 'notation'];
  protected readonly sections: readonly NavSection[] = [
    'learn',
    'openings',
    'endgames',
    'positions',
    'analysis',
  ];

  protected readonly links = inject(PageLinks);
  private readonly router = inject(Router);

  /** Address of the page shown, query and fragment included. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** The page shown, in another language: the same entity under its slug in that language. */
  protected langLink(lang: Lang) {
    return this.router.parseUrl(pageUrls.translateUrl(this.url(), lang));
  }

  protected sectionLink(section: NavSection): string {
    return section === 'analysis' ? this.links.analysis() : this.links.category(section);
  }

  /** Padding of `<main>` for the page shown, given by the `main` data of its route. */
  protected readonly mainKind = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => mainKindOf(this.router.routerState.snapshot.root)),
    ),
  );

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** With `<base href="/">` a plain `#main` link would navigate to the home page. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
