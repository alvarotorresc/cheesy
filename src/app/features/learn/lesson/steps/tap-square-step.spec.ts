import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { TapSquareStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { I18nService } from '../../../../core/i18n';
import { TapSquareStepView } from './tap-square-step';

const step: TapSquareStep = {
  kind: 'tap-square',
  text: plainText('Toca'),
  count: 2,
  squares: ['e4', 'a1'],
};

describe('TapSquareStepView', () => {
  let fixture: ComponentFixture<TapSquareStepView>;
  let element: HTMLElement;
  let done: { firstTry: boolean }[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(TapSquareStepView);
    element = fixture.nativeElement as HTMLElement;
    done = [];
    fixture.componentInstance.done.subscribe((value) => done.push(value));
  });

  afterEach(() => localStorage.clear());

  const square = (name: string) =>
    element.querySelector<HTMLButtonElement>(`button.square[data-square="${name}"]`)!;

  it('should ask for squares on a board without coordinates and emit done after count taps', async () => {
    fixture.componentRef.setInput('step', step);
    await fixture.whenStable();
    expect(element.querySelector('.prompt')?.textContent).toContain('Tap e4');
    expect(element.querySelectorAll('button.square')).toHaveLength(64);
    square('e4').click();
    square('a1').click();
    await fixture.whenStable();
    expect(done).toEqual([{ firstTry: true }]);
  });

  it('should give every square a name that says to tap it', async () => {
    fixture.componentRef.setInput('step', step);
    await fixture.whenStable();
    expect(square('h8').getAttribute('aria-label')).toBe('Tap h8');
  });

  it('should name the square in Spanish after a wrong tap', async () => {
    TestBed.inject(I18nService).setLang('es');
    fixture.componentRef.setInput('step', step);
    await fixture.whenStable();
    square('d4').click();
    await fixture.whenStable();
    expect(element.querySelector('.feedback')?.textContent?.trim()).toBe('La casilla era e4.');
  });

  it('should show the right square after a wrong tap and report it was not a first try', async () => {
    vi.useFakeTimers();
    try {
      fixture.componentRef.setInput('step', step);
      fixture.detectChanges();
      square('d4').click();
      fixture.detectChanges();
      expect(element.querySelector('.feedback')?.textContent?.trim()).toBe('The square was e4.');
      expect(square('d4').classList).toContain('wrong');
      expect(square('e4').classList).toContain('expected');
      vi.advanceTimersByTime(700);
      fixture.detectChanges();
      expect(square('d4').classList).not.toContain('wrong');
      square('a1').click();
      fixture.detectChanges();
      expect(done).toEqual([{ firstTry: false }]);
    } finally {
      vi.useRealTimers();
    }
  });
});
