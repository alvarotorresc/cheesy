import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The page of an address that is no page. The build writes it as `404.html` without scripts and
 * Netlify serves it, with status 404, at any address that is no file and no route of the app, in
 * either language: that is why it says everything in English and in Spanish, as fixed text, and
 * links with plain addresses.
 */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
