import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalBar } from './eval-bar';

describe('EvalBar', () => {
  let fixture: ComponentFixture<EvalBar>;
  let element: HTMLElement;

  const render = async (inputs: Record<string, unknown>): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  const meter = (): HTMLElement => {
    const found = element.querySelector<HTMLElement>('[role="meter"]');
    if (!found) throw new Error('Meter not found');
    return found;
  };

  const value = (): string | undefined => element.querySelector('.value')?.textContent?.trim();

  beforeEach(() => {
    fixture = TestBed.createComponent(EvalBar);
    fixture.componentRef.setInput('label', 'Evaluation');
    fixture.componentRef.setInput('emptyLabel', 'No evaluation yet');
    element = fixture.nativeElement as HTMLElement;
  });

  it('should be an accessible meter with its translated name', async () => {
    await render({ label: 'Evaluación' });

    expect(meter().getAttribute('aria-label')).toBe('Evaluación');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
  });

  it('should stay level and announce the empty label when there is no evaluation', async () => {
    await render({ score: undefined });

    expect(meter().getAttribute('aria-valuenow')).toBe('50');
    expect(meter().getAttribute('aria-valuetext')).toBe('No evaluation yet');
    expect(value()).toBeUndefined();
  });

  it('should write the score and grow White’s share when White is better', async () => {
    await render({ score: { type: 'cp', value: 150 } });

    expect(value()).toBe('+1.5');
    expect(meter().getAttribute('aria-valuetext')).toBe('+1.5');
    expect(Number(meter().getAttribute('aria-valuenow'))).toBeGreaterThan(50);
    expect(element.querySelector('.value')?.classList).toContain('on-white');
  });

  it('should write the score on Black’s end when Black is better', async () => {
    await render({ score: { type: 'cp', value: -80 } });

    expect(value()).toBe('-0.8');
    expect(Number(meter().getAttribute('aria-valuenow'))).toBeLessThan(50);
    expect(element.querySelector('.value')?.classList).not.toContain('on-white');
  });

  it('should show a mate for White as #3 and fill the bar', async () => {
    await render({ score: { type: 'mate', value: 3 } });

    expect(value()).toBe('#3');
    expect(meter().getAttribute('aria-valuenow')).toBe('100');
  });

  it('should show a mate for Black as #-3 and empty the bar', async () => {
    await render({ score: { type: 'mate', value: -3 } });

    expect(value()).toBe('#-3');
    expect(meter().getAttribute('aria-valuenow')).toBe('0');
  });

  it('should pass White’s share to the styles', async () => {
    await render({ score: { type: 'mate', value: 2 } });

    expect(meter().style.getPropertyValue('--white-share')).toBe('1');
  });

  it('should fill the bar and write 1-0 when White has won, whatever the score', async () => {
    await render({ score: { type: 'cp', value: -300 }, outcome: 'white' });

    expect(value()).toBe('1-0');
    expect(meter().getAttribute('aria-valuenow')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('1-0');
  });

  it('should empty the bar and write 0-1 when Black has won', async () => {
    await render({ outcome: 'black' });

    expect(value()).toBe('0-1');
    expect(meter().getAttribute('aria-valuenow')).toBe('0');
    expect(element.querySelector('.value')?.classList).not.toContain('on-white');
  });

  it('should split the bar and write ½-½ when the game is drawn', async () => {
    await render({ outcome: 'draw' });

    expect(value()).toBe('½-½');
    expect(meter().getAttribute('aria-valuenow')).toBe('50');
  });

  it('should flip when the board shows Black at the bottom', async () => {
    await render({ orientation: 'black' });

    expect(meter().classList).toContain('flipped');
  });
});
