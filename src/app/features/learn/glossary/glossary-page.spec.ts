import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER, LESSON_LOADERS } from '../../../core/content';
import { bundledGlossaryLoader, bundledLessonLoaders } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { GlossaryPage } from './glossary-page';

describe('GlossaryPage', () => {
  let harness: RouterTestingHarness;
  let scrolled: HTMLElement[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn/glossary', component: GlossaryPage }]),
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
        { provide: LESSON_LOADERS, useValue: bundledLessonLoaders },
      ],
    });
    TestBed.inject(I18nService).setLang('es');
    scrolled = [];
    // jsdom has no layout: record which card the page scrolls to.
    Element.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
      scrolled.push(this);
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  const open = async (url = '/learn/glossary'): Promise<HTMLElement> => {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return harness.routeNativeElement!;
  };
  const settle = () => harness.fixture.whenStable();
  const path = () => TestBed.inject(Location).path(true);

  const headings = (root: HTMLElement) =>
    [...root.querySelectorAll('.group-head h2')].map((h) => h.textContent?.trim());
  const cards = (root: HTMLElement) => [...root.querySelectorAll('article.term')].map((a) => a.id);
  const chip = (root: HTMLElement, name: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('.tabs button')].find((b) =>
      b.textContent?.trim().startsWith(name),
    )!;
  const level = (root: HTMLElement, name: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('.segmented button')].find(
      (b) => b.textContent?.trim() === name,
    )!;
  const count = (root: HTMLElement) =>
    root.querySelector('.result-count')?.textContent?.trim() ?? '';
  const type = async (root: HTMLElement, text: string) => {
    const input = root.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  };

  it('should show every term in families, in the fixed order, each with its count', async () => {
    const root = await open();
    expect(headings(root)).toEqual([
      'Reglas',
      'Táctica',
      'Mates con nombre',
      'Estrategia',
      'Estructura de peones',
      'Finales',
    ]);
    expect(
      [...root.querySelectorAll('.group-head .count')].map((c) => c.textContent?.trim()),
    ).toEqual([
      '11 términos',
      '13 términos',
      '5 términos',
      '12 términos',
      '7 términos',
      '6 términos',
    ]);
    expect(cards(root)).toHaveLength(54);
    expect(count(root)).toBe('54 términos');
  });

  it('should give each card the id of its term, a board with a label and its level', async () => {
    const root = await open();
    const card = root.querySelector('article#opposition')!;
    expect(card.querySelector('h3')?.textContent?.trim()).toBe('Oposición');
    expect(card.querySelector('app-mini-board [role="img"]')?.getAttribute('aria-label')).toContain(
      'Oposición',
    );
    expect(card.querySelector('.level')?.textContent?.trim()).toBe('Medio');
  });

  it('should label the search box and keep the result count in a polite live region', async () => {
    const root = await open();
    const input = root.querySelector<HTMLInputElement>('input[type=search]')!;
    expect(input.closest('label')?.textContent).toContain('Buscar un término');
    const live = root.querySelector('.result-count');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    await type(root, 'OPOSICION');
    expect(root.querySelector('.result-count')).toBe(live);
    expect(cards(root)).toEqual(['opposition']);
    expect(count(root)).toBe('1 de 54 términos');
    expect(path()).toBe('/learn/glossary?q=OPOSICION');
  });

  it('should filter by family with toggle chips that count the terms', async () => {
    const root = await open();
    const all = chip(root, 'Todas');
    const tactics = chip(root, 'Táctica');
    expect(all.getAttribute('aria-pressed')).toBe('true');
    expect(all.textContent?.replace(/\s+/g, ' ').trim()).toBe('Todas 54');
    expect(tactics.textContent?.replace(/\s+/g, ' ').trim()).toBe('Táctica 13');
    tactics.click();
    await settle();
    expect(tactics.getAttribute('aria-pressed')).toBe('true');
    expect(all.getAttribute('aria-pressed')).toBe('false');
    expect(headings(root)).toEqual(['Táctica']);
    expect(cards(root)).toHaveLength(13);
    expect(path()).toBe('/learn/glossary?group=tactics');
  });

  it('should filter by level, combine it with the family and update the chip counts', async () => {
    const root = await open();
    level(root, 'Avanzado').click();
    await settle();
    expect(level(root, 'Avanzado').getAttribute('aria-pressed')).toBe('true');
    expect(level(root, 'Todos').getAttribute('aria-pressed')).toBe('false');
    expect(chip(root, 'Finales').textContent?.replace(/\s+/g, ' ').trim()).toBe('Finales 3');
    chip(root, 'Finales').click();
    await settle();
    expect(cards(root).sort()).toEqual([
      'building-a-bridge',
      'lucena-position',
      'philidor-position',
    ]);
    expect(path()).toBe('/learn/glossary?group=endgames&level=advanced');
  });

  it('should open with the filters of the address', async () => {
    const root = await open('/learn/glossary?group=mates&level=intermediate&q=boden');
    expect(cards(root)).toEqual(['boden-mate']);
    expect(root.querySelector<HTMLInputElement>('input[type=search]')?.value).toBe('boden');
    expect(chip(root, 'Mates con nombre').getAttribute('aria-pressed')).toBe('true');
    expect(level(root, 'Medio').getAttribute('aria-pressed')).toBe('true');
  });

  it('should say so when nothing matches and clear every filter from there', async () => {
    const root = await open('/learn/glossary?group=rules');
    await type(root, 'zzzz');
    expect(cards(root)).toEqual([]);
    const notice = root.querySelector('.notice');
    expect(notice?.textContent).toContain('Ningún término cumple estos filtros.');
    notice!.querySelector('button')!.click();
    await settle();
    expect(cards(root)).toHaveLength(54);
    expect(root.querySelector<HTMLInputElement>('input[type=search]')?.value).toBe('');
    expect(path()).toBe('/learn/glossary');
  });

  it('should link a term to the lesson that teaches it, and only those terms', async () => {
    const root = await open();
    const lesson = root.querySelector('article#rank .lesson');
    expect(lesson?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Se aprende en: El tablero');
    expect(lesson?.querySelector('a')?.getAttribute('href')).toBe('/learn/beginner/the-board');
    expect(root.querySelector('article#pin .lesson')).toBeNull();
  });

  it('should take the reader to the term of the address and mark it for a moment', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const root = await open('/learn/glossary#pin');
    const pin = root.querySelector('article#pin')!;
    expect(scrolled).toContain(pin);
    expect(pin.classList).toContain('arrived');
    expect(root.querySelectorAll('article.arrived')).toHaveLength(1);
    vi.advanceTimersByTime(2500);
    await settle();
    expect(pin.classList).not.toContain('arrived');
  });

  it('should clear the filters that hide the term a link goes to', async () => {
    const root = await open('/learn/glossary?group=rules');
    expect(root.querySelector('article#pin')).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/learn/glossary#pin');
    await settle();
    expect(root.querySelector('article#pin')).not.toBeNull();
    expect(scrolled).toContain(root.querySelector('article#pin'));
    expect(chip(root, 'Todas').getAttribute('aria-pressed')).toBe('true');
  });

  it('should write the groups and the copy in English too', async () => {
    TestBed.inject(I18nService).setLang('en');
    const root = await open();
    expect(headings(root)).toEqual([
      'Rules',
      'Tactics',
      'Named mates',
      'Strategy',
      'Pawn structure',
      'Endgames',
    ]);
    expect(count(root)).toBe('54 terms');
    expect(
      root.querySelector('article#rank .lesson')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Taught in: The board');
  });

  it('should explain a term linked from a definition when the keyboard reaches it', async () => {
    const root = await open();
    const link = root.querySelector<HTMLAnchorElement>('article#queening-square a.term')!;
    expect(link.textContent?.trim()).toBe('columna');
    link.focus();
    await settle();
    const hint = document.querySelector('[role="tooltip"]');
    expect(hint?.textContent?.trim()).toBe(
      'Cada una de las ocho líneas de casillas que van de un jugador al otro.',
    );
    expect(link.getAttribute('aria-describedby')).toBe(hint?.id);
  });
});
