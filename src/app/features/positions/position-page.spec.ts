import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS, type ContentLoaders, type CuratedPosition } from '../../core/content';
import { GameService } from '../../core/game';
import { PROGRESS_STORE_LOADER } from '../../core/progress';
import { memoryProgressStore } from '../openings/testing/memory-progress-store';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { BoardComponent, type BoardMove } from '../../shared/board';
import { PositionPage } from './position-page';
import { POSITIONS_ROUTES } from './positions.routes';

const SMOTHERED: CuratedPosition = {
  id: 'smothered',
  title: { es: 'Mate de la coz', en: 'Smothered mate' },
  source: 'Lucena, 1497',
  fen: '2q2r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1',
  playerSide: 'white',
  solution: ['Qg8+', 'Rxg8', 'Nf7#'],
  explanation: { es: 'La dama se sacrifica.', en: 'The queen is sacrificed.' },
  tags: ['smothered-mate'],
};

const KIENINGER: CuratedPosition = {
  id: 'kieninger',
  title: { es: 'Trampa de Kieninger', en: 'Kieninger Trap' },
  fen: 'r1b1k2r/ppppqppp/2n5/4n3/1PP2B2/5N2/1P1NPPPP/R2QKB1R b KQkq - 0 8',
  playerSide: 'black',
  solution: ['Nd3#'],
  explanation: { es: 'Mate ahogado.', en: 'Smothered.' },
  tags: ['pin'],
};

const BROKEN: CuratedPosition = { ...SMOTHERED, id: 'broken', solution: ['Kxg8'] };

const POSITIONS = [SMOTHERED, KIENINGER, BROKEN];

/** Text of an element as a sighted reader sees it, without the sentences kept for screen readers. */
const visibleText = (node: Element | null): string => {
  const copy = node?.cloneNode(true) as Element | undefined;
  copy?.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
  return (copy?.textContent ?? '').replace(/\s+/g, ' ').trim();
};

