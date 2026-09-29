import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideUmami, UMAMI_ORIGIN, UMAMI_WEBSITE_ID, umamiEnabled } from './umami';

describe('Umami', () => {
  const scripts = (): HTMLScriptElement[] =>
    Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[data-website-id]'));

  const start = (websiteId?: string): void => {
    TestBed.configureTestingModule({
      providers: [websiteId === undefined ? provideUmami() : provideUmami(websiteId)],
    });
    // Creating the environment runs the initializers.
    TestBed.inject(DOCUMENT);
  };

  afterEach(() => {
    for (const script of scripts()) script.remove();
  });

  it('should not have a website id until the site is registered', () => {
    expect(UMAMI_WEBSITE_ID).toBe('');
    expect(umamiEnabled()).toBe(false);
  });

  it('should add no script when the website id is empty', () => {
    start();

    expect(scripts()).toEqual([]);
    expect(document.head.querySelector(`script[src^="${UMAMI_ORIGIN}"]`)).toBeNull();
  });

  it('should add no script for an explicit empty id', () => {
    start('');

    expect(document.head.querySelector(`script[src^="${UMAMI_ORIGIN}"]`)).toBeNull();
  });

  it('should add the script, deferred and respecting Do Not Track, with a website id', () => {
    start('7f4c1a2e-0000-4000-8000-000000000000');

    expect(scripts()).toHaveLength(1);
    const [script] = scripts();
    expect(script.getAttribute('src')).toBe(`${UMAMI_ORIGIN}/script.js`);
    expect(script.defer).toBe(true);
    expect(script.getAttribute('data-website-id')).toBe('7f4c1a2e-0000-4000-8000-000000000000');
    expect(script.getAttribute('data-do-not-track')).toBe('true');
  });

  it('should know it is enabled when there is an id', () => {
    expect(umamiEnabled('abc')).toBe(true);
    expect(umamiEnabled('')).toBe(false);
  });
});
