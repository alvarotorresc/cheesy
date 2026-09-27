import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_LOADERS } from '../../core/content';
import { bundledContentLoaders } from '../../core/content/testing';
import { I18nService } from '../../core/i18n';
import { groupByCategory } from './endgame-catalog';
import { fill, goalStatus } from './endgame-goal';
import { Endgames } from './endgames';
import { LUCENA, SQUARE_RULE } from './testing';

const render = async (endgames: () => Promise<unknown>) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CONTENT_LOADERS, useValue: { ...bundledContentLoaders, endgames } },
    ],
  });
  TestBed.inject(I18nService).setLang('en');
  const fixture = TestBed.createComponent(Endgames);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('Endgames catalogue', () => {
  afterEach(() => localStorage.clear());

  it('should list the endgames by category with their goal and side', async () => {
    const { element } = await render(async () => [SQUARE_RULE, LUCENA]);

    const headings = [...element.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['King and pawn', 'Rook and pawn']);
    const links = [...element.querySelectorAll('a.card')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/kp-square-rule-defence',
      '/lucena-position',
    ]);
    expect(links[0].textContent).toContain('Draw');
    expect(links[0].textContent).toContain('You play Black');
    expect(links[1].textContent).toContain('Win');
  });

  it('should list every bundled endgame', async () => {
    const { element } = await render(bundledContentLoaders.endgames);

    expect(element.querySelectorAll('a.card')).toHaveLength(14);
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

    expect(element.querySelectorAll('a.card')).toHaveLength(1);
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
