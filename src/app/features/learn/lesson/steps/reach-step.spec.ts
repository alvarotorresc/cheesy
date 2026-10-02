import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { ReachStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { I18nService } from '../../../../core/i18n';
import { BoardComponent } from '../../../../shared/board';
import { ReachStepView } from './reach-step';

const knightStep: ReachStep = {
  kind: 'reach',
  text: plainText('Collect the stars'),
  piece: { role: 'knight', color: 'white', square: 'g1' },
  targets: ['e2', 'f3'],
  minMoves: 3,
};

/** The bishop on d5 guards f3, so the knight must not step there on its way to h3. */
const guardedStep: ReachStep = {
  kind: 'reach',
  text: plainText('Avoid the bishop'),
  piece: { role: 'knight', color: 'white', square: 'g1' },
  targets: ['h3'],
  enemies: [{ role: 'bishop', square: 'd5' }],
  minMoves: 1,
};

describe('ReachStepView', () => {
  let fixture: ComponentFixture<ReachStepView>;
  let element: HTMLElement;
  let done: { firstTry: boolean }[];

  const board = () =>
    fixture.debugElement.query(By.directive(BoardComponent)).componentInstance as BoardComponent;
  const move = (from: string, to: string) =>
    board().move.emit({ from: from as never, to: to as never });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(ReachStepView);
    element = fixture.nativeElement as HTMLElement;
    done = [];
    fixture.componentInstance.done.subscribe((value) => done.push(value));
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should count stars and moves and emit done when every star is collected', async () => {
    fixture.componentRef.setInput('step', knightStep);
    await fixture.whenStable();
    expect(element.textContent).toContain('0 of 2 stars · 0 moves (fewest 3)');
    for (const to of ['e2', 'g1', 'f3']) move('x', to);
    await fixture.whenStable();
    expect(element.textContent).toContain('2 of 2 stars · 3 moves (fewest 3)');
    expect(done).toEqual([{ firstTry: true }]);
  });

  it('should show the stars as marks and let only the piece move', async () => {
    fixture.componentRef.setInput('step', knightStep);
    await fixture.whenStable();
    expect(board().marks().get('e2')).toBe('star');
    expect([...board().dests().keys()]).toEqual(['g1']);
    expect(board().orientation()).toBe('white');
  });

  it('should say the piece was captured and offer to start again', async () => {
    fixture.componentRef.setInput('step', guardedStep);
    await fixture.whenStable();
    move('g1', 'f3');
    await fixture.whenStable();
    expect(element.textContent).toContain('captured');
    element.querySelector<HTMLButtonElement>('button.restart')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('0 of 1 stars');
    expect(element.querySelector('button.restart')).toBeNull();
  });

  it('should offer the hint after two captures and the solution after three', async () => {
    fixture.componentRef.setInput('step', { ...guardedStep, hint: plainText('Go round it') });
    await fixture.whenStable();
    const captured = async () => {
      move('g1', 'f3');
      await fixture.whenStable();
      element.querySelector<HTMLButtonElement>('button.restart')!.click();
      await fixture.whenStable();
    };
    await captured();
    expect(element.querySelector('button.hint')).toBeNull();
    await captured();
    element.querySelector<HTMLButtonElement>('button.hint')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Go round it');
    expect(element.querySelector('button.solution')).toBeNull();
    await captured();
    expect(element.querySelector('button.solution')).not.toBeNull();
  });

  it('should mark the first square of the way when there is no hint text', async () => {
    fixture.componentRef.setInput('step', guardedStep);
    await fixture.whenStable();
    for (let i = 0; i < 2; i++) {
      move('g1', 'f3');
      await fixture.whenStable();
      element.querySelector<HTMLButtonElement>('button.restart')!.click();
      await fixture.whenStable();
    }
    element.querySelector<HTMLButtonElement>('button.hint')!.click();
    await fixture.whenStable();
    expect([...board().marks().values()]).toContain('hint');
  });

  it('should play the solution on request and count it as not a first try', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('step', guardedStep);
    fixture.detectChanges();
    for (let i = 0; i < 3; i++) {
      move('g1', 'f3');
      fixture.detectChanges();
      element.querySelector<HTMLButtonElement>('button.restart')!.click();
      fixture.detectChanges();
    }
    element.querySelector<HTMLButtonElement>('button.solution')!.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(600 * 10);
    fixture.detectChanges();
    expect(element.textContent).toContain('1 of 1 stars');
    expect(done).toEqual([{ firstTry: false }]);
  });
});
