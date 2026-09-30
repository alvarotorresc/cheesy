import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_LOADERS, type ContentLoaders } from '../../core/content';
import { bundledContentLoaders } from '../../core/content/testing';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { buildHomeData, HERO_OPENING_IDS } from './home-data';
import { Home } from './home';

const loadData = async () => {
  const catalog = await bundledContentLoaders.openingCatalog();
  const endgames = await bundledContentLoaders.endgames();
  const positions = await bundledContentLoaders.positions();
  return { catalog, endgames, positions, data: buildHomeData(catalog, endgames, positions) };
};

describe('buildHomeData', () => {
  it('should take the hero lines, the Dragon and the Italian from the catalogue preview', async () => {
    const { data } = await loadData();

    expect(data.hero.map((line) => line.id)).toEqual([...HERO_OPENING_IDS]);
    expect(data.hero[0].frames).toHaveLength(data.hero[0].sans.length + 1);
    expect(data.dragon.sans.at(-1)).toBe('g6');
    expect(data.italian.sans).toHaveLength(8);
  });

  it('should count the real content', async () => {
    const { data, catalog, endgames, positions } = await loadData();

    expect(data.counts).toEqual({
      openings: catalog.length,
      endgames: endgames.length,
      positions: positions.length,
    });
  });

  it('should show exercises still, at their starting position, without any move', async () => {
    const { data, endgames, positions } = await loadData();

    for (const puzzle of data.puzzles) {
      expect(puzzle.frames).toHaveLength(1);
      expect(puzzle.frames[0].lastMove).toBeUndefined();
    }
    expect(data.puzzles).toHaveLength(3);
    expect(data.endgame.frames).toHaveLength(1);
    expect(data.endgame.frames[0].lastMove).toBeUndefined();
    expect(data.endgame.squares).toHaveLength(data.endgame.frames[0].pieces.length);
    expect(endgames.length).toBeGreaterThan(0);
    expect(positions.length).toBeGreaterThan(0);
  });
});

describe('Home', () => {
  let loaders: ContentLoaders;

  beforeEach(() => {
    loaders = { ...bundledContentLoaders };
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: CONTENT_LOADERS, useValue: loaders },
      ],
    });
    TestBed.inject(I18nService).setLang('es');
    TestBed.inject(ReadingModeService).setMode('notation');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should show the hero and a card for each section once the content is there', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Aperturas, finales y táctica');
    const links = Array.from(element.querySelectorAll('.sec-link'), (a) => a.getAttribute('href'));
    expect(links).toEqual(['/openings', '/endgames', '/positions', '/analysis']);
    expect(element.querySelector('.cta')?.getAttribute('href')).toBe('/openings/ruy-lopez');
    expect(element.querySelectorAll('app-mini-board')).toHaveLength(5);
  });

  it('should offer to try again when the content does not load', async () => {
    loaders.openingCatalog = () => Promise.reject(new Error('offline'));
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role=alert] button'),
    ).not.toBeNull();
  });
});
