import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS } from '../../core/content';
import { bundledContentLoaders } from '../../core/content/testing';
import { I18nService } from '../../core/i18n';
import { PROGRESS_STORE_LOADER } from '../../core/progress';
import { memoryProgressStore } from '../openings/testing/memory-progress-store';
import { applyFilters, groupByCategory, NO_FILTERS, pieceCount } from './endgame-catalog';
import { fill, goalStatus } from './endgame-goal';
import { Endgames } from './endgames';
import { ENGINE_FIRST, LUCENA, SQUARE_RULE } from './testing';

const render = async (endgames: () => Promise<unknown>, memory = memoryProgressStore()) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CONTENT_LOADERS, useValue: { ...bundledContentLoaders, endgames } },
      { provide: PROGRESS_STORE_LOADER, useValue: memory.loader },
    ],
  });
  TestBed.inject(I18nService).setLang('en');
  const fixture = TestBed.createComponent(Endgames);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, memory };
};

const put = (memory: ReturnType<typeof memoryProgressStore>, id: string) =>
  memory.store.endgames.put({
    endgameId: id,
    completions: 1,
    firstCompletedAt: 1,
    lastCompletedAt: 1,
  });

describe('Endgames list', () => {
  afterEach(() => localStorage.clear());

  it('should list the endgames by category with their goal, side and a board', async () => {
    const { element } = await render(async () => [SQUARE_RULE, LUCENA]);

    const headings = [...element.querySelectorAll('h2.group-head, .group-head h2')].map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual(['King and pawn', 'Rook and pawn']);
    const links = [...element.querySelectorAll('.card a.button')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/endgames/kp-square-rule-defence',
      '/endgames/lucena-position',
    ]);
    const cards = [...element.querySelectorAll('.card')];
    expect(cards[0].textContent).toContain('Draw');
    expect(cards[0].textContent).toContain('You play Black');
    expect(cards[1].textContent).toContain('Win');
    expect(cards[0].querySelector('app-mini-board [role="img"]')?.getAttribute('aria-label')).toBe(
      'Starting position of Rule of the square: defence, 3 pieces, seen from Black',
    );
  });

  it('should list every bundled endgame and count none as passed', async () => {
    const { element } = await render(bundledContentLoaders.endgames);

    expect(element.querySelectorAll('.card')).toHaveLength(14);
    expect(element.querySelector('.result-count')?.textContent).toBe('14 endgames');
    expect(element.querySelector('.done-summary')?.textContent).toContain(
      'You have not passed any endgame yet',
    );
    expect(element.querySelector('.seal')).toBeNull();
  });

  it('should mark the passed endgames with a seal and offer to repeat them', async () => {
    const memory = memoryProgressStore();
    await put(memory, 'lucena-position');
    await put(memory, 'gone-from-the-content');
    const { element } = await render(async () => [SQUARE_RULE, LUCENA], memory);

    const cards = [...element.querySelectorAll('.card')];
    expect(cards[0].querySelector('.seal')).toBeNull();
    expect(cards[0].querySelector('a.button')?.textContent?.trim()).toBe('Practise');
    expect(cards[1].querySelector('.seal')?.textContent).toContain('Passed');
    expect(cards[1].querySelector('a.button')?.textContent?.trim()).toBe('Repeat');
    // Only ids that are still in the content count.
    expect(element.querySelector('.done-summary')?.textContent).toContain('1 of 2 passed');
  });

  it('should filter by category and goal, and say when nothing matches', async () => {
    const { fixture, element } = await render(async () => [SQUARE_RULE, LUCENA, ENGINE_FIRST]);
    const tabs = [...element.querySelectorAll<HTMLButtonElement>('.tab')];
    expect(tabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 3',
      'King and pawn 1',
      'Rook and pawn 1',
      'Basic mates 1',
    ]);

    tabs[3].click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.card')).toHaveLength(1);
    expect(element.querySelector('.result-count')?.textContent).toBe('1 endgame of 3');

    element.querySelector<HTMLInputElement>('input[value="draw"]')?.click();
    await fixture.whenStable();
    expect(element.querySelector('.notice')?.textContent).toContain(
      'No endgame matches these filters.',
    );

    element.querySelector<HTMLButtonElement>('.notice .button')?.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.card')).toHaveLength(3);
  });

  describe('opened on a category from the address', () => {
    const open = async (url: string) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'endgames', component: Endgames }]),
          {
            provide: CONTENT_LOADERS,
            useValue: {
              ...bundledContentLoaders,
              endgames: async () => [SQUARE_RULE, LUCENA, ENGINE_FIRST],
            },
          },
          { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
        ],
      });
      TestBed.inject(I18nService).setLang('en');
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      const element = harness.routeNativeElement as HTMLElement;
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(element.querySelector('.tab')).not.toBeNull();
      });
      return element;
    };

    it('should show only that category, with its tab pressed', async () => {
      const element = await open('/endgames?category=Basic%20mates');
      expect(element.querySelectorAll('.card')).toHaveLength(1);
      expect(element.querySelector('.tab[aria-pressed="true"]')?.textContent).toContain(
        'Basic mates',
      );
    });

    it('should show everything for a category it does not know', async () => {
      const element = await open('/endgames?category=Nope');
      expect(element.querySelectorAll('.card')).toHaveLength(3);
    });
  });

  it('should delete only the endgames progress after confirming', async () => {
    const memory = memoryProgressStore();
    await put(memory, 'lucena-position');
    const { fixture, element } = await render(async () => [LUCENA], memory);
    const dialog = element.querySelector('dialog') as HTMLDialogElement;
    // The test DOM has no modal dialogs.
    const showModal = vi.fn();
    dialog.showModal = showModal;
    dialog.close = vi.fn();

    element.querySelector<HTMLButtonElement>('.privacy .text-button')?.click();
    expect(showModal).toHaveBeenCalled();
    element.querySelector<HTMLButtonElement>('dialog .button.danger')?.click();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(memory.endgameRows.size).toBe(0);
    expect(element.querySelector('.status-msg')?.textContent).toBe('Progress deleted.');
    expect(element.querySelector('.seal')).toBeNull();
  });

  it('should say there is nothing to delete when no progress is saved', async () => {
    const { fixture, element } = await render(async () => [LUCENA]);

    element.querySelector<HTMLButtonElement>('.privacy .text-button')?.click();
    await fixture.whenStable();

    expect(element.querySelector('.status-msg')?.textContent).toBe('There is no saved progress.');
  });

  it('should show a skeleton while loading', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CONTENT_LOADERS,
          useValue: { ...bundledContentLoaders, endgames: () => new Promise(() => undefined) },
        },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    const fixture = TestBed.createComponent(Endgames);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.skeleton')).toHaveLength(4);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading endgames');
    expect(element.querySelector('.filters')).toBeNull();
  });

  it('should show an error with a retry when the content cannot be loaded', async () => {
    let calls = 0;
    const { fixture, element } = await render(async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return [LUCENA];
    });

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'The endgames could not be loaded.',
    );

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('.card')).toHaveLength(1);
  });
});

