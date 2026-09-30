import { ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GLOSSARY_LOADER } from '../../../core/content';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import { I18nService } from '../../../core/i18n';
import { GlossaryPage, matchesSearch, sortTerms } from './glossary-page';

describe('GlossaryPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader }],
    });
  });

  afterEach(() => localStorage.clear());

  const names = (root: HTMLElement) =>
    [...root.querySelectorAll('article h2')].map((h) => h.textContent?.trim() ?? '');

  it('should list every term of the real glossary in alphabetical order of the language', async () => {
    TestBed.inject(I18nService).setLang('es');
    const fixture = TestBed.createComponent(GlossaryPage);
    await fixture.whenStable();
    const listed = names(fixture.nativeElement as HTMLElement);
    expect(listed).toHaveLength(49);
    expect(listed).toEqual([...listed].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('should give each term an anchor with its id', async () => {
    const fixture = TestBed.createComponent(GlossaryPage);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('article#opposition'),
    ).not.toBeNull();
  });

  it('should find terms with or without accents and in any case', async () => {
    const terms = await bundledGlossaryLoader();
    const pin = terms.find((t) => t.id === 'pin')!;
    const opposition = terms.find((t) => t.id === 'opposition')!;
    expect(matchesSearch(pin, 'CLAVADA', 'es')).toBe(true);
    expect(matchesSearch(opposition, 'oposicion', 'es')).toBe(true);
    expect(matchesSearch(pin, 'oposición', 'es')).toBe(false);
    expect(matchesSearch(pin, '', 'es')).toBe(true);
  });

  it('should sort by the name in the given language', async () => {
    const terms = await bundledGlossaryLoader();
    const en = sortTerms(terms, 'en').map((t) => t.name.en);
    expect(en).toEqual([...en].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('should filter the list as the search box is typed in, and say so when nothing matches', async () => {
    TestBed.inject(I18nService).setLang('es');
    const fixture = TestBed.createComponent(GlossaryPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[type=search]')!;
    expect(root.querySelector('label')?.textContent).toContain('Buscar');
    // One live region, there from the start, so a screen reader announces the change of its text.
    const status = root.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent?.trim()).toBe('');

    input.value = 'OPOSICION';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelector('article#opposition')).not.toBeNull();
    expect(root.querySelector('article#pin')).toBeNull();

    input.value = 'zzzz';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('article')).toHaveLength(0);
    expect(root.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent).toContain('Ningún');

    input.value = 'oposicion';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent?.trim()).toBe('');
  });

  it('should scroll to the term of the fragment once the glossary is drawn', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'learn/glossary', component: GlossaryPage }]),
        { provide: GLOSSARY_LOADER, useValue: bundledGlossaryLoader },
      ],
    });
    const scroll = vi.spyOn(TestBed.inject(ViewportScroller), 'scrollToAnchor');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/learn/glossary#pin');
    await harness.fixture.whenStable();
    expect(scroll).toHaveBeenCalledWith('pin');
    expect(document.getElementById('pin')).not.toBeNull();
  });
});
