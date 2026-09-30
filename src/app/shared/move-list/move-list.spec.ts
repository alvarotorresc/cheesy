import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { BoardSpotlight } from '../board';
import { MoveList } from './move-list';

const texts = (element: HTMLElement, selector: string): string[] =>
  Array.from(element.querySelectorAll(selector), (node) => node.textContent?.trim() ?? '');

describe('MoveList', () => {
  let fixture: ComponentFixture<MoveList>;
  let element: HTMLElement;

  const render = async (inputs: Record<string, unknown>): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  beforeEach(() => {
    // Other specs may leave a stored language behind: these expectations are in English.
    TestBed.inject(I18nService).setLang('en');
    // Other specs may leave a stored mode behind: these expectations are written in notation.
    TestBed.inject(ReadingModeService).setMode('notation');
    fixture = TestBed.createComponent(MoveList);
    fixture.componentRef.setInput('label', 'Moves');
    fixture.componentRef.setInput('emptyLabel', 'No moves yet.');
    element = fixture.nativeElement as HTMLElement;
  });

  it('should show the empty label when there are no moves', async () => {
    await render({ moves: [], emptyLabel: 'Todavía no hay jugadas.' });

    expect(element.textContent).toContain('Todavía no hay jugadas.');
    expect(element.querySelectorAll('button')).toHaveLength(0);
  });

  it('should group moves by move number when white starts', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'] });

    expect(texts(element, '.number')).toEqual(['1.', '2.']);
    expect(texts(element, 'button.move .shown')).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('should start with a placeholder when black moves first', async () => {
    await render({ moves: ['Nf6', 'c4'], startPly: 19 });

    expect(texts(element, '.number')).toEqual(['10.', '11.']);
    expect(element.querySelector('.row .placeholder')).not.toBeNull();
  });

  it('should leave the black cell empty when white made the last move', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'] });

    expect(element.querySelector('.placeholder')).toBeNull();
  });

  it('should highlight the move of the current ply when given', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'], currentPly: 2 });

    const current = element.querySelector('button.current');
    expect(current?.querySelector('.shown')?.textContent?.trim()).toBe('e5');
    expect(current?.getAttribute('aria-current')).toBe('step');
    expect(element.querySelectorAll('button.current')).toHaveLength(1);
  });

  it('should emit the ply of the move when a move is clicked', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'] });
    const selected: number[] = [];
    fixture.componentInstance.selectPly.subscribe((ply) => selected.push(ply));

    element.querySelectorAll<HTMLButtonElement>('button.move')[2].click();

    expect(selected).toEqual([3]);
  });

  it('should show the piece letters of the active language', async () => {
    const i18n = TestBed.inject(I18nService);
    i18n.setLang('es');
    try {
      await render({ moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O', 'axb5', 'exd8=Q'] });

      expect(texts(element, 'button.move .shown')).toEqual([
        'e4',
        'e5',
        'Cf3',
        'Cc6',
        'Ab5',
        'a6',
        'O-O',
        'axb5',
        'exd8=D',
      ]);
    } finally {
      i18n.setLang('en');
    }
  });

  it('should draw the piece and name the button with the sentence in words mode', async () => {
    TestBed.inject(ReadingModeService).setMode('words');
    await render({ moves: ['e4', 'Nc6'] });

    const [, black] = Array.from(element.querySelectorAll('button.move'));
    expect(black.querySelector('.pc-bN')).not.toBeNull();
    expect(black.querySelector('.visually-hidden')?.textContent?.trim()).toBe('Knight to c6');
  });

  it('should give each move the position it is played from', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const f = TestBed.createComponent(MoveList);
    f.componentRef.setInput('label', 'Moves');
    f.componentRef.setInput('emptyLabel', 'No moves yet.');
    f.componentRef.setInput('moves', ['e4', 'e5']);
    await f.whenStable();
    const second = (f.nativeElement as HTMLElement).querySelectorAll('[data-spot]')[1];
    second.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
    expect(TestBed.inject(BoardSpotlight).request()).toMatchObject({
      kind: 'move',
      san: 'e5',
      before: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    });
  });

  it('should play the moves from the start position given', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const f = TestBed.createComponent(MoveList);
    f.componentRef.setInput('label', 'Moves');
    f.componentRef.setInput('emptyLabel', 'No moves yet.');
    f.componentRef.setInput('startFen', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    f.componentRef.setInput('moves', ['e4']);
    await f.whenStable();
    const first = (f.nativeElement as HTMLElement).querySelector('[data-spot]')!;
    first.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
    expect(TestBed.inject(BoardSpotlight).request()).toMatchObject({
      before: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    });
  });

  it('should leave no position on the moves after an illegal one', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const f = TestBed.createComponent(MoveList);
    f.componentRef.setInput('label', 'Moves');
    f.componentRef.setInput('emptyLabel', 'No moves yet.');
    f.componentRef.setInput('moves', ['e5', 'e5']);
    await f.whenStable();
    const second = (f.nativeElement as HTMLElement).querySelectorAll('[data-spot]')[1];
    second.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
    expect(TestBed.inject(BoardSpotlight).request()).toEqual({ kind: 'move', san: 'e5' });
  });

  it('should not add a tab stop to a move inside a button', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [BoardSpotlight] });
    const f = TestBed.createComponent(MoveList);
    f.componentRef.setInput('label', 'Moves');
    f.componentRef.setInput('emptyLabel', 'No moves yet.');
    f.componentRef.setInput('moves', ['e4']);
    await f.whenStable();
    expect(
      (f.nativeElement as HTMLElement).querySelector('[data-spot]')?.hasAttribute('tabindex'),
    ).toBe(false);
  });
});
