import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { PROGRESS_STORE_LOADER, ProgressService } from '../../core/progress';
import { emptyDocument, type SyncDocument } from '../../core/sync/sync-document';
import { memoryProgressStore } from '../openings/testing/memory-progress-store';
import { MAX_FILE_BYTES } from './progress-file';
import { ProgressPage, timeAgo } from './progress-page';
import { PROGRESS_SYNC } from './progress-sync';
import { FakeProgressSync } from './testing';

const CODE = 'abandon-ability-able-about';

const lesson = (lessonId: string) => ({ lessonId, completedAt: 1, exercises: 3, firstTry: 2 });

const remoteDoc = (): SyncDocument => ({
  ...emptyDocument(),
  lessons: [lesson('pins'), lesson('forks'), lesson('skewers')],
  endgames: [
    { endgameId: 'lucena-position', completions: 1, firstCompletedAt: 1, lastCompletedAt: 1 },
  ],
});

const render = async (
  options: {
    sync?: FakeProgressSync;
    memory?: ReturnType<typeof memoryProgressStore>;
    loader?: () => Promise<never>;
  } = {},
) => {
  const sync = options.sync ?? new FakeProgressSync();
  const memory = options.memory ?? memoryProgressStore();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: PROGRESS_STORE_LOADER, useValue: options.loader ?? memory.loader },
      { provide: PROGRESS_SYNC, useValue: sync },
    ],
  });
  TestBed.inject(I18nService).setLang('en');
  const fixture = TestBed.createComponent(ProgressPage);
  await settle(fixture);
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, sync, memory };
};

const settle = async (fixture: ComponentFixture<unknown>) => {
  for (let i = 0; i < 4; i++) {
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
  }
};

