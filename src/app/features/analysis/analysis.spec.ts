import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '../../core/game';
import { I18nService } from '../../core/i18n';
import { Analysis } from './analysis';

class ResizeObserverStub {
  observe(): void {
    return;
  }
  disconnect(): void {
    return;
  }
}

describe('Analysis', () => {
  let fixture: ComponentFixture<Analysis>;
  let element: HTMLElement;
  let game: GameService;

  const button = (label: string): HTMLButtonElement => {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  };

  const status = (): string => element.querySelector('[role="status"]')?.textContent?.trim() ?? '';

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    fixture = TestBed.createComponent(Analysis);
    TestBed.inject(I18nService).setLang('en');
    element = fixture.nativeElement as HTMLElement;
    game = fixture.debugElement.injector.get(GameService);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('should provide its own game instance instead of a global one when created', () => {
    expect(game).toBeInstanceOf(GameService);
    expect(TestBed.inject(GameService, null)).toBeNull();
  });

  it('should show the board, the side to move and an empty move list when created', () => {
    expect(element.querySelector('app-board cg-board')).not.toBeNull();
    expect(status()).toBe('White to move');
    expect(element.textContent).toContain('No moves yet.');
  });

  it('should list the moves and update the status when moves are played', async () => {
    game.playSan('e4');
    game.playSan('e5');
    await fixture.whenStable();

    expect(element.querySelectorAll('app-move-list button')).toHaveLength(2);
    expect(status()).toBe('White to move');
  });

  it('should announce checkmate when the game ends', async () => {
    for (const san of ['f3', 'e5', 'g4', 'Qh4#']) game.playSan(san);
    await fixture.whenStable();

    expect(status()).toBe('Checkmate. Black wins.');
  });

  it('should go back one move when the previous button is pressed', async () => {
    game.playSan('e4');
    await fixture.whenStable();

    button('Previous move').click();
    await fixture.whenStable();

    expect(game.ply()).toBe(0);
    expect(game.moves()).toHaveLength(1);
  });

  it('should remove the last move when undo is pressed', async () => {
    game.playSan('e4');
    await fixture.whenStable();

    button('Undo').click();
    await fixture.whenStable();

    expect(game.moves()).toHaveLength(0);
  });

  it('should flip the board when the flip button is pressed', async () => {
    button('Flip board').click();
    await fixture.whenStable();

    expect(element.querySelector('.cg-wrap')?.classList).toContain('orientation-black');
  });

  it('should clear the game when reset is pressed', async () => {
    game.playSan('d4');
    await fixture.whenStable();

    button('Reset').click();
    await fixture.whenStable();

    expect(game.moves()).toHaveLength(0);
  });

  it('should navigate with the arrow keys when pressed', async () => {
    game.playSan('e4');
    await fixture.whenStable();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(game.ply()).toBe(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(game.ply()).toBe(1);
  });
});
