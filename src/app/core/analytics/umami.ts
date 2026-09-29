import { DOCUMENT, inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';

/** Where the visits are counted: a self-hosted Umami, without cookies or personal data. */
export const UMAMI_ORIGIN = 'https://analytics.alvarotc.com';

/** Empty while the site is not registered in Umami: then nothing is loaded. */
export const UMAMI_WEBSITE_ID = '';

/** Whether visits are counted at all. Only the pages that say so (About) read it. */
export const umamiEnabled = (websiteId: string = UMAMI_WEBSITE_ID): boolean => websiteId !== '';

/**
 * Adds the Umami script to the page when there is a website id, and does nothing otherwise. The
 * script follows the route changes of the app by itself. `data-do-not-track` makes it respect the
 * browser setting. The id is a parameter for the specs; the app uses the constant.
 */
export const provideUmami = (websiteId: string = UMAMI_WEBSITE_ID): EnvironmentProviders =>
  provideAppInitializer(() => {
    if (!umamiEnabled(websiteId)) return;
    const document = inject(DOCUMENT);
    const script = document.createElement('script');
    script.defer = true;
    script.src = `${UMAMI_ORIGIN}/script.js`;
    script.dataset['websiteId'] = websiteId;
    script.dataset['doNotTrack'] = 'true';
    document.head.appendChild(script);
  });
