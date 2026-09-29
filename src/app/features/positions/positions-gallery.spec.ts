import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS, type ContentLoaders, type CuratedPosition } from '../../core/content';
import { I18nService } from '../../core/i18n';
import { PROGRESS_STORE_LOADER, type PositionProgress } from '../../core/progress';
import { memoryProgressStore } from '../openings/testing/memory-progress-store';
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
  {
    id: 'two-moves',
    title: { es: 'Dos', en: 'Two' },
    fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    playerSide: 'white',
    solution: ['Ra8+', 'Kd7', 'Ra7+'],
    explanation: { es: 'Jaques.', en: 'Checks.' },
    tags: ['fork'],
  },
];

const row = (positionId: string, solves: number, firstTry: boolean): PositionProgress => ({
  positionId,
  solves,
  firstTry,
  spoiled: !firstTry,
  ...(solves > 0 ? { lastSolvedAt: 1_700_000_000_000 } : {}),
});

const setup = async (
  positions: ContentLoaders['positions'],
  options: { lang?: 'es' | 'en'; rows?: PositionProgress[] } = {},
) => {
  const memory = memoryProgressStore();
  for (const saved of options.rows ?? []) memory.positionRows.set(saved.positionId, saved);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'positions', children: POSITIONS_ROUTES }]),
      { provide: CONTENT_LOADERS, useValue: { positions } as Partial<ContentLoaders> },
      { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
    ],
  });
  TestBed.inject(I18nService).setLang(options.lang ?? 'en');
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/positions');
  const element = harness.routeNativeElement as HTMLElement;
  return { harness, element, memory };
};

const cards = (element: HTMLElement) => [...element.querySelectorAll<HTMLAnchorElement>('a.card')];

const ready = async (positions: ContentLoaders['positions'] = async () => POSITIONS, o = {}) => {
  const page = await setup(positions, o);
  await vi.waitFor(() => {
    page.harness.detectChanges();
    expect(cards(page.element).length).toBeGreaterThan(0);
  });
  return page;
};

