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

/** The events counted besides the visits. They carry no data: only their name. */
export type TrackedEvent = 'sync-create' | 'sync-join';

/**
 * Counts one event in Umami, with nothing but its name. Does nothing without a window (prerender),
 * when counting is off or when the script did not load (blocked, local development, do not
 * track). Analytics never breaks the caller.
 */
export const trackEvent = (
  name: TrackedEvent,
  view: Window | undefined,
  websiteId: string = UMAMI_WEBSITE_ID,
): void => {
  if (!view || !umamiEnabled(websiteId)) return;
  try {
    (view as Window & { umami?: { track?: (name: string) => unknown } }).umami?.track?.(name);
  } catch {
    // Nothing to do: the event is just not counted.
  }
};
