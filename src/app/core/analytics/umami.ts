import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';

/** Where the visits are counted: a self-hosted Umami, without cookies or personal data. */
export const UMAMI_ORIGIN = 'https://analytics.alvarotc.com';

/** The site as registered in Umami. Empty would load nothing. */
export const UMAMI_WEBSITE_ID = 'fcf066c2-d02f-4894-acb0-b511f160cffd';

/** Local development is not counted. */
const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

/** Whether visits are counted at all. Only the pages that say so (About) read it. */
export const umamiEnabled = (websiteId: string = UMAMI_WEBSITE_ID): boolean => websiteId !== '';

/**
 * Adds the Umami script to the page when there is a website id, and does nothing otherwise. The
 * script follows the route changes of the app by itself. `data-do-not-track` makes it respect the
 * browser setting. Local development is skipped unless `countLocal` is set. Both parameters are for
 * the specs; the app uses the defaults.
 */
export const provideUmami = (
  websiteId: string = UMAMI_WEBSITE_ID,
  countLocal = false,
): EnvironmentProviders =>
  provideAppInitializer(() => {
    // The prerendered pages carry no script: the browser adds it when the app starts.
    if (!umamiEnabled(websiteId) || !isPlatformBrowser(inject(PLATFORM_ID))) return;
    const document = inject(DOCUMENT);
    if (!countLocal && isLocalHost(document.location.hostname)) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = `${UMAMI_ORIGIN}/script.js`;
    script.dataset['websiteId'] = websiteId;
    script.dataset['doNotTrack'] = 'true';
    document.head.appendChild(script);
  });