const byText = (root: ParentNode, text: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No button "${text}"`);
  return found;
};

const openDialog = (element: HTMLElement): HTMLDialogElement => {
  const open = element.querySelector<HTMLDialogElement>('dialog[open]');
  if (!open) throw new Error('No open dialog');
  return open;
};

const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('timeAgo', () => {
  it('says how long ago in words, and «just now» under a minute', () => {
    const now = Date.UTC(2026, 9, 10, 12);
    expect(timeAgo(now - 20_000, now, 'en', 'just now')).toBe('just now');
    expect(timeAgo(now - 2 * 60_000, now, 'es', 'hace un momento')).toBe('hace 2 minutos');
    expect(timeAgo(now - 3 * 3_600_000, now, 'en', 'just now')).toBe('3 hours ago');
  });
});

describe('ProgressPage', () => {
  // jsdom has no <dialog> methods. Other specs stub them on the shared prototype and some never
  // put them back (nor fire «close»), so this one sets its own and restores what it found.
  const proto = HTMLDialogElement.prototype;
  const original = { showModal: proto.showModal, close: proto.close };

  beforeAll(() => {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  afterAll(() => {
    proto.showModal = original.showModal;
    proto.close = original.close;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('not linked', () => {
    it('should offer to create a code and to enter one', async () => {
      const { element } = await render();

      expect(element.querySelector('h1')?.textContent).toBe('Your progress');
      expect(byText(element, 'Create my code')).toBeTruthy();
      expect(element.textContent).toContain('Already have a code?');
      expect(element.querySelector('input[name="code"]')).toBeTruthy();
      expect(byText(element, 'Export')).toBeTruthy();
    });

    it('should link to the sync section of About', async () => {
      const { element } = await render();

      const link = element.querySelector<HTMLAnchorElement>('a[href$="#sincronizar"]');
      expect(link?.getAttribute('href')).toBe('/en/about#sincronizar');
    });

    it('should say how much progress this browser holds', async () => {
      const memory = memoryProgressStore();
      await memory.store.lessons.put(lesson('pins'));
      await memory.store.lessons.put(lesson('forks'));
      const { element } = await render({ memory });

      expect(element.querySelector('.ledger')?.textContent).toContain('2 lessons');
    });
  });

  describe('creating a code', () => {
    it('should show the code once with the warning, and not close until it is saved', async () => {
      const { fixture, element, sync } = await render();

      byText(element, 'Create my code').click();
      await settle(fixture);

      expect(sync.create).toHaveBeenCalledOnce();
      const dialog = openDialog(element);
      const words = [...dialog.querySelectorAll('.tile .word')].map((w) => w.textContent?.trim());
      expect(words).toEqual(['abandon', 'ability', 'able', 'about']);
      expect(dialog.textContent).toContain('If you lose it, there is no way to get it back.');

      const done = byText(dialog, 'Done');
      expect(done.disabled).toBe(true);
      const escape = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(escape);
      expect(escape.defaultPrevented).toBe(true);

      const saved = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      saved.click();
      fixture.detectChanges();
      expect(done.disabled).toBe(false);
      done.click();
      await settle(fixture);
      expect(element.querySelector('dialog[open]')).toBeNull();
    });

    it('should not leave «Code copied.» behind when the dialog closes', async () => {
      const writeText = vi.fn(async () => undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { fixture, element } = await render();

      byText(element, 'Create my code').click();
      await settle(fixture);
      const dialog = openDialog(element);
      byText(dialog, 'Copy').click();
      await settle(fixture);
      expect(dialog.textContent).toContain('Code copied.');

      dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      fixture.detectChanges();
      byText(dialog, 'Done').click();
      await settle(fixture);

      expect(element.querySelector('.page-message')?.textContent?.trim()).toBe('');
    });

    it('should insist on writing the code down when this browser could not keep it', async () => {
      const sync = new FakeProgressSync();
      sync.create.mockResolvedValueOnce({ ok: true, code: CODE, saved: false });
      const { fixture, element } = await render({ sync });

      byText(element, 'Create my code').click();
      await settle(fixture);

      const dialog = openDialog(element);
      expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
        'This browser could not keep the code',
      );
      expect(byText(dialog, 'Done').disabled).toBe(true);
    });

    it('should explain why a code could not be created', async () => {
      const sync = new FakeProgressSync();
      sync.create.mockResolvedValueOnce({ ok: false, error: 'offline' });
      const { fixture, element } = await render({ sync });

      byText(element, 'Create my code').click();
      await settle(fixture);

      expect(element.querySelector('dialog[open]')).toBeNull();
      expect(element.textContent).toContain('No connection. Try again when you are back online.');
    });
  });

  describe('entering a code', () => {
    const enter = async (
      fixture: ComponentFixture<ProgressPage>,
      element: HTMLElement,
      code: string,
    ) => {
      type(element.querySelector<HTMLInputElement>('input[name="code"]')!, code);
      fixture.detectChanges();
      byText(element, 'Enter').click();
      await settle(fixture);
    };

    it('should enter without asking when this browser has no progress', async () => {
      const sync = new FakeProgressSync();
      sync.preview.mockResolvedValueOnce({
        ok: true,
        code: CODE,
        remote: remoteDoc(),
        local: emptyDocument(),
      });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, 'Abandon Ability able  about');

      expect(sync.join).toHaveBeenCalledWith(CODE);
      expect(element.querySelector('dialog[open]')).toBeNull();
      expect(element.textContent).toContain('Done: this browser now syncs with your code.');
    });

    it('should ask to join or replace, with both sides counted, when there is local progress', async () => {
      const sync = new FakeProgressSync();
      const local = { ...emptyDocument(), lessons: [lesson('pins')] };
      sync.preview.mockResolvedValue({ ok: true, code: CODE, remote: remoteDoc(), local });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, CODE);

      expect(sync.join).not.toHaveBeenCalled();
      const dialog = openDialog(element);
      expect(dialog.textContent).toContain('3 lessons, 1 endgame');
      expect(dialog.textContent).toContain('1 lesson');
      expect(byText(dialog, 'Join both')).toBeTruthy();
      expect(byText(dialog, 'Use only the account')).toBeTruthy();

      byText(dialog, 'Cancel').click();
      await settle(fixture);
      expect(element.querySelector('dialog[open]')).toBeNull();
      expect(sync.join).not.toHaveBeenCalled();

      await enter(fixture, element, CODE);
      byText(openDialog(element), 'Use only the account').click();
      await settle(fixture);
      expect(sync.join).toHaveBeenCalledWith(CODE, 'replace');
    });

    it('should announce «Export it first» inside the dialog, not in the files block', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:progress');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const sync = new FakeProgressSync();
      const local = { ...emptyDocument(), lessons: [lesson('pins')] };
      sync.preview.mockResolvedValue({ ok: true, code: CODE, remote: remoteDoc(), local });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, CODE);
      const dialog = openDialog(element);
      byText(dialog, 'Export it first').click();
      await settle(fixture);

      expect(dialog.querySelector('[role="status"]')?.textContent).toContain('Downloaded');
      expect(element.querySelector('.files .message')?.textContent?.trim()).toBe('');
    });

    it('should join both sides when asked to', async () => {
      const sync = new FakeProgressSync();
      const local = { ...emptyDocument(), lessons: [lesson('pins')] };
      sync.preview.mockResolvedValue({ ok: true, code: CODE, remote: remoteDoc(), local });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, CODE);
      byText(openDialog(element), 'Join both').click();
      await settle(fixture);

      expect(sync.join).toHaveBeenCalledWith(CODE, 'merge');
    });

    it('should say so when progress appears again after choosing, instead of going quiet', async () => {
      const sync = new FakeProgressSync();
      const local = { ...emptyDocument(), lessons: [lesson('pins')] };
      sync.preview.mockResolvedValue({ ok: true, code: CODE, remote: remoteDoc(), local });
      sync.join.mockResolvedValueOnce({ ok: false, reason: 'choose' });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, CODE);
      byText(openDialog(element), 'Join both').click();
      await settle(fixture);

      expect(element.querySelector('.page-message')?.textContent).toContain(
        'Progress changed in this browser meanwhile. Enter the code again.',
      );
    });

    it('should name the word that is not in the list', async () => {
      const sync = new FakeProgressSync();
      sync.preview.mockResolvedValueOnce({ ok: false, reason: 'bad-code', word: 3 });
      const { fixture, element } = await render({ sync });

      await enter(fixture, element, 'abandon ability zzz about');

      const input = element.querySelector<HTMLInputElement>('input[name="code"]')!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const error = element.querySelector(
        `#${input.getAttribute('aria-describedby')?.split(' ')[0]}`,
      );
      expect(error?.textContent).toContain('The third word is not in the list.');
    });

    it('should not ask the server about a code without four words', async () => {
      const { fixture, element, sync } = await render();

      await enter(fixture, element, 'abandon ability able');

      expect(sync.preview).not.toHaveBeenCalled();
      expect(element.textContent).toContain('A code has four words; this has 3.');
    });

    it('should say when no progress is saved with the code', async () => {
      const { fixture, element } = await render();

      await enter(fixture, element, CODE);

      expect(element.textContent).toContain('No progress is saved with that code.');
    });
  });

  describe('linked', () => {
    const linked = () => {
      const sync = new FakeProgressSync();
      sync.link(CODE, Date.now() - 2 * 60_000);
      return sync;
    };

    it('should announce the sync status politely and say when it last synced', async () => {
      const sync = linked();
      const { fixture, element } = await render({ sync });

      const live = element.querySelector('[aria-live="polite"]');
      expect(live?.textContent).toContain('Synced');
      expect(element.textContent).toContain('Last synced 2 minutes ago');

      sync.state.set('offline');
      fixture.detectChanges();
      expect(live?.textContent).toContain('Offline: it will sync when you are back online');
      expect(live?.textContent).not.toContain('minutes ago');
    });

    it('should explain a failed sync and sync on demand', async () => {
      const sync = linked();
      sync.state.set('error');
      sync.failure.set('conflict');
      const { fixture, element } = await render({ sync });

      expect(element.textContent).toContain('Could not sync');
      expect(element.textContent).toContain('Another device was saving at the same time.');
      byText(element, 'Sync now').click();
      await settle(fixture);
      expect(sync.syncNow).toHaveBeenCalledOnce();
    });

    it('should announce a hidden code once, not as empty items', async () => {
      const { fixture, element } = await render({ sync: linked() });

      const items = [...element.querySelectorAll('.account .code li')];
      expect(items).toHaveLength(4);
      for (const item of items) expect(item.getAttribute('aria-hidden')).toBe('true');
      expect(element.querySelectorAll('.account .code [aria-label]')).toHaveLength(0);
      expect(element.querySelector('.account .code')?.hasAttribute('aria-label')).toBe(false);
      const notes = [...element.querySelectorAll('.account .visually-hidden')].filter(
        (n) => n.textContent?.trim() === 'Code hidden',
      );
      expect(notes).toHaveLength(1);

      byText(element, 'Show').click();
      fixture.detectChanges();
      for (const item of element.querySelectorAll('.account .code li')) {
        expect(item.hasAttribute('aria-hidden')).toBe(false);
      }
      expect(element.textContent).not.toContain('Code hidden');
    });

    it('should keep the code hidden until asked, and copy it', async () => {
      const writeText = vi.fn(async () => undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const { fixture, element } = await render({ sync: linked() });

      expect(element.querySelector('.code')?.textContent).not.toContain('abandon');
      const show = byText(element, 'Show');
      expect(show.hasAttribute('aria-pressed')).toBe(false);
      show.click();
      fixture.detectChanges();
      expect(byText(element, 'Hide').hasAttribute('aria-pressed')).toBe(false);
      expect(element.querySelector('.code')?.textContent).toContain('abandon');
      expect(element.textContent).toContain(
        'Anyone with the code can see and change your progress.',
      );

      byText(element, 'Copy').click();
      await settle(fixture);
      expect(writeText).toHaveBeenCalledWith(CODE);
      expect(element.textContent).toContain('Code copied.');
    });

    it('should ask before leaving, with both choices', async () => {
      const sync = linked();
      const { fixture, element } = await render({ sync });

      const region = element.querySelector('.page-message[role="status"]');
      byText(element, 'Stop syncing here').click();
      fixture.detectChanges();
      const dialog = openDialog(element);
      expect(dialog.querySelector('h2')?.textContent).toBe('Leave your progress in this browser?');
      byText(dialog, 'Delete it from this browser').click();
      await settle(fixture);

      expect(sync.leave).toHaveBeenCalledWith(false);
      // The same live region, so the change is read; and the focus lands on the new state.
      expect(element.querySelector('.page-message[role="status"]')).toBe(region);
      expect(region?.textContent).toContain('This browser no longer syncs.');
      expect(document.activeElement).toBe(byText(element, 'Create my code'));
    });

    it('should ask again when changes could not be uploaded, and leave only if told to', async () => {
      const sync = linked();
      sync.leave.mockResolvedValueOnce({ ok: false, reason: 'unsynced' });
      const { fixture, element } = await render({ sync });

      byText(element, 'Stop syncing here').click();
      fixture.detectChanges();
      byText(openDialog(element), 'Delete it from this browser').click();
      await settle(fixture);

      const dialog = openDialog(element);
      expect(dialog.querySelector('h2')?.textContent).toBe('Some changes are not on the server');
      expect(dialog.textContent).toContain('it will be lost');
      byText(dialog, 'Leave anyway').click();
      await settle(fixture);

      expect(sync.leave).toHaveBeenLastCalledWith(false, { force: true });
      expect(element.textContent).toContain('This browser no longer syncs.');
    });

    it('should confirm before deleting from the server', async () => {
      const sync = linked();
      const { fixture, element } = await render({ sync });

      byText(element, 'Delete from the server').click();
      fixture.detectChanges();
      const dialog = openDialog(element);
      expect(dialog.textContent).toContain(
        'Your progress is deleted from the server. This browser keeps it. The code stops working on all your devices.',
      );
      byText(dialog, 'Delete from the server').click();
      await settle(fixture);

      expect(sync.deleteRemote).toHaveBeenCalledOnce();
      expect(element.textContent).toContain('Deleted from the server.');
    });

    it('should say when the account is gone, and offer a new code', async () => {
      const sync = new FakeProgressSync();
      sync.failure.set('gone');
      const { element } = await render({ sync });

      expect(element.textContent).toContain('This account no longer exists on the server.');
      expect(byText(element, 'Create a new code')).toBeTruthy();
    });
  });

  describe('files', () => {
    it('should download the progress as a dated file', async () => {
      const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:progress');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      const { fixture, element } = await render();

      byText(element, 'Export').click();
      await settle(fixture);

      expect(create).toHaveBeenCalledOnce();
      const anchor = click.mock.contexts[0] as HTMLAnchorElement;
      expect(anchor.download).toMatch(/^cheesy-progress-\d{4}-\d{2}-\d{2}\.json$/);
      expect(element.textContent).toContain(`Downloaded ${anchor.download}.`);
    });

    const choose = async (
      fixture: ComponentFixture<ProgressPage>,
      element: HTMLElement,
      file: File,
    ) => {
      const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      await settle(fixture);
    };

    it('should import a valid file and say how many rows it held', async () => {
      const { fixture, element, memory } = await render();
      const importDocument = vi.spyOn(TestBed.inject(ProgressService), 'importDocument');

      await choose(fixture, element, new File([JSON.stringify(remoteDoc())], 'p.json'));

      expect(importDocument).toHaveBeenCalledOnce();
      expect(memory.lessonRows.size).toBe(3);
      expect(element.textContent).toContain('File imported: 4 rows read.');
    });

    it('should refuse a file that is too big or not a document, and change nothing', async () => {
      const { fixture, element, memory } = await render();
      const importDocument = vi.spyOn(TestBed.inject(ProgressService), 'importDocument');

      const big = new File(['{}'], 'big.json');
      Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
      await choose(fixture, element, big);
      expect(element.textContent).toContain('That file is over 1 MB');

      await choose(fixture, element, new File(['{"hello":1}'], 'other.json'));
      expect(element.textContent).toContain('That file is not a Cheesy export.');

      expect(importDocument).not.toHaveBeenCalled();
      expect(memory.lessonRows.size).toBe(0);
    });
  });

  describe('unavailable', () => {
    it('should only explain and offer the export when the progress can be read', async () => {
      const sync = new FakeProgressSync();
      sync.state.set('unavailable');
      const { element } = await render({ sync });

      expect(element.textContent).toContain('Syncing does not work in this browser');
      expect(element.querySelector('input[name="code"]')).toBeNull();
      expect([...element.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual([
        'Export',
      ]);
    });

    it('should not offer the export when the progress cannot be read either', async () => {
      const sync = new FakeProgressSync();
      sync.state.set('unavailable');
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { element } = await render({
        sync,
        loader: () => Promise.reject(new Error('no IndexedDB')),
      });

      expect(element.querySelectorAll('button')).toHaveLength(0);
    });
  });

  describe('keyboard', () => {
    it('should keep every control in the tab order and open dialogs as modal', async () => {
      const sync = new FakeProgressSync();
      sync.link(CODE);
      const { fixture, element } = await render({ sync });

      const controls = element.querySelectorAll('button, a[href], input');
      for (const control of controls) {
        if (control.closest('dialog')) continue;
        expect(control.getAttribute('tabindex')).not.toBe('-1');
      }

      const modal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      byText(element, 'Stop syncing here').click();
      fixture.detectChanges();
      expect(modal).toHaveBeenCalledOnce();
      expect(document.activeElement?.closest('dialog')).toBe(openDialog(element));
    });

    it('should focus the control marked for it, not the first one, when a dialog opens', async () => {
      const sync = new FakeProgressSync();
      sync.link(CODE);
      const { fixture, element } = await render({ sync });

      byText(element, 'Stop syncing here').click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(byText(openDialog(element), 'Keep it'));
    });
  });
});
