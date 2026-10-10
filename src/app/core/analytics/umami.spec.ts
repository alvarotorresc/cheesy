import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideUmami, trackEvent, UMAMI_ORIGIN, UMAMI_WEBSITE_ID, umamiEnabled } from './umami';

describe('Umami', () => {
  const scripts = (): HTMLScriptElement[] =>
    Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[data-website-id]'));

  const start = (websiteId?: string, countLocal = true): void => {
    TestBed.configureTestingModule({
      providers: [websiteId === undefined ? provideUmami() : provideUmami(websiteId, countLocal)],
    });
    // Creating the environment runs the initializers.
    TestBed.inject(DOCUMENT);
  };

  afterEach(() => {
    for (const script of scripts()) script.remove();
  });

  it('should have the website id of the registered site', () => {
    expect(UMAMI_WEBSITE_ID).toBe('fcf066c2-d02f-4894-acb0-b511f160cffd');
    expect(umamiEnabled()).toBe(true);
  });

  it('should not count local development with the default settings', () => {
    start();

    expect(scripts()).toEqual([]);
    expect(document.head.querySelector(`script[src^="${UMAMI_ORIGIN}"]`)).toBeNull();
  });

  it('should not count local development even with a website id', () => {
    start('7f4c1a2e-0000-4000-8000-000000000000', false);

    expect(scripts()).toEqual([]);
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

  it('should add no script to the prerendered pages', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    start('7f4c1a2e-0000-4000-8000-000000000000');

    expect(scripts()).toEqual([]);
  });

  it('should know it is enabled when there is an id', () => {
    expect(umamiEnabled('abc')).toBe(true);
    expect(umamiEnabled('')).toBe(false);
  });
});

describe('trackEvent', () => {
  type Tracked = Window & { umami?: { track: (...args: unknown[]) => void } };

  it('sends only the event name to Umami', () => {
    const track = vi.fn();
    const view = { umami: { track } } as unknown as Tracked;
    trackEvent('sync-create', view);
    trackEvent('sync-join', view);
    expect(track.mock.calls).toEqual([['sync-create'], ['sync-join']]);
  });

  it('does nothing without the Umami script or without a window', () => {
    expect(() => trackEvent('sync-create', {} as Window)).not.toThrow();
    expect(() => trackEvent('sync-create', undefined)).not.toThrow();
  });

  it('does nothing when counting is off', () => {
    const track = vi.fn();
    trackEvent('sync-join', { umami: { track } } as unknown as Tracked, '');
    expect(track).not.toHaveBeenCalled();
  });

  it('never lets an analytics failure reach the caller', () => {
    const view = {
      umami: {
        track: () => {
          throw new Error('blocked');
        },
      },
    } as unknown as Tracked;
    expect(() => trackEvent('sync-create', view)).not.toThrow();
  });
});
