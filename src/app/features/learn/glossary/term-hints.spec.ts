import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { GlossaryTerm, Segment } from '../../../core/content/content.types';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { ReadingModeService } from '../../../core/reading-mode';
import { RichTextView } from '../../../shared/rich-text';
import { firstSentence, plainSegments, TermHints } from './term-hints';

@Component({
  imports: [TermHints, RichTextView],
  template: `<app-term-hints [terms]="terms()"
    ><p><app-rich-text [text]="text()" [termLinks]="true" /></p
  ></app-term-hints>`,
})
class Host {
  readonly terms = signal<readonly GlossaryTerm[]>([]);
  readonly text = signal({
    es: [
      { kind: 'text', text: 'Avanza por su ' },
      { kind: 'term', id: 'file', text: 'columna' },
      { kind: 'text', text: '.' },
    ] as Segment[],
    en: [
      { kind: 'text', text: 'Moving up its ' },
      { kind: 'term', id: 'file', text: 'file' },
      { kind: 'text', text: '.' },
    ] as Segment[],
  });
}

describe('TermHints', () => {
  let fixture: ComponentFixture<Host>;
  let root: HTMLElement;

  const link = () => root.querySelector<HTMLAnchorElement>('a.term')!;
  const hint = () => document.querySelector<HTMLElement>('[role="tooltip"]');
  const mouse = (type: string, target: Element = link(), related: Element | null = null) =>
    target.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerType: 'mouse', relatedTarget: related }),
    );
  const FILE_ES = 'Cada una de las ocho líneas de casillas que van de un jugador al otro.';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'learn/glossary', children: [] }])],
    });
    TestBed.inject(I18nService).setLang('es');
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.terms.set(await bundledGlossaryLoader());
    root = fixture.nativeElement as HTMLElement;
    document.body.appendChild(root);
    await fixture.whenStable();
  });

  afterEach(() => {
    root.remove();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should show the first sentence of the term after the mouse rests on it for 300 ms', async () => {
    vi.useFakeTimers();
    mouse('pointerover');
    vi.advanceTimersByTime(299);
    expect(hint()).toBeNull();
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()?.textContent?.trim()).toBe(FILE_ES);
    expect(link().getAttribute('aria-describedby')).toBe(hint()?.id);
    expect(hint()?.querySelector('app-mini-board, [role="img"]')).toBeNull();
  });

  it('should show it at once when the keyboard focuses the link', async () => {
    link().focus();
    await fixture.whenStable();
    expect(hint()?.textContent?.trim()).toBe(FILE_ES);
  });

  it('should hide it with Escape and when the focus leaves', async () => {
    link().focus();
    await fixture.whenStable();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    link().dispatchEvent(escape);
    await fixture.whenStable();
    expect(hint()).toBeNull();
    expect(link().hasAttribute('aria-describedby')).toBe(false);
    expect(escape.defaultPrevented).toBe(true);

    link().blur();
    link().focus();
    await fixture.whenStable();
    expect(hint()).not.toBeNull();
    link().blur();
    await fixture.whenStable();
    expect(hint()).toBeNull();
  });

  it('should hide it a moment after the mouse leaves, and keep it if the mouse comes back', async () => {
    vi.useFakeTimers();
    mouse('pointerover');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()).not.toBeNull();

    vi.useFakeTimers();
    mouse('pointerout', link(), root);
    vi.advanceTimersByTime(100);
    mouse('pointerover');
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()).not.toBeNull();

    vi.useFakeTimers();
    mouse('pointerout', link(), root);
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()).toBeNull();
  });

  it('should not show it when the mouse only passes by', async () => {
    vi.useFakeTimers();
    mouse('pointerover');
    vi.advanceTimersByTime(100);
    mouse('pointerout', link(), root);
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()).toBeNull();
  });

  it('should show nothing on touch: a tap goes to the term', async () => {
    vi.useFakeTimers();
    link().dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }));
    link().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    link().focus();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(hint()).toBeNull();
  });

  it('should still go to the card on click, and hide the hint', async () => {
    link().focus();
    await fixture.whenStable();
    link().click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/learn/glossary#file');
    expect(hint()).toBeNull();
  });

  it('should follow the language', async () => {
    TestBed.inject(I18nService).setLang('en');
    await fixture.whenStable();
    link().focus();
    await fixture.whenStable();
    expect(hint()?.textContent?.trim()).toBe(
      'A column of squares running from one player to the other.',
    );
  });
});

describe('term hint text', () => {
  it('should cut the first sentence', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
    expect(firstSentence('Is it? Yes.')).toBe('Is it?');
    expect(firstSentence('Up to d8. Then more.')).toBe('Up to d8.');
    expect(firstSentence('A value of 3.5 points. More.')).toBe('A value of 3.5 points.');
    expect(firstSentence('No full stop')).toBe('No full stop');
  });

  it('should write the segments as plain text, moves as the reading mode says', () => {
    TestBed.configureTestingModule({});
    TestBed.inject(I18nService).setLang('es');
    const reading = TestBed.inject(ReadingModeService);
    const segments: Segment[] = [
      { kind: 'text', text: 'Tras ' },
      { kind: 'move', san: 'Nf3', number: '1.', start: false, written: '1.Cf3' },
      { kind: 'text', text: ' el ' },
      { kind: 'term', id: 'centre', text: 'centro' },
      { kind: 'text', text: ' y ' },
      { kind: 'square', square: 'e4' },
      { kind: 'text', text: '.' },
    ];
    reading.setMode('notation');
    expect(plainSegments(segments, reading)).toBe('Tras 1.Cf3 el centro y e4.');
    reading.setMode('words');
    expect(plainSegments(segments, reading)).toMatch(/^Tras caballo .*f3 el centro y e4\.$/);
  });

  it('should give every term of the glossary a whole first sentence in both languages', async () => {
    TestBed.configureTestingModule({});
    const terms = await bundledGlossaryLoader();
    for (const lang of ['es', 'en'] as const) {
      TestBed.inject(I18nService).setLang(lang);
      for (const term of terms) {
        const text = plainSegments(term.definition[lang], TestBed.inject(ReadingModeService));
        const first = firstSentence(text);
        expect(first.length, `${term.id} (${lang})`).toBeGreaterThan(10);
        expect(first, `${term.id} (${lang})`).toMatch(/[.!?…]$/);
        expect(text.startsWith(first), `${term.id} (${lang})`).toBe(true);
      }
    }
  });
});
