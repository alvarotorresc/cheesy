import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS, type ContentLoaders, type CuratedPosition } from '../../core/content';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
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
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  };

  afterEach(() => {
    localStorage.clear();
  });

  describe('loading', () => {
    it('should announce the loading state while the content arrives', async () => {
      await open('/positions/smothered', () => new Promise(() => undefined));

      expect(text('[role="status"]')).toBe('Loading positions…');
    });

    it('should announce an error and load again when retried', async () => {
      const positions = vi
        .fn<ContentLoaders['positions']>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(POSITIONS);
      await open('/positions/smothered', positions);
      await vi.waitFor(() => expect(text('[role="alert"]')).toContain('could not be loaded'));

      button('Try again').click();

      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));
    });

    it.each(['unknown', '__proto__', 'constructor', '%3Cscript%3E'])(
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

    it('should refuse a position of the content that cannot be played', async () => {
      await open('/positions/broken');

      await vi.waitFor(() =>
        expect(text('[role="alert"]')).toBe('This position cannot be played.'),
      );
      expect(element().querySelector('app-board')).toBeNull();
    });
  });

  describe('guessing', () => {
    beforeEach(async () => {
      await open('/positions/smothered');
      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));
    });

    it('should show the position from the side to play with its details', () => {
      expect(board().orientation()).toBe('white');
      expect(board().viewOnly()).toBe(false);
      expect(element().textContent).toContain('White to play');
      expect(element().textContent).toContain('Lucena, 1497');
      expect(text('.tags li')).toBe('Smothered mate');
      expect(text('.status')).toBe('Find the winning line: 2 moves of yours.');
      expect(element().textContent).not.toContain('The queen is sacrificed.');
    });

    it('should say a wrong move was wrong, take it back and keep the board playable', async () => {
      await moveOnBoard({ from: 'd5', to: 'd6' });

      expect(text('.status')).toBe('Qd6 is not the move. It has been taken back: try another one.');
      expect(game().moves()).toEqual([]);
      expect(board().viewOnly()).toBe(false);
    });

    it('should show a hint with the piece to move', async () => {
      button('Hint').click();
      await harness.fixture.whenStable();

      expect(text('.hint')).toBe('Move the queen on d5.');
      expect(button('Hint').getAttribute('aria-disabled')).toBe('true');
    });

    it('should play the reply and list the moves when a right move is found', async () => {
      await moveOnBoard({ from: 'd5', to: 'g8' });

      expect(text('.status')).toBe('Qg8+ is right. Your opponent answers Rxg8. Keep going.');
      expect(
        [...element().querySelectorAll('.steps li')].map((item) => item.textContent?.trim()),
      ).toEqual(['1. Qg8+', '1… Rxg8']);
    });

    it('should finish, explain and allow replaying when the whole line is found', async () => {
      await moveOnBoard({ from: 'd5', to: 'g8' });
      await moveOnBoard({ from: 'h6', to: 'f7' });

      expect(text('.status')).toBe('Nf7# is right. Solved. Step through the line to review it.');
      expect(element().textContent).toContain('The queen is sacrificed.');
      expect(board().viewOnly()).toBe(true);
      expect(text('.step')).toBe('Your move: 2. Nf7# (checkmate).');
    });
  });

  describe('replay', () => {
    beforeEach(async () => {
      await open('/positions/smothered');
      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));
      button('Show solution').click();
      await harness.fixture.whenStable();
    });

    it('should show the whole solution from the starting position', () => {
      expect(text('.status')).toBe('This is the solution. Step through the line to review it.');
      expect(text('.step')).toBe('Starting position.');
      expect(element().querySelectorAll('.steps button')).toHaveLength(3);
      expect(button('Start of the solution').getAttribute('aria-disabled')).toBe('true');
    });

    it('should describe each step when moving through the solution with the buttons', async () => {
      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step')).toBe('Your move: 1. Qg8+ (check).');

      button('Next move').click();
      await harness.fixture.whenStable();
      expect(text('.step')).toBe('Reply: 1… Rxg8 (capture).');

      button('Previous move').click();
      button('End of the solution').click();
      await harness.fixture.whenStable();
      expect(game().ply()).toBe(3);
      expect(button('Next move').getAttribute('aria-disabled')).toBe('true');
    });

    it('should move through the solution with the arrow keys', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      await harness.fixture.whenStable();

      expect(game().ply()).toBe(1);
      expect(
        element().querySelector('.steps button[aria-current="step"]')?.textContent?.trim(),
      ).toBe('1. Qg8+');
    });

    it('should jump to the end and the start with End and Home inside the controls', async () => {
      const controls = element().querySelector('[role="group"]') as HTMLElement;

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
      expect(document.activeElement).toBe(element().querySelector('.status'));
    });

    it('should start the exercise again when asked', async () => {
      button('Start again').click();
      await harness.fixture.whenStable();

      expect(text('.status')).toBe('Find the winning line: 2 moves of yours.');
      expect(board().viewOnly()).toBe(false);
      expect(element().querySelector('.steps')).toBeNull();
    });
  });

  describe('navigation between positions', () => {
    it('should link to the next position only when on the first one', async () => {
      await open('/positions/smothered');
      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));

      const links = [...element().querySelectorAll('.neighbours a')];
      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/positions/kieninger']);
    });

    it('should show a black position from the black side', async () => {
      await open('/positions/kieninger');
      await vi.waitFor(() => expect(text('h1')).toBe('Kieninger Trap'));

      expect(board().orientation()).toBe('black');
      expect(text('.status')).toBe('Find the winning move.');
      const links = [...element().querySelectorAll('.neighbours a')];
      expect(links.map((link) => link.textContent?.trim())).toEqual([
        '‹ Previous position',
        'Next position ›',
      ]);
    });

    it('should start a fresh exercise and focus the title when moving to another position', async () => {
      await open('/positions/smothered');
      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));
      await moveOnBoard({ from: 'd5', to: 'd6' });

      await harness.navigateByUrl('/positions/kieninger');
      await vi.waitFor(() => expect(text('h1')).toBe('Kieninger Trap'));

      expect(text('.status')).toBe('Find the winning move.');
      expect(document.activeElement).toBe(element().querySelector('h1'));
    });

    it('should keep the focus where it is on the first position shown', async () => {
      await open('/positions/smothered');
      await vi.waitFor(() => expect(text('h1')).toBe('Smothered mate'));

      expect(document.activeElement).not.toBe(element().querySelector('h1'));
    });
  });
});
