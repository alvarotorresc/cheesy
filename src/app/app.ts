import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { I18nService, LANGS } from './core/i18n';
import { type ReadingMode, ReadingModeService } from './core/reading-mode';
import { mainKindOf } from './layout/main-kind';
import { SiteFooter } from './layout/site-footer';
import { Logo } from './shared/logo';
import { Toast } from './shared/toast';

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
  protected readonly sections = ['openings', 'endgames', 'positions', 'analysis'] as const;

  private readonly router = inject(Router);

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
