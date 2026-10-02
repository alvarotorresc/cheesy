import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ExplainStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { I18nService } from '../../../../core/i18n';
import { BoardComponent } from '../../../../shared/board';
import { ExplainStepView } from './explain-step';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const plain: ExplainStep = {
  kind: 'explain',
  text: plainText('Mira'),
  board: { fen: START, orientation: 'white', highlights: ['e4'] },
};

describe('ExplainStepView', () => {
  let fixture: ComponentFixture<ExplainStepView>;
  let element: HTMLElement;

  const board = () =>
    fixture.debugElement.query((debug) => debug.componentInstance instanceof BoardComponent)
      .componentInstance as BoardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(ExplainStepView);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should show the text and a view-only board with its rings', async () => {
    fixture.componentRef.setInput('step', plain);
    await fixture.whenStable();
    expect(element.textContent).toContain('Mira');
    expect(element.querySelector('app-board')).not.toBeNull();
    expect(board().viewOnly()).toBe(true);
    expect(board().marks().get('e4')).toBe('help');
    expect(element.querySelector('button.replay')).toBeNull();
  });

  it('should show only the text when the step has no board', async () => {
    fixture.componentRef.setInput('step', { kind: 'explain', text: plainText('Solo texto') });
    await fixture.whenStable();
    expect(element.textContent).toContain('Solo texto');
    expect(element.querySelector('app-board')).toBeNull();
  });

  it('should play the moves one by one and again on request', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('step', {
      kind: 'explain',
      text: plainText('Peón'),
      board: { fen: START, orientation: 'white', moves: ['e4', 'e5'] },
    } satisfies ExplainStep);
    fixture.detectChanges();
    expect(board().fen()).toBe(START);
    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(board().fen()).toContain('4P3');
    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(board().fen()).toContain('4p3');

    const replay = element.querySelector<HTMLButtonElement>('button.replay')!;
    expect(replay.textContent?.trim()).toBe('Play again');
    replay.click();
    fixture.detectChanges();
    expect(board().fen()).toBe(START);
  });

  it('should show the final position at once when the user asks for less motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    fixture.componentRef.setInput('step', {
      kind: 'explain',
      text: plainText('Peón'),
      board: { fen: START, orientation: 'white', moves: ['e4', 'e5'] },
    } satisfies ExplainStep);
    await fixture.whenStable();
    expect(board().fen()).toContain('4p3');
    expect(element.querySelector('button.replay')).toBeNull();
  });
});
