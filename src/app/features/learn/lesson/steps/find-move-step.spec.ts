import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { FindMoveStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { I18nService } from '../../../../core/i18n';
import { BoardComponent } from '../../../../shared/board';
import { FindMoveStepView } from './find-move-step';

/** The queen takes the loose bishop; taking the pawn on c6 loses her to the b7 pawn. */
const captureStep: FindMoveStep = {
  kind: 'find-move',
  text: plainText('Take something'),
  board: { fen: '6k1/1p6/2p5/5b2/8/8/2Q5/6K1 w - - 0 1', orientation: 'white', highlights: ['f5'] },
  check: { by: 'engine', solution: ['Qxf5'] },
  wrong: { Qxc6: plainText('Está defendido') },
  hint: plainText('Look at the bishop'),
  explanation: plainText('Bien'),
};

describe('FindMoveStepView', () => {
  let fixture: ComponentFixture<FindMoveStepView>;
  let element: HTMLElement;
  let done: { firstTry: boolean }[];

  const board = () =>
    fixture.debugElement.query(By.directive(BoardComponent)).componentInstance as BoardComponent;
  const wrong = () => board().move.emit({ from: 'c2' as never, to: 'c6' as never });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(FindMoveStepView);
    element = fixture.nativeElement as HTMLElement;
    done = [];
    fixture.componentInstance.done.subscribe((value) => done.push(value));
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should show the message of a typical mistake, then the explanation when right', async () => {
    fixture.componentRef.setInput('step', captureStep);
    await fixture.whenStable();
    wrong();
    await fixture.whenStable();
    expect(element.textContent).toContain('Está defendido');
    expect(board().marks().get('c6')).toBe('wrong');
    board().move.emit({ from: 'c2' as never, to: 'f5' as never });
    await fixture.whenStable();
    expect(element.textContent).toContain('Bien');
    expect(done).toEqual([{ firstTry: false }]);
  });

  it('should take the mark off the wrong square after a moment', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('step', captureStep);
    fixture.detectChanges();
    wrong();
    fixture.detectChanges();
    expect(board().marks().get('c6')).toBe('wrong');
    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(board().marks().has('c6')).toBe(false);
  });

  it('should say a generic message for a mistake with no text of its own', async () => {
    fixture.componentRef.setInput('step', { ...captureStep, wrong: undefined });
    await fixture.whenStable();
    wrong();
    await fixture.whenStable();
    expect(element.textContent).toContain('Not this one. Try again.');
  });

  it('should emit a first try when the move is right at once, and only once', async () => {
    fixture.componentRef.setInput('step', captureStep);
    await fixture.whenStable();
    const right = () => board().move.emit({ from: 'c2' as never, to: 'f5' as never });
    right();
    right();
    await fixture.whenStable();
    expect(done).toEqual([{ firstTry: true }]);
  });

  it('should offer the hint after two mistakes and the solution after three', async () => {
    fixture.componentRef.setInput('step', captureStep);
    await fixture.whenStable();
    wrong();
    wrong();
    await fixture.whenStable();
    expect(element.querySelector('button.hint')).not.toBeNull();
    expect(element.querySelector('button.solution')).toBeNull();
    wrong();
    await fixture.whenStable();
    expect(element.querySelector('button.solution')).not.toBeNull();
  });

  it('should show the hint text and mark the piece to move when the hint is asked for', async () => {
    fixture.componentRef.setInput('step', captureStep);
    await fixture.whenStable();
    wrong();
    wrong();
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button.hint')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Look at the bishop');
    expect(board().marks().get('c2')).toBe('hint');
  });

  it('should play the solution on request and count it as not a first try', async () => {
    fixture.componentRef.setInput('step', captureStep);
    await fixture.whenStable();
    wrong();
    wrong();
    wrong();
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button.solution')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Bien');
    expect(done).toEqual([{ firstTry: false }]);
  });

  it('should hold the board while the rival is about to answer', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('step', {
      kind: 'find-move',
      text: plainText('Two moves'),
      board: { fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', orientation: 'white' },
      check: { by: 'engine', solution: ['Ra7', 'Kg8', 'Ra8+'] },
      explanation: plainText('Bien'),
    } satisfies FindMoveStep);
    fixture.detectChanges();
    board().move.emit({ from: 'a1' as never, to: 'a7' as never });
    fixture.detectChanges();
    expect(board().dests().size).toBe(0);
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    expect(board().fen()).toContain('6k1');
    expect(board().dests().size).toBeGreaterThan(0);
    board().move.emit({ from: 'a7' as never, to: 'a8' as never });
    fixture.detectChanges();
    expect(done).toEqual([{ firstTry: true }]);
  });
});
