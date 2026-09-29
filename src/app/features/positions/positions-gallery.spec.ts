import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS, type ContentLoaders, type CuratedPosition } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { POSITIONS_ROUTES } from './positions.routes';

const POSITIONS: CuratedPosition[] = [
  {
    id: 'with-source',
    title: { es: 'Con partida', en: 'With a game' },
    source: 'Morphy – Duke Karl of Brunswick, Paris 1858',
    fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    playerSide: 'white',
    solution: ['Rh8#'],
    explanation: { es: 'Mate.', en: 'Mate.' },
    tags: ['back-rank', 'windmill-attack'],
  },
  {
    id: 'black-to-play',
    title: { es: 'Juegan negras', en: 'Black plays' },
    fen: '4k2r/8/8/8/8/8/8/4K3 b k - 0 1',
    playerSide: 'black',
    solution: ['Rh1#'],
    explanation: { es: 'Mate.', en: 'Mate.' },
    tags: ['pin'],
  },
];

const setup = async (positions: ContentLoaders['positions'], lang: 'es' | 'en' = 'en') => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'positions', children: POSITIONS_ROUTES }]),
      { provide: CONTENT_LOADERS, useValue: { positions } as Partial<ContentLoaders> },
    ],
  });
  TestBed.inject(I18nService).setLang(lang);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/positions');
  await vi.waitFor(() => expect(harness.routeNativeElement?.querySelector('[role]')).toBeNull());
  return harness.routeNativeElement as HTMLElement;
};

describe('PositionsGallery', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should show one card per position with its title, side, source and themes', async () => {
    const element = await setup(async () => POSITIONS);
    const cards = element.querySelectorAll<HTMLAnchorElement>('a.card');

    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('h2')?.textContent).toBe('With a game');
    expect(cards[0].textContent).toContain('White to play');
    expect(cards[0].textContent).toContain('Morphy – Duke Karl of Brunswick, Paris 1858');
    expect([...cards[0].querySelectorAll('.tags li')].map((tag) => tag.textContent)).toEqual([
      'Back rank',
      'windmill attack',
    ]);
    expect(cards[1].textContent).toContain('Black to play');
    expect(cards[1].querySelector('.source')).toBeNull();
  });

  it('should link each card to its position', async () => {
    const element = await setup(async () => POSITIONS);
    const cards = element.querySelectorAll<HTMLAnchorElement>('a.card');

    expect(cards[1].getAttribute('href')).toBe('/positions/2');
  });

  it('should show the texts in Spanish when Spanish is selected', async () => {
    const element = await setup(async () => POSITIONS, 'es');

    expect(element.querySelector('h1')?.textContent).toBe('Posiciones tácticas');
    expect(element.querySelector('a.card')?.textContent).toContain('Juegan blancas');
  });

  it('should announce an error and load again when retried', async () => {
    const positions = vi
      .fn<ContentLoaders['positions']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(POSITIONS);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'positions', children: POSITIONS_ROUTES }]),
        { provide: CONTENT_LOADERS, useValue: { positions } as Partial<ContentLoaders> },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/positions');
    const element = harness.routeNativeElement as HTMLElement;

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'The positions could not be loaded.',
      );
    });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelectorAll('a.card')).toHaveLength(2);
    });
  });

  it('should announce the loading state while the content arrives', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'positions', children: POSITIONS_ROUTES }]),
        {
          provide: CONTENT_LOADERS,
          useValue: { positions: () => new Promise(() => undefined) } as Partial<ContentLoaders>,
        },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/positions');

    expect(harness.routeNativeElement?.querySelector('[role="status"]')?.textContent).toContain(
      'Loading positions…',
    );
  });
});
