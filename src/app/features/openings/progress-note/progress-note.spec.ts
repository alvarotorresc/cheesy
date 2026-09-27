import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n';
import {
  PROGRESS_STORE_LOADER,
  ProgressService,
  type ProgressStoreLoader,
} from '../../../core/progress';
import { memoryProgressStore } from '../testing/memory-progress-store';
import { ProgressNote } from './progress-note';

describe('ProgressNote', () => {
  let fixture: ComponentFixture<ProgressNote>;
  let element: HTMLElement;
  let progress: ProgressService;

  const create = async (
    loader: ProgressStoreLoader = memoryProgressStore().loader,
    inputs: { hasProgress?: boolean; note?: string } = { hasProgress: true },
  ): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [{ provide: PROGRESS_STORE_LOADER, useValue: loader }],
    });
    TestBed.inject(I18nService).setLang('en');
    progress = TestBed.inject(ProgressService);
    fixture = TestBed.createComponent(ProgressNote);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  };

  const text = (selector: string): string =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );

  const click = async (label: string): Promise<void> => {
    const found = button(label);
    if (!found) throw new Error(`Button not found: ${label}`);
    found.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should say that the progress stays in the browser', async () => {
    await create(undefined, { note: 'A line counts as practised with either colour.' });

    expect(text('.note')).toContain(
      'Your progress stays in this browser: no accounts, no analytics, nothing is sent anywhere.',
    );
    expect(text('.note')).toContain('A line counts as practised with either colour.');
  });

  it('should only offer to delete when there is progress', async () => {
    await create(undefined, { hasProgress: false });

    expect(button('Delete progress')).toBeUndefined();
  });

  it('should ask before deleting, and keep everything when cancelled', async () => {
    await create();
    const clear = vi.spyOn(progress, 'clear');

    await click('Delete progress');

    expect(text('.confirm')).toContain('Delete all the saved progress? This cannot be undone.');
    expect(document.activeElement).toBe(button('Cancel'));

    await click('Cancel');

    expect(clear).not.toHaveBeenCalled();
    expect(element.querySelector('.confirm')).toBeNull();
    expect(document.activeElement).toBe(button('Delete progress'));
  });

  it('should delete the progress once confirmed', async () => {
    await create();
    const clear = vi.spyOn(progress, 'clear');

    await click('Delete progress');
    await click('Delete');

    expect(clear).toHaveBeenCalledTimes(1);
    expect(text('[role=status]')).toBe('Progress deleted.');
    expect(document.activeElement).toBe(element.querySelector('[role=status]'));
  });

  it('should say when the progress could not be deleted', async () => {
    const memory = memoryProgressStore();
    await create(memory.loader);
    vi.spyOn(memory.store, 'clear').mockRejectedValue(new Error('blocked'));

    await click('Delete progress');
    await click('Delete');

    expect(text('[role=status]')).toBe('The progress could not be deleted.');
  });

  it('should warn discreetly when progress cannot be saved in this browser', async () => {
    await create(() => Promise.reject(new Error('private mode')));
    await progress.all();
    await fixture.whenStable();

    expect(text('.warning')).toBe(
      'This browser is not letting us save progress (private browsing or blocked storage). Everything else works.',
    );
    expect(button('Delete progress')).toBeUndefined();
  });
});
