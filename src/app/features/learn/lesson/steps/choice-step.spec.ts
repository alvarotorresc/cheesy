import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ChoiceStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { I18nService } from '../../../../core/i18n';
import { ChoiceStepView } from './choice-step';

const factStep: ChoiceStep = {
  kind: 'choice',
  text: plainText('How many squares does the knight cover?'),
  answer: {
    by: 'fact',
    options: [
      { es: 'Tres', en: 'Three' },
      { es: 'Cinco', en: 'Five' },
    ],
    correct: 0,
  },
  whyWrong: [plainText('-'), plainText('That is the rook.')],
  explanation: plainText('Well done.'),
};

const statusStep: ChoiceStep = {
  kind: 'choice',
  text: plainText('What is this?'),
  board: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    orientation: 'white',
  },
  answer: { by: 'status' },
  explanation: plainText('Nothing special.'),
};

describe('ChoiceStepView', () => {
  let fixture: ComponentFixture<ChoiceStepView>;
  let element: HTMLElement;
  let done: { firstTry: boolean }[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(ChoiceStepView);
    element = fixture.nativeElement as HTMLElement;
    done = [];
    fixture.componentInstance.done.subscribe((value) => done.push(value));
  });

  afterEach(() => localStorage.clear());

  const options = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button.option'));

  it('should show why an option is wrong and emit done with no first try once right', async () => {
    fixture.componentRef.setInput('step', factStep);
    await fixture.whenStable();
    const [three, five] = options();

    five.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('That is the rook.');
    expect(five.getAttribute('aria-disabled')).toBe('true');
    expect(done).toEqual([]);

    three.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Well done.');
    expect(done).toEqual([{ firstTry: false }]);
  });

  it('should emit a first try when the first option is right, and only once', async () => {
    fixture.componentRef.setInput('step', factStep);
    await fixture.whenStable();
    options()[0].click();
    options()[0].click();
    await fixture.whenStable();
    expect(done).toEqual([{ firstTry: true }]);
  });

  it('should name the four status options in the active language', async () => {
    fixture.componentRef.setInput('step', statusStep);
    await fixture.whenStable();
    expect(options().map((b) => b.textContent?.trim())).toEqual([
      'Check',
      'Checkmate',
      'Stalemate',
      'None of these',
    ]);
    expect(element.querySelector('app-board')).not.toBeNull();
  });

  it('should fall back to a generic message when the wrong option has no text of its own', async () => {
    fixture.componentRef.setInput('step', {
      ...factStep,
      whyWrong: [null, null] as never,
    } satisfies ChoiceStep);
    await fixture.whenStable();
    options()[1].click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Not this one. Try again.');
  });

  it('should offer the solution after three mistakes and count it as not a first try', async () => {
    const step: ChoiceStep = {
      ...factStep,
      answer: {
        by: 'fact',
        options: [
          { es: 'a', en: 'A' },
          { es: 'b', en: 'B' },
          { es: 'c', en: 'C' },
          { es: 'd', en: 'D' },
        ],
        correct: 3,
      },
      whyWrong: undefined,
    };
    fixture.componentRef.setInput('step', step);
    await fixture.whenStable();
    expect(element.querySelector('button.solution')).toBeNull();
    for (const index of [0, 1, 2]) options()[index].click();
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('button.solution')!.click();
    await fixture.whenStable();
    expect(done).toEqual([{ firstTry: false }]);
    expect(element.querySelector('button.solution')).toBeNull();
  });

  it('should announce the feedback in a live region', async () => {
    fixture.componentRef.setInput('step', factStep);
    await fixture.whenStable();
    expect(element.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('should keep the focus on a wrong option and ignore it when pressed again', async () => {
    fixture.componentRef.setInput('step', factStep);
    await fixture.whenStable();
    const five = options()[1];
    five.focus();
    five.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(five);
    five.click();
    await fixture.whenStable();
    expect(done).toEqual([]);
  });

  it('should write the feedback again for each wrong option, so it is announced again', async () => {
    fixture.componentRef.setInput('step', {
      ...factStep,
      answer: {
        by: 'fact',
        options: [
          { es: 'a', en: 'A' },
          { es: 'b', en: 'B' },
          { es: 'c', en: 'C' },
        ],
        correct: 2,
      },
      whyWrong: undefined,
    } satisfies ChoiceStep);
    await fixture.whenStable();
    options()[0].click();
    await fixture.whenStable();
    const textOf = () =>
      [...element.querySelector('.feedback')!.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
    const first = textOf();
    expect(first).toBeDefined();
    options()[1].click();
    await fixture.whenStable();
    expect(element.querySelector('.feedback')!.textContent).toContain('Not this one. Try again.');
    expect(textOf()).not.toBe(first);
  });
});