describe('applyFilters and pieceCount', () => {
  it('should keep the order and combine the two filters', () => {
    const all = [LUCENA, SQUARE_RULE, ENGINE_FIRST];

    expect(applyFilters(all, NO_FILTERS)).toEqual(all);
    expect(applyFilters(all, { category: 'King and pawn', goal: 'all' })).toEqual([SQUARE_RULE]);
    expect(applyFilters(all, { category: 'all', goal: 'win' })).toEqual([LUCENA, ENGINE_FIRST]);
    expect(applyFilters(all, { category: 'Rook and pawn', goal: 'draw' })).toEqual([]);
  });

  it('should count the pieces of a position, kings included', () => {
    expect(pieceCount(LUCENA.fen)).toBe(5);
    expect(pieceCount(SQUARE_RULE.fen)).toBe(3);
    expect(pieceCount('not a fen')).toBe(0);
  });
});

describe('groupByCategory', () => {
  it('should keep the order of categories and endgames as they appear', () => {
    const other = { ...LUCENA, id: 'other' };

    const groups = groupByCategory([LUCENA, SQUARE_RULE, other]);

    expect(groups.map((group) => group.key)).toEqual(['Rook and pawn', 'King and pawn']);
    expect(groups[0].endgames.map((endgame) => endgame.id)).toEqual(['lucena-position', 'other']);
  });

  it('should return no groups when there are no endgames', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('goalStatus', () => {
  const win = { goal: 'win', playerSide: 'white' } as const;
  const draw = { goal: 'draw', playerSide: 'black' } as const;

  it('should meet a win goal only by winning', () => {
    expect(goalStatus(win, { reason: 'checkmate', winner: 'white' })).toBe('achieved');
    expect(goalStatus(win, { reason: 'stalemate', winner: undefined })).toBe('failed');
    expect(goalStatus(win, { reason: 'fifty-move-rule', winner: undefined })).toBe('failed');
    expect(goalStatus(win, { reason: 'checkmate', winner: 'black' })).toBe('failed');
  });

  it('should meet a draw goal by drawing or winning, not by losing', () => {
    expect(goalStatus(draw, { reason: 'threefold-repetition', winner: undefined })).toBe(
      'achieved',
    );
    expect(goalStatus(draw, { reason: 'checkmate', winner: 'black' })).toBe('achieved');
    expect(goalStatus(draw, { reason: 'checkmate', winner: 'white' })).toBe('failed');
  });
});

describe('fill', () => {
  it('should replace known placeholders and keep unknown ones', () => {
    expect(fill('Mate in {n} ({x})', { n: 3 })).toBe('Mate in 3 ({x})');
  });

  it('should not read inherited properties as values', () => {
    expect(fill('{toString}', {})).toBe('{toString}');
  });
});
