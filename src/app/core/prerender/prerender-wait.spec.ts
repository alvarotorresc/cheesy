import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectPrerenderWait } from './prerender-wait';

describe('injectPrerenderWait', () => {
  const stableWithin = async (ms: number): Promise<boolean> => {
    const stable = TestBed.inject(ApplicationRef)
      .whenStable()
      .then(() => true);
    const late = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms));
    return Promise.race([stable, late]);
  };

  const setupOn = (platform: 'browser' | 'server') => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.runInInjectionContext(() => injectPrerenderWait());
  };

  it('should keep the prerender from finishing until the load is done', async () => {
    const wait = setupOn('server');
    let finish!: () => void;
    const load = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));

    wait(load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(await stableWithin(20)).toBe(false);
    finish();
    expect(await stableWithin(20)).toBe(true);
  });

  it('should only run the load in the browser', async () => {
    const wait = setupOn('browser');
    const load = vi.fn(() => new Promise<void>(() => undefined));

    wait(load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(await stableWithin(20)).toBe(true);
  });
});
