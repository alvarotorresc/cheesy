import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RichText } from '../../core/content/content.types';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { BoardSpotlight } from '../board';
import { RichTextView } from './rich-text';

const TEXT: RichText = {
  es: [
    { kind: 'text', text: 'Solo ' },
    { kind: 'move', san: 'Ke7', number: '1...', start: false, written: '1...Re7' },
    { kind: 'text', text: ' hace tablas; el rey va a ' },
    { kind: 'square', square: 'e6' },
    { kind: 'text', text: ' con la ' },
    { kind: 'term', id: 'opposition', text: 'oposición' },
    { kind: 'text', text: '.' },
  ],
  en: [{ kind: 'text', text: 'Only 1...Ke7 draws.' }],
};

describe('RichTextView', () => {
  let fixture: ComponentFixture<RichTextView>;
  let element: HTMLElement;

  const shown = (): string =>
    Array.from(element.childNodes)
      .filter((node) => node.nodeType !== Node.COMMENT_NODE)
      .map((node) =>
        node instanceof HTMLElement && node.tagName === 'APP-MOVE'
          ? (node.querySelector('[aria-hidden="true"]')?.textContent ?? '')
          : (node.textContent ?? ''),
      )
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18nService).setLang('es');
    fixture = TestBed.createComponent(RichTextView);
    fixture.componentRef.setInput('text', TEXT);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('should write the moves in words, without their number, in words mode', async () => {
    TestBed.inject(ReadingModeService).setMode('words');
    await fixture.whenStable();
    expect(shown()).toBe('Solo rey a e7 hace tablas; el rey va a e6 con la oposición.');
  });

  it('should write the moves as the author did in notation mode', async () => {
    TestBed.inject(ReadingModeService).setMode('notation');
    await fixture.whenStable();
    expect(shown()).toBe('Solo 1...Re7 hace tablas; el rey va a e6 con la oposición.');
  });

  it('should show the text of the active language', async () => {
    TestBed.inject(I18nService).setLang('en');
    await fixture.whenStable();
    expect(shown()).toBe('Only 1...Ke7 draws.');
  });

  it('should mark squares so they can be styled', async () => {
    await fixture.whenStable();
    expect(element.querySelector('.square')?.textContent?.trim()).toBe('e6');
  });

  it('should turn a term into a glossary button', async () => {
    await fixture.whenStable();
    expect(element.querySelector('app-term button.term')?.textContent?.trim()).toBe('oposición');
  });

  it('should turn a term into a link to the glossary page when asked to', async () => {
    fixture.componentRef.setInput('termLinks', true);
    await fixture.whenStable();
    expect(element.querySelector('a.term')?.getAttribute('href')).toBe(
      '/es/aprender/glosario#opposition',
    );
  });

  it('should point the board at a square of the text', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [BoardSpotlight, provideRouter([])] });
    TestBed.inject(I18nService).setLang('es');
    const f = TestBed.createComponent(RichTextView);
    f.componentRef.setInput('text', TEXT);
    await f.whenStable();
    const square = (f.nativeElement as HTMLElement).querySelector('.square')!;
    square.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
    expect(TestBed.inject(BoardSpotlight).request()).toEqual({ kind: 'squares', squares: ['e6'] });
  });
});
