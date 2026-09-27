import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService, LANGS } from './core/i18n';
import { Logo } from './shared/logo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly langs = LANGS;
  protected readonly sections = ['openings', 'endgames', 'positions', 'analysis'] as const;

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** With `<base href="/">` a plain `#main` link would navigate to the home page. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
