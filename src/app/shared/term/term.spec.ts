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
    expect(popup()?.querySelector('.name')?.textContent?.trim()).toBe('Clavada');
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
    vi.useFakeTimers();
    leave();
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).toBeNull();

    button().click();
    await fixture.whenStable();
    leave();
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
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
    expect(popup()?.querySelector('.name')?.textContent?.trim()).toBe('Clavada');
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

  const openByMouse = async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await fixture.whenStable();
  };

  it('should keep a mouse-opened popup when the mouse crosses from the word to it', async () => {
    await openByMouse();
    vi.useFakeTimers();
    leave();
    vi.advanceTimersByTime(100);
    popup()!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should pin a mouse-opened popup on click without loading it again', async () => {
    await openByMouse();
    expect(load).toHaveBeenCalledTimes(1);
    button().click();
    await fixture.whenStable();
    expect(popup()?.querySelector('.name')?.textContent?.trim()).toBe('Clavada');
    expect(load).toHaveBeenCalledTimes(1);
    leave();
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should close a mouse-opened popup with Escape even if the focus is elsewhere', async () => {
    await openByMouse();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(escape);
    await fixture.whenStable();
    expect(popup()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(button());
  });

  it('should close when the focus moves to something outside', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    button().focus();
    button().click();
    await fixture.whenStable();
    outside.focus();
    await fixture.whenStable();
    outside.remove();
    expect(popup()).toBeNull();
  });

  it('should not close when the focus only moves to the popup link', async () => {
    button().focus();
    button().click();
    await fixture.whenStable();
    (popup()!.querySelector('a') as HTMLElement).focus();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should close when the page scrolls', async () => {
    button().click();
    await fixture.whenStable();
    window.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(popup()).toBeNull();
  });

  it('should name the dialog after the term, not the written word', async () => {
    button().click();
    await fixture.whenStable();
    const name = document.getElementById(popup()!.getAttribute('aria-labelledby')!);
    expect(name?.textContent?.trim()).toBe('Clavada');
  });

  it('should open above the word when it does not fit below', async () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(700);
    vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 600, 30, 20));
    button().click();
    await fixture.whenStable();
    const style = (popup() as HTMLElement).style;
    expect(popup()?.classList.contains('above')).toBe(true);
    expect(style.top).toBe('');
    expect(parseFloat(style.bottom)).toBe(700 - 600 + 8);
  });

  it('should open below the word when it fits', async () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1200);
    vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 30, 20));
    button().click();
    await fixture.whenStable();
    expect(popup()?.classList.contains('above')).toBe(false);
    expect(parseFloat((popup() as HTMLElement).style.top)).toBe(128);
  });

  it('should never be taller than the screen', async () => {
    button().click();
    await fixture.whenStable();
    const tall = document.createElement('div');
    tall.style.height = `${window.innerHeight * 2}px`;
    popup()!.appendChild(tall);
    const box = popup() as HTMLElement;
    expect(getComputedStyle(box).overflowY).toBe('auto');
    expect(box.offsetHeight).toBeLessThanOrEqual(window.innerHeight - 32);
  });

  it('should show a term inside the definition as a link, not as another popup', async () => {
    load.mockResolvedValueOnce([
      {
        ...PIN,
        definition: {
          es: [{ kind: 'term', id: 'check', text: 'jaque' }],
          en: [{ kind: 'term', id: 'check', text: 'check' }],
        },
      },
    ]);
    // A fresh service cache: the glossary of this test is the one above.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GLOSSARY_LOADER, useValue: load }],
    });
    TestBed.inject(I18nService).setLang('es');
    element.remove();
    fixture = TestBed.createComponent(TermView);
    fixture.componentRef.setInput('id', 'pin');
    fixture.componentRef.setInput('text', 'clava');
    element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    await fixture.whenStable();
    button().click();
    await fixture.whenStable();
    expect(popup()?.querySelector('a.term')?.getAttribute('href')).toBe('/learn/glossary#check');
    expect(popup()?.querySelector('app-term')).toBeNull();
  });

  it('should shrink to the room of the chosen side when neither side fits', async () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
    vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 300, 30, 20));
    button().click();
    await fixture.whenStable();
    const box = popup() as HTMLElement;
    // Room below: 600 - 320 - 8 - 16 = 256. Room above: 300 - 8 - 16 = 276, so it goes above.
    expect(box.classList.contains('above')).toBe(true);
    expect(parseFloat(box.style.maxHeight)).toBe(276);
    expect(box.offsetHeight).toBeLessThanOrEqual(276);
  });

  it('should not turn a click into a hover popup when the hover timer was pending', async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    button().click();
    vi.advanceTimersByTime(300);
    leave();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
  });

  it('should stay closed when a click opens and closes it before the hover timer fires', async () => {
    vi.useFakeTimers();
    button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    button().click();
    button().click();
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await fixture.whenStable();
    expect(popup()).toBeNull();
  });
});
