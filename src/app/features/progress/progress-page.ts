import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  afterNextRender,
  Injector,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  untracked,
  type WritableSignal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n';
import { ProgressService } from '../../core/progress';
import { PageLinks } from '../../core/routing';
import type { SyncDocument } from '../../core/sync/sync-document';
import { CodeField } from './code-field';
import {
  codeWordCount,
  exportFileName,
  hasRows,
  readProgressFile,
  rowCounts,
  totalRows,
  type RowCounts,
} from './progress-file';
import { PROGRESS_SYNC, type ReadFailure } from './progress-sync';

/** How often «Last synced 2 minutes ago» is brought up to date. */
const CLOCK_MS = 30_000;

/** What is running, so its button says so and no other operation starts meanwhile. */
type Busy = 'create' | 'join' | 'leave' | 'delete' | 'sync' | 'export' | 'import';

/** Both sides of a code being entered, while the person chooses what to keep. */
interface Choice {
  readonly code: string;
  readonly remote: RowCounts;
  readonly local: RowCounts;
}

const UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
] as const;

/** «2 minutes ago», «yesterday», in the language on screen; under a minute, `justNow`. */
export const timeAgo = (at: number, now: number, lang: string, justNow: string): string => {
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const seconds = Math.round((at - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return justNow;
};

/**
 * The page «Your progress»: what this browser holds, the code that syncs it with the server
 * (create, enter, copy, leave, delete) and a copy in a file. It is an app route, rendered only in
 * the browser.
 */
@Component({
  selector: 'app-progress-page',
  imports: [RouterLink, CodeField],
  templateUrl: './progress-page.html',
  styleUrl: './progress-page.css',
})
export class ProgressPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly links = inject(PageLinks);
  protected readonly sync = inject(PROGRESS_SYNC);
  protected readonly progress = inject(ProgressService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The progress of this browser, read again whenever it changes. */
  protected readonly local = signal<SyncDocument | undefined>(undefined);
  protected readonly localSummary = computed(() => {
    const local = this.local();
    return local && this.t().progressPage.rows(rowCounts(local));
  });

  protected readonly busy = signal<Busy | undefined>(undefined);
  private readonly now = signal(Date.now());

  /** Result of the last account operation, announced politely. */
  protected readonly message = signal('');
  /** Result of the last export or import, announced politely. */
  protected readonly fileMessage = signal('');
  /** Result of «Export it first», announced inside the dialog that asked for it. */
  protected readonly chooseMessage = signal('');

  protected readonly codeInput = signal('');
  protected readonly codeError = signal<string | undefined>(undefined);

  /** The code of a new account, shown once in its dialog. */
  protected readonly created = signal<string | undefined>(undefined);
  protected readonly savedIt = signal(false);
  /** The new code could not be kept here: the dialog insists on writing it down. */
  protected readonly unsaved = signal(false);
  /** The choice of «leave» waiting for «leave anyway», after changes failed to upload. */
  protected readonly pendingLeave = signal<boolean | undefined>(undefined);
  protected readonly choice = signal<Choice | undefined>(undefined);
  /** Whether the code of the linked account is on screen. */
  protected readonly shown = signal(false);

  protected readonly linked = computed(() => this.sync.code() !== undefined);
  protected readonly words = computed(() => this.sync.code()?.split('-') ?? []);
  protected readonly createdWords = computed(() => this.created()?.split('-') ?? []);

  protected readonly statusText = computed(() => {
    const p = this.t().progressPage;
    const status = this.sync.status();
    return status === 'idle' && !this.linked() ? p.status.off : p.status[status];
  });

  /** Why the last sync failed, or what to do about it. */
  protected readonly statusDetail = computed(() => {
    const p = this.t().progressPage;
    const status = this.sync.status();
    if (status === 'outdated') return p.outdatedDetail;
    const error = this.sync.error();
    return status === 'error' && error ? p.errorDetail[error] : '';
  });

  /** Kept out of the live region: it changes every minute by itself. */
  protected readonly lastSynced = computed(() => {
    const at = this.sync.lastSyncAt();
    if (at === undefined || !this.linked()) return '';
    const p = this.t().progressPage;
    return p.syncedAgo(timeAgo(at, this.now(), this.i18n.lang(), p.justNow));
  });

  private readonly createDialog = viewChild<ElementRef<HTMLDialogElement>>('createDialog');
  private readonly chooseDialog = viewChild<ElementRef<HTMLDialogElement>>('chooseDialog');
  private readonly leaveDialog = viewChild<ElementRef<HTMLDialogElement>>('leaveDialog');
  private readonly unsyncedDialog = viewChild<ElementRef<HTMLDialogElement>>('unsyncedDialog');
  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');

  constructor() {
    effect(() => {
      this.progress.revision();
      untracked(() => void this.readLocal());
    });
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.now.set(Date.now()), CLOCK_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected async create(): Promise<void> {
    if (!this.start('create')) return;
    try {
      const result = await this.sync.create();
      if (!result.ok) {
        this.message.set(this.t().progressPage.createFailed[result.error]);
        return;
      }
      this.message.set('');
      this.savedIt.set(false);
      this.unsaved.set(!result.saved);
      this.created.set(result.code);
      this.open(this.createDialog());
    } finally {
      this.busy.set(undefined);
    }
  }

  /** Esc does not close the new code until the person says it is saved. */
  protected holdCreated(event: Event): void {
    if (!this.savedIt()) event.preventDefault();
  }

  protected closeCreated(): void {
    if (!this.savedIt()) return;
    this.createDialog()?.nativeElement.close();
  }

  protected createdClosed(): void {
    this.created.set(undefined);
    // The only thing said here so far is «Code copied.»: it does not outlive its dialog.
    this.message.set(this.linked() ? '' : this.t().progressPage.notSaved);
    this.focusAfterRender(this.linked() ? '.code-actions .button.primary' : '#create-button');
  }

  protected async enter(event?: Event): Promise<void> {
    event?.preventDefault();
    const input = this.codeInput();
    const count = codeWordCount(input);
    if (count !== 4) {
      this.codeError.set(this.t().progressPage.wordCount(count));
      return;
    }
    if (!this.start('join')) return;
    this.codeError.set(undefined);
    this.message.set('');
    try {
      await this.ask(input, true);
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async choose(mode: 'merge' | 'replace'): Promise<void> {
    const choice = this.choice();
    this.chooseDialog()?.nativeElement.close();
    if (!choice || !this.start('join')) return;
    try {
      await this.join(choice.code, mode, false);
    } finally {
      this.busy.set(undefined);
    }
  }

  protected askLeave(): void {
    this.open(this.leaveDialog());
  }

  /**
   * Leaves after uploading what is pending. When that upload fails it stays linked and asks
   * whether to leave anyway; `force` is that answer.
   */
  protected async leave(keepLocal: boolean, force = false): Promise<void> {
    this.leaveDialog()?.nativeElement.close();
    this.unsyncedDialog()?.nativeElement.close();
    if (!this.start('leave')) return;
    try {
      const left = await (force
        ? this.sync.leave(keepLocal, { force: true })
        : this.sync.leave(keepLocal));
      if (!left.ok) {
        this.pendingLeave.set(keepLocal);
        this.open(this.unsyncedDialog());
        return;
      }
      this.pendingLeave.set(undefined);
      this.shown.set(false);
      this.message.set(this.t().progressPage.left);
      this.focusAfterRender('#create-button');
    } finally {
      this.busy.set(undefined);
    }
  }

  protected leaveAnyway(): void {
    const keepLocal = this.pendingLeave();
    if (keepLocal !== undefined) void this.leave(keepLocal, true);
  }

  protected askDelete(): void {
    this.open(this.deleteDialog());
  }

  protected async deleteRemote(): Promise<void> {
    this.deleteDialog()?.nativeElement.close();
    if (!this.start('delete')) return;
    try {
      const deleted = await this.sync.deleteRemote();
      const p = this.t().progressPage;
      if (deleted) this.shown.set(false);
      this.message.set(deleted ? p.deleted : p.deleteFailed);
      if (deleted) this.focusAfterRender('#create-button');
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async syncNow(): Promise<void> {
    if (!this.start('sync')) return;
    try {
      await this.sync.syncNow();
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async copy(code: string | undefined): Promise<void> {
    if (!code) return;
    const p = this.t().progressPage;
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('No clipboard');
      await clipboard.writeText(code);
      this.message.set(p.copied);
    } catch {
      this.shown.set(true);
      this.message.set(p.copyFailed);
    }
  }

  /** Downloads a copy; the result is announced in `report`, the region next to the button. */
  protected async exportFile(report: WritableSignal<string> = this.fileMessage): Promise<void> {
    if (!this.start('export')) return;
    const p = this.t().progressPage;
    try {
      const doc = await this.progress.snapshot();
      if (!doc) {
        report.set(p.exportFailed);
        return;
      }
      const name = exportFileName(new Date());
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = this.document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url));
      report.set(p.exported(name));
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.start('import')) return;
    const p = this.t().progressPage;
    try {
      const read = await readProgressFile(file, Date.now());
      if (!read.ok) {
        this.fileMessage.set(p.importFailed[read.reason]);
        return;
      }
      const imported = await this.progress.importDocument(read.doc);
      this.fileMessage.set(imported ? p.imported(totalRows(read.doc)) : p.importFailed.failed);
    } finally {
      // So that the same file can be chosen again.
      input.value = '';
      this.busy.set(undefined);
    }
  }

  /** Reads the account first: with progress here, the person chooses before anything changes. */
  private async ask(input: string, retry: boolean): Promise<void> {
    const preview = await this.sync.preview(input);
    if (!preview.ok) {
      this.codeError.set(this.readFailure(preview.reason, preview.word));
      return;
    }
    if (hasRows(preview.local)) {
      this.choice.set({
        code: preview.code,
        remote: rowCounts(preview.remote),
        local: rowCounts(preview.local),
      });
      this.chooseMessage.set('');
      this.open(this.chooseDialog());
      return;
    }
    await this.join(preview.code, undefined, retry);
  }

  private async join(code: string, mode: 'merge' | 'replace' | undefined, retry: boolean) {
    const p = this.t().progressPage;
    const joined = await (mode ? this.sync.join(code, mode) : this.sync.join(code));
    if (joined.ok) {
      this.codeInput.set('');
      this.message.set(p.joined);
      this.focusAfterRender('#code-title');
      return;
    }
    // Progress appeared here meanwhile (another tab): ask again, with what there is now.
    if (joined.reason === 'choose' && retry) return this.ask(code, false);
    if (joined.reason === 'choose') {
      this.message.set(p.chooseAgain);
      return;
    }
    this.codeError.set(
      joined.reason === 'linked'
        ? p.joinFailed.linked
        : this.readFailure(joined.reason, joined.word),
    );
  }

  private readFailure(reason: ReadFailure, word?: number): string {
    const p = this.t().progressPage;
    if (reason !== 'bad-code') return p.joinFailed[reason];
    const ordinal = word === undefined ? undefined : p.ordinals[word - 1];
    return ordinal ? p.badWord(ordinal) : p.badCode;
  }

  private start(busy: Busy): boolean {
    if (this.busy()) return false;
    this.busy.set(busy);
    return true;
  }

  /** Opens a dialog as modal and puts the focus on its first control. */
  private open(dialog: ElementRef<HTMLDialogElement> | undefined): void {
    const element = dialog?.nativeElement;
    if (!element || element.open) return;
    element.showModal();
    const first =
      element.querySelector<HTMLElement>('[data-autofocus]') ??
      element.querySelector<HTMLElement>('button, input');
    first?.focus();
  }

  /**
   * Moves the focus once the page shows its new state: the control that opened the dialog is
   * gone with the old one, and the focus would fall back to the body.
   */
  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }

  private async readLocal(): Promise<void> {
    this.local.set(await this.progress.snapshot());
  }
}