describe('PositionsGallery', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should show a card per position with only the side and the number of moves', async () => {
    const { element } = await ready();
    const shown = cards(element);

    expect(shown).toHaveLength(3);
    expect(shown[0].textContent).toContain('White to play');
    expect(shown[0].textContent).toContain('1 move of yours');
    expect(shown[1].textContent).toContain('Black to play');
    expect(element.querySelectorAll('app-mini-board')).toHaveLength(3);
  });

  it('should not tell the title, themes or game of any position (no spoilers)', async () => {
    const { element } = await ready();
    const text = element.textContent ?? '';

    for (const spoiler of ['With a game', 'Morphy', 'Back rank', 'windmill', 'Smothered', 'Pin']) {
      expect(text).not.toContain(spoiler);
    }
    for (const card of cards(element)) {
      expect(card.getAttribute('aria-label')).not.toContain('Morphy');
    }
  });

  it('should group the positions by moves of the player, fewest first', async () => {
    const { element } = await ready();

    expect([...element.querySelectorAll('.group h2')].map((h) => h.textContent)).toEqual([
      'One move',
      'Two moves',
    ]);
  });

  it('should link each card to the number of its position in the whole gallery', async () => {
    const { element } = await ready();

    expect(cards(element).map((card) => card.getAttribute('href'))).toEqual([
      '/positions/1',
      '/positions/2',
      '/positions/3',
    ]);
  });

  it('should show the status of each position from the saved progress', async () => {
    const { element } = await ready(async () => POSITIONS, {
      rows: [
        row('with-source', 1, true),
        row('black-to-play', 2, false),
        row('two-moves', 0, false),
      ],
    });

    const labels = cards(element).map((card) => card.getAttribute('aria-label'));
    expect(labels[0]).toContain('First try.');
    expect(labels[1]).toContain('Solved.');
    expect(labels[2]).toContain('Unsolved.');
    expect(cards(element)[0].textContent).toContain('Repeat');
    expect(cards(element)[2].textContent).toContain('Solve');
    expect(element.querySelector('.result-count')?.textContent).toContain('3 positions, 2 solved');
  });

  it('should filter by side and by status, keeping the number of each card', async () => {
    const page = await ready(async () => POSITIONS, { rows: [row('with-source', 1, true)] });

    page.element
      .querySelector<HTMLInputElement>('input[name="side"][value="black"]')
      ?.dispatchEvent(new Event('change'));
    page.harness.detectChanges();
    expect(cards(page.element).map((card) => card.getAttribute('href'))).toEqual(['/positions/2']);
    expect(page.element.querySelector('.result-count')?.textContent).toContain('1 of 3 positions');

    page.element
      .querySelector<HTMLInputElement>('input[name="status"][value="first"]')
      ?.dispatchEvent(new Event('change'));
    page.harness.detectChanges();
    expect(page.element.textContent).toContain('No position matches these filters.');

    page.element.querySelector<HTMLButtonElement>('.filter-foot .text-button')?.click();
    page.harness.detectChanges();
    expect(cards(page.element)).toHaveLength(3);
  });

  it('should tell the number of active filters on the button that folds them', async () => {
    const page = await ready();
    page.element
      .querySelector<HTMLInputElement>('input[name="own"][value="1"]')
      ?.dispatchEvent(new Event('change'));
    page.harness.detectChanges();

    expect(page.element.querySelector('.count-badge')?.textContent).toBe('1');
    const toggle = page.element.querySelector<HTMLButtonElement>('.filters-toggle');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    toggle?.click();
    page.harness.detectChanges();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(page.element.querySelector('.filters')?.classList).toContain('open');
  });

  it('should clear the saved progress of positions after a confirmation', async () => {
    const page = await ready(async () => POSITIONS, { rows: [row('with-source', 1, true)] });
    HTMLDialogElement.prototype.showModal ??= () => undefined;
    const dialog = page.element.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();

    page.element.querySelector<HTMLButtonElement>('.privacy .text-button')?.click();
    expect(dialog.showModal).toHaveBeenCalled();
    page.element.querySelector<HTMLButtonElement>('dialog .danger')?.click();

    await vi.waitFor(() => expect(page.memory.positionRows.size).toBe(0));
    await vi.waitFor(() => {
      page.harness.detectChanges();
      expect(page.element.querySelector('.status-msg')?.textContent).toBe('Progress cleared.');
      expect(cards(page.element)[0].getAttribute('aria-label')).toContain('Unsolved.');
    });
  });

  it('should say there is nothing to clear when no progress is saved', async () => {
    const page = await ready();

    page.element.querySelector<HTMLButtonElement>('.privacy .text-button')?.click();
    page.harness.detectChanges();

    expect(page.element.querySelector('.status-msg')?.textContent).toBe(
      'There is no saved progress.',
    );
  });

  it('should show the texts in Spanish when Spanish is selected', async () => {
    const { element } = await ready(async () => POSITIONS, { lang: 'es' });

    expect(element.querySelector('h1')?.textContent).toBe('Posiciones');
    expect(cards(element)[0].textContent).toContain('Juegan blancas');
    expect(cards(element)[0].textContent).toContain('1 jugada tuya');
  });

  it('should announce an error and load again when retried', async () => {
    const positions = vi
      .fn<ContentLoaders['positions']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(POSITIONS);
    const { harness, element } = await setup(positions);

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'The positions could not be loaded.',
      );
    });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(cards(element)).toHaveLength(3);
    });
  });

  it('should announce the loading state while the content arrives', async () => {
    const { element } = await setup(() => new Promise(() => undefined));

    expect(
      element.querySelector('.group[aria-busy="true"] [role="status"]')?.textContent,
    ).toContain('Loading positions…');
  });
});
