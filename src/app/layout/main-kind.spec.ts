import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { mainKindOf } from './main-kind';

describe('mainKindOf', () => {
  const kindAt = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', data: { main: 'home' }, children: [] },
          {
            path: 'openings',
            children: [
              { path: '', children: [] },
              { path: 'weird', data: { main: 'nonsense' }, children: [] },
              { path: ':id', data: { main: 'play' }, children: [] },
            ],
          },
          { path: 'acerca', data: { main: 'about' }, children: [] },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return mainKindOf(TestBed.inject(Router).routerState.snapshot.root);
  };

  it.each([
    ['/', 'home'],
    ['/openings/ruy-lopez', 'play'],
    ['/acerca', 'about'],
  ])('should read the kind of %s from the deepest route', async (url, kind) => {
    expect(await kindAt(url)).toBe(kind);
  });

  it('should give nothing to a list', async () => {
    expect(await kindAt('/openings')).toBeUndefined();
  });

  it('should ignore a kind it does not know', async () => {
    expect(await kindAt('/openings/weird')).toBeUndefined();
  });
});
