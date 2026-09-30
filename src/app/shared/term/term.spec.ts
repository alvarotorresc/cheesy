import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GLOSSARY_LOADER } from '../../core/content';
import type { GlossaryTerm } from '../../core/content/content.types';
import { I18nService } from '../../core/i18n';
import { TermView } from './term';

const PIN: GlossaryTerm = {
  id: 'pin',
  name: { es: 'Clavada', en: 'Pin' },
  definition: {
    es: [{ kind: 'text', text: 'Una pieza no puede moverse.' }],
    en: [{ kind: 'text', text: 'A piece cannot move.' }],
  },
  example: {
    fen: '8/8/5k2/8/8/2n5/8/B3K3 w - - 0 1',
    orientation: 'white',
    highlights: ['c3'],
    arrows: [{ from: 'a1', to: 'e5', move: false }],
  },
  level: 'intermediate',
  sources: ['https://en.wikipedia.org/wiki/Glossary_of_chess'],
};

describe('TermView', () => {
  let fixture: ComponentFixture<TermView>;
  let element: HTMLElement;
  let load: ReturnType<typeof vi.fn>;

  const button = () => element.querySelector('button.term') as HTMLButtonElement;
  // pointerleave does not bubble: it is the wrapper (word and popup together) that hears it.
  const leave = () =>
    element
      .querySelector('.wrap')!
      .dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
  const popup = () => element.querySelector('[role="dialog"]');

  beforeEach(async () => {
    load = vi.fn(async () => [PIN]);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GLOSSARY_LOADER, useValue: load }],
    });
    TestBed.inject(I18nService).setLang('es');
    fixture = TestBed.createComponent(TermView);
    fixture.componentRef.setInput('id', 'pin');
    fixture.componentRef.setInput('text', 'clava');
    element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    await fixture.whenStable();
  });

  afterEach(() => {
    element.remove();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should show the word as written, closed, without downloading the glossary', () => {
    expect(button().textContent?.trim()).toBe('clava');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(popup()).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('should open on click with the name, the definition, the board and the link', async () => {
    button().click();
    await fixture.whenStable();
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(button().getAttribute('aria-controls')).toBe(popup()?.id);
    expect(popup()?.querySelector('h2')?.textContent?.trim()).toBe('Clavada');
    expect(popup()?.textContent).toContain('Una pieza no puede moverse.');
    expect(popup()?.querySelector('app-mini-board')).not.toBeNull();
    expect(popup()?.querySelector('a')?.getAttribute('href')).toBe('/learn/glossary#pin');
  });

  it('should close with Escape, give the focus back and keep Escape to itself', async () => {
    button().click();
    await fixture.whenStable();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    popup()!.dispatchEvent(escape);
    await fixture.whenStable();
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(button());
    expect(escape.defaultPrevented).toBe(true);
  });

  it('should close on a press outside', async () => {
    button().click();
    await fixture.whenStable();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(popup()).toBeNull();
  });

  it('should open after the mouse rests on the word for 300 ms', async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(299);
    expect(popup()).toBeNull();
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should close when the mouse leaves if the mouse opened it, but not if a click did', async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
    leave();
    await fixture.whenStable();
    expect(popup()).toBeNull();

    button().click();
    await fixture.whenStable();
    leave();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should not open with the keyboard focus alone', async () => {
    button().focus();
    button().dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(popup()).toBeNull();
  });

  it('should not open when the mouse only passes by', async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(100);
    leave();
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).toBeNull();
  });

  it('should say so when the glossary cannot be loaded, and try again next time', async () => {
    load.mockRejectedValueOnce(new Error('offline'));
    button().click();
    await fixture.whenStable();
    expect(popup()?.textContent).toContain('No se ha podido cargar el glosario');
    button().click(); // close
    button().click(); // open again
    await fixture.whenStable();
    expect(popup()?.querySelector('h2')?.textContent?.trim()).toBe('Clavada');
  });

  it('should stay inside a narrow screen', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
    vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue(new DOMRect(330, 100, 30, 20));
    button().click();
    await fixture.whenStable();
    const style = (popup() as HTMLElement).style;
    const left = parseFloat(style.left);
    const width = parseFloat(style.width);
    expect(left).toBeGreaterThanOrEqual(16);
    expect(left + width).toBeLessThanOrEqual(360 - 16);
  });
});
