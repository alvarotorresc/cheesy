import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { EngineLine, EngineMove } from '../../core/engine';
import { I18nService } from '../../core/i18n';
import { EngineLines } from './engine-lines';

const texts = (element: HTMLElement, selector: string): string[] =>
  Array.from(element.querySelectorAll(selector), (node) => node.textContent?.trim() ?? '');

const LINES: EngineLine[] = [
  {
    multipv: 1,
    depth: 18,
    score: { type: 'cp', value: 31 },
    pv: ['e2e4', 'e7e5', 'g1f3'],
    sanPv: ['e4', 'e5', 'Nf3'],
  },
  {
    multipv: 2,
    depth: 18,
    score: { type: 'mate', value: -3 },
    pv: ['f2f3', 'e7e5'],
    sanPv: ['f3', 'e5'],
  },
];

describe('EngineLines', () => {
  let fixture: ComponentFixture<EngineLines>;
  let element: HTMLElement;

  const render = async (inputs: Record<string, unknown>): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(EngineLines);
    fixture.componentRef.setInput('label', 'Engine lines');
    fixture.componentRef.setInput('emptyLabel', 'No lines yet.');
    fixture.componentRef.setInput('depthLabel', 'Depth');
    element = fixture.nativeElement as HTMLElement;
    TestBed.inject(I18nService).setLang('en');
  });

  it('should show the empty label when there are no lines', async () => {
    await render({ lines: [], emptyLabel: 'Todavía no hay líneas.' });

    expect(element.textContent).toContain('Todavía no hay líneas.');
    expect(element.querySelectorAll('button')).toHaveLength(0);
  });

  it('should name the list with its translated label', async () => {
    await render({ lines: LINES, label: 'Líneas del motor' });

    expect(element.querySelector('ol')?.getAttribute('aria-label')).toBe('Líneas del motor');
  });

  it('should show the depth, the scores and the numbered moves of each line', async () => {
    await render({ lines: LINES, depthLabel: 'Profundidad' });

    expect(element.querySelector('.depth')?.textContent?.trim()).toBe('Profundidad 18');
    expect(texts(element, '.score')).toEqual(['+0.3', '#-3']);
    expect(texts(element, '.pv')).toEqual(['1.e4 e5 2.Nf3', '1.f3 e5']);
    expect(texts(element, '.pv b')).toEqual(['1.e4', '1.f3']);
  });

  it('should mark the best line and the scores that favour Black', async () => {
    await render({ lines: LINES, bestLabel: 'La mejor' });

    const [best, second] = Array.from(element.querySelectorAll('button.line'));
    expect(best.classList).toContain('best');
    expect(second.classList).not.toContain('best');
    expect(second.querySelector('.score')?.classList).toContain('black');
    expect(element.querySelector('.best-note')?.textContent?.trim()).toBe('La mejor');
  });

  it('should write the moves with Spanish letters in Spanish', async () => {
    TestBed.inject(I18nService).setLang('es');
    await render({ lines: LINES });

    expect(texts(element, '.pv')[0]).toBe('1.e4 e5 2.Cf3');
    localStorage.clear();
  });

  it('should give each line an accessible name with its score and moves', async () => {
    await render({ lines: LINES });

    const [first] = Array.from(element.querySelectorAll('button'));
    expect(first.getAttribute('aria-label')).toBe('+0.3 1.e4 e5 2.Nf3');
  });

  it('should build the accessible name with the given text', async () => {
    await render({
      lines: LINES,
      lineLabel: (move: string, score: string, line: string) => `Play ${move} (${score}): ${line}`,
    });

    const [first] = Array.from(element.querySelectorAll('button'));
    expect(first.getAttribute('aria-label')).toBe('Play 1.e4 (+0.3): 1.e4 e5 2.Nf3');
  });

  it('should number from the given ply when Black is to move', async () => {
    await render({ lines: [{ ...LINES[0], sanPv: ['Nf6', 'c4', 'e6'] }], startPly: 19 });

    expect(texts(element, '.pv')).toEqual(['10...Nf6 11.c4 e6']);
  });

  it('should cut long lines to the most moves allowed', async () => {
    await render({ lines: LINES, maxMoves: 1 });

    expect(texts(element, '.pv')).toEqual(['1.e4', '1.f3']);
  });

  it('should leave out lines without moves', async () => {
    await render({ lines: [{ ...LINES[0], pv: [], sanPv: [] }] });

    expect(element.querySelectorAll('button')).toHaveLength(0);
    expect(element.textContent).toContain('No lines yet.');
  });

  it('should emit the first move of a line when it is clicked', async () => {
    await render({ lines: LINES });
    const selected: EngineMove[] = [];
    fixture.componentInstance.selectMove.subscribe((move) => selected.push(move));

    element.querySelectorAll<HTMLButtonElement>('button.line')[1].click();

    expect(selected).toEqual([{ uci: 'f2f3', san: 'f3' }]);
  });
});