describe('PositionPage', () => {
  let harness: RouterTestingHarness;

  const element = (): HTMLElement => harness.routeNativeElement as HTMLElement;

  const text = (selector: string): string =>
    element().querySelector(selector)?.textContent?.trim() ?? '';

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element().querySelectorAll('button')).find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const board = (): BoardComponent =>
    harness.fixture.debugElement.query(By.directive(BoardComponent))
      .componentInstance as BoardComponent;

  const moveOnBoard = async (move: BoardMove): Promise<void> => {
    harness.fixture.debugElement
      .query(By.directive(BoardComponent))
      .triggerEventHandler('move', move);
    await harness.fixture.whenStable();
  };

  const game = (): GameService =>
    harness.fixture.debugElement.query(By.directive(PositionPage)).injector.get(GameService);

  const open = async (
    url: string,
    positions: ContentLoaders['positions'] = async () => POSITIONS,
  ): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'positions', children: POSITIONS_ROUTES }]),
        { provide: CONTENT_LOADERS, useValue: { positions } as Partial<ContentLoaders> },
        { provide: PROGRESS_STORE_LOADER, useValue: memoryProgressStore().loader },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    // Other specs may leave a stored mode behind: these expectations are written in notation.
    TestBed.inject(ReadingModeService).setMode('notation');
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  };

  afterEach(() => {
    localStorage.clear();
  });

  describe('loading', () => {
    it('should announce the loading state while the content arrives', async () => {
      await open('/positions/3', () => new Promise(() => undefined));

      expect(text('[role="status"]')).toBe('Loading positions…');
    });

    it('should announce an error and load again when retried', async () => {
      const positions = vi
        .fn<ContentLoaders['positions']>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(POSITIONS);
      await open('/positions/3', positions);
      await vi.waitFor(() => expect(text('[role="alert"]')).toContain('could not be loaded'));

      button('Try again').click();

      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
    });

    it.each(['unknown', '__proto__', 'constructor', '%3Cscript%3E', '0', '01', '4', '9999'])(
      'should say the position does not exist when the id is %s',
      async (id) => {
        await open(`/positions/${id}`);

        await vi.waitFor(() =>
          expect(text('[role="alert"]')).toBe('This position does not exist.'),
        );
        expect(element().querySelector('app-board')).toBeNull();
        expect(element().querySelector('a')?.getAttribute('href')).toBe('/positions');
      },
    );

    it('should number the positions from the fewest moves to the most, keeping the content order', async () => {
      await open('/positions/1');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      await harness.navigateByUrl('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
    });

    it('should send an old link by content id to the number of the position', async () => {
      await open('/positions/smothered');

      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
      expect(TestBed.inject(Router).url).toBe('/positions/3');
    });

    it('should not keep the old address in the history', async () => {
      await open('/positions/kieninger');
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/positions/1'));

      TestBed.inject(Location).back();
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).not.toBe('/positions/kieninger');
    });

    it('should refuse a position of the content that cannot be played', async () => {
      await open('/positions/2');

      await vi.waitFor(() =>
        expect(text('[role="alert"]')).toBe('This position cannot be played.'),
      );
      expect(element().querySelector('app-board')).toBeNull();
    });
  });

  describe('guessing', () => {
    beforeEach(async () => {
      await open('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
    });

    it('should keep the browser tab neutral, without the name of the position', () => {
      expect(document.title).toBe('Position 3 of 3 · Cheesy');
    });

    it('should not tell the title, themes, game, explanation or analysis link before the end', () => {
      const shown = element().textContent ?? '';
      for (const spoiler of ['Smothered mate', 'Lucena, 1497', 'The queen is sacrificed.']) {
        expect(shown).not.toContain(spoiler);
      }
      expect(element().querySelector('.theme-tag')).toBeNull();
      expect(element().querySelector('a[href^="/analysis"]')).toBeNull();
      expect(element().querySelector('.board-col')?.getAttribute('aria-label')).toBe(
        'Board: White to play.',
      );
    });

    it('should show the position from the side to play with its details', () => {
      expect(board().orientation()).toBe('white');
      expect(board().viewOnly()).toBe(false);
      expect(text('h1')).toBe('White to play2 moves of yours');
      expect(text('.message')).toContain('Find the winning line: 2 moves of yours.');
    });

    it('should say a wrong move was wrong, take it back and keep the board playable', async () => {
      await moveOnBoard({ from: 'd5', to: 'd6' });

      expect(text('.message')).toContain(
        'That was not the move: Qd6 has been taken back. Try another one.',
      );
      expect(game().moves()).toEqual([]);
      expect(board().viewOnly()).toBe(false);
    });

    it('should show a hint with the piece to move', async () => {
      button('Hint').click();
      await harness.fixture.whenStable();

      expect(text('.hint-line')).toBe('Hint: move the queen on d5.');
      expect(button('Hint').getAttribute('aria-disabled')).toBe('true');
    });

    it('should play the reply and list the moves when a right move is found', async () => {
      await moveOnBoard({ from: 'd5', to: 'g8' });

      expect(text('.message')).toContain('Correct: Qg8+. Your opponent answers Rxg8. Keep going.');
      expect([...element().querySelectorAll('.steps li')].map((item) => visibleText(item))).toEqual(
        ['1. Qg8+', '1… Rxg8'],
      );
    });

    it('should keep each number and its move in one run of text inside the flex box', async () => {
      await moveOnBoard({ from: 'd5', to: 'g8' });

      // A flex box drops the space between a text and an element; one wrapper keeps "1. Qg8+".
      for (const item of element().querySelectorAll('.steps span.plain')) {
        expect(item.children).toHaveLength(1);
        expect(item.firstElementChild?.querySelector('app-move')).not.toBeNull();
      }
    });

    it('should tell the reply in words, in lower case inside the sentence', async () => {
      TestBed.inject(I18nService).setLang('es');
      TestBed.inject(ReadingModeService).setMode('words');
      await moveOnBoard({ from: 'd5', to: 'g8' });

      expect(text('.message')).toContain(
        'Correcto: dama a g8, jaque. El rival responde torre captura en g8. Sigue.',
      );
    });

    it('should tell a wrong move in words', async () => {
      TestBed.inject(ReadingModeService).setMode('words');
      await moveOnBoard({ from: 'd5', to: 'd6' });

      expect(text('.message')).toContain(
        'That was not the move: queen to d6 has been taken back. Try another one.',
      );
    });

    it('should finish, explain and allow replaying when the whole line is found', async () => {
      await moveOnBoard({ from: 'd5', to: 'g8' });
      await moveOnBoard({ from: 'h6', to: 'f7' });

      expect(text('.message')).toContain('Correct: Nf7#. Solved.');
      expect(element().textContent).toContain('The queen is sacrificed.');
      expect(text('h1')).toBe('Smothered mate');
      expect(document.title).toBe('Smothered mate · Cheesy');
      expect(text('.theme-tag')).toBe('Smothered mate');
      expect(text('.source dd')).toBe('Lucena, 1497');
      expect(element().querySelector('a[href^="/analysis"]')?.getAttribute('href')).toMatch(
        /from=position(%3A|:)smothered/,
      );
      expect(board().viewOnly()).toBe(true);
      expect(text('.step-text')).toBe('Your move: 2. Nf7# (checkmate).');
    });
  });

  describe('replay', () => {
    beforeEach(async () => {
      await open('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
      button('Show solution').click();
      await harness.fixture.whenStable();
    });

    it('should show the whole solution from the starting position', () => {
      expect(text('.message')).toContain('This is the solution.');
      expect(text('.step-text')).toBe('Starting position.');
      expect(element().querySelectorAll('.steps button')).toHaveLength(3);
      for (const step of element().querySelectorAll('.steps button')) {
        expect(step.children).toHaveLength(1);
        expect(step.firstElementChild?.querySelector('app-move')).not.toBeNull();
      }
      expect(button('Start of the solution').getAttribute('aria-disabled')).toBe('true');
    });

    it('should describe each step when moving through the solution with the buttons', async () => {
      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step-text')).toBe('Your move: 1. Qg8+ (check).');

      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step-text')).toBe('Reply: 1… Rxg8 (capture).');

      button('Previous move').click();
      button('End of the solution').click();
      await harness.fixture.whenStable();
      expect(game().ply()).toBe(3);
      expect(button('Next move').getAttribute('aria-disabled')).toBe('true');
    });

    it('should tell each step as a sentence in lower case in words mode, with no notes', async () => {
      TestBed.inject(ReadingModeService).setMode('words');
      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step-text')).toBe('Your move: 1. queen to g8, check.');
      expect(
        element().querySelector('.steps button[aria-current="step"]')?.getAttribute('aria-label'),
      ).toBe('Your move 1. queen to g8, check');

      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step-text')).toBe('Reply: 1… rook takes on g8.');

      TestBed.inject(I18nService).setLang('es');
      await harness.fixture.whenStable();
      expect(text('.step-text')).toBe('Respuesta: 1… torre captura en g8.');
    });

    it('should move through the solution with the arrow keys', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      await harness.fixture.whenStable();

      expect(game().ply()).toBe(1);
      expect(visibleText(element().querySelector('.steps button[aria-current="step"]'))).toBe(
        '1. Qg8+',
      );
    });

    it('should leave the arrow keys to a form field', () => {
      const field = document.body.appendChild(document.createElement('select'));

      try {
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(game().ply()).toBe(0);
      } finally {
        field.remove();
      }
    });

    it('should jump to the end and the start with End and Home inside the controls', async () => {
      const controls = element().querySelector('.replay-controls') as HTMLElement;

      controls.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(game().ply()).toBe(3);

      controls.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(game().ply()).toBe(0);
    });

    it('should jump to a step when it is selected in the list', async () => {
      (element().querySelectorAll('.steps button')[1] as HTMLButtonElement).click();
      await harness.fixture.whenStable();

      expect(game().ply()).toBe(2);
    });

    it('should keep the focus on the exercise message when the solution is shown', () => {
      expect(document.activeElement).toBe(element().querySelector('.message'));
    });

    it('should start the exercise again when asked', async () => {
      button('Start again').click();
      await harness.fixture.whenStable();

      expect(text('.message')).toContain('Find the winning line: 2 moves of yours.');
      expect(board().viewOnly()).toBe(false);
      expect(element().querySelector('.steps')).toBeNull();
    });
  });

  describe('navigation between positions', () => {
    it('should link to the next position only when on the first one', async () => {
      await open('/positions/1');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      const links = [...element().querySelectorAll('.neighbours a[href]')];
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/positions/2']);
    });

    it('should link to the previous position only when on the last one', async () => {
      await open('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      const links = [...element().querySelectorAll('.neighbours a[href]')];
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/positions/2']);
    });

    it('should show a black position from the black side', async () => {
      await open('/positions/1');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      expect(board().orientation()).toBe('black');
      expect(text('.message')).toContain('Find the winning move.');
      expect(text('.where')).toBe('Position 1 of 3');
      const links = [...element().querySelectorAll('.neighbours a[href]')];
      expect(links.map((link) => link.textContent?.trim())).toEqual(['Next ›']);
      expect(element().querySelector('.neighbours a[aria-disabled="true"]')?.textContent).toContain(
        'Previous',
      );
    });

    it('should start a fresh exercise and focus the title when moving to another position', async () => {
      await open('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());
      await moveOnBoard({ from: 'd5', to: 'd6' });

      await harness.navigateByUrl('/positions/1');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      expect(text('.message')).toContain('Find the winning move.');
      expect(document.activeElement).toBe(element().querySelector('h1'));
    });

    it('should keep the focus where it is on the first position shown', async () => {
      await open('/positions/3');
      await vi.waitFor(() => expect(element().querySelector('app-board')).not.toBeNull());

      expect(document.activeElement).not.toBe(element().querySelector('h1'));
    });
  });
});
