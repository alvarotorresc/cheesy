import { Location } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { analysisLink, MAX_SHARED_PGN_LENGTH } from '../../../core/analysis-link';
import { I18nService } from '../../../core/i18n';
import { ROOT_ID } from '../../../core/move-tree';
import { Icon } from '../../../shared/icon';
import { AnalysisSession } from '../analysis-session';
import { copyText } from './clipboard';
import type { ImportOutcome } from './load-import';
import { exportTreePgn } from './pgn-export';

type Copied = 'fen' | 'pgn' | 'link';

interface CopyAttempt {
  readonly what: Copied;
  /** False when the text could not be copied and is shown for a manual copy. */
  readonly ok: boolean;
  readonly text: string;
}

/**
 * "Load and share", folded by default: copies the position (FEN), the whole tree (PGN) or a link
 * that carries every move, and loads a FEN or a PGN in place of the board. When the clipboard is
 * not available the text is shown, selected, so it can be copied by hand.
 */
@Component({
  selector: 'app-io-panel',
  imports: [Icon],
  templateUrl: './io-panel.html',
  styleUrl: './io-panel.css',
})
export class IoPanel {
  private readonly session = inject(AnalysisSession);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  protected readonly attempt = signal<CopyAttempt | undefined>(undefined);
  /** Set when the link would be longer than a link can carry: nothing was copied. */
  protected readonly linkRefused = signal(false);
  private readonly outcome = signal<ImportOutcome | undefined>(undefined);
  private readonly fallback = viewChild<ElementRef<HTMLTextAreaElement>>('fallback');

  /** The PGN of the moves, without headers: what the link carries. */
  private readonly movetext = computed(() => this.session.tree().toPgn());
  protected readonly tooLong = computed(() => this.movetext().length > MAX_SHARED_PGN_LENGTH);

  /** Link to the whole tree, opened at the current move when it is on the main line. */
  private readonly linkTree = computed(() => {
    const tree = this.session.tree();
    const current = this.session.currentId();
    const ply = tree.isMainLine(current) ? tree.path(current).length : undefined;
    const { commands, queryParams } = analysisLink({ tree, ply });
    return this.router.createUrlTree(commands, { queryParams });
  });

  /** The same link, absolute, as it is copied. */
  protected readonly link = computed(() => {
    const path = this.location.prepareExternalUrl(this.router.serializeUrl(this.linkTree()));
    return new URL(path, this.document.location.origin).href;
  });

  protected readonly linkNote = computed(() => {
    const t = this.i18n.t().analysis;
    const tree = this.session.tree();
    if (this.tooLong()) return t.linkTooLong(MAX_SHARED_PGN_LENGTH);
    if (tree.node(ROOT_ID).children.length === 0) return t.linkEmpty;
    return this.session.hasVariations() ? t.linkVariations : t.linkMoves;
  });

  protected readonly shareMessage = computed(() => {
    if (this.linkRefused()) return this.i18n.t().analysis.linkTooLong(MAX_SHARED_PGN_LENGTH);
    const attempt = this.attempt();
    if (!attempt) return '';
    const t = this.i18n.t().share;
    if (!attempt.ok) return t.copyFailed;
    return { fen: t.fenCopied, pgn: t.pgnCopied, link: t.linkCopied }[attempt.what];
  });

  protected readonly shareError = computed(
    () => this.linkRefused() || this.attempt()?.ok === false,
  );

  protected readonly hasImportError = computed(() => this.outcome()?.ok === false);

  /** Feedback of the last load, translated at render time so it follows the language. */
  protected readonly importMessage = computed(() => {
    const outcome = this.outcome();
    if (!outcome) return '';
    const t = this.i18n.t().importer;
    if (outcome.ok) return outcome.loaded === 'game' ? t.gameLoaded : t.positionLoaded;
    switch (outcome.error) {
      case 'empty':
        return t.empty;
      case 'too-long':
        return t.tooLong;
      case 'invalid-fen':
        return t.invalidFen;
      case 'impossible-position':
        return t.impossiblePosition;
      case 'no-game':
        return t.noGame;
      case 'unsupported-variant':
        return t.unsupportedVariant;
      case 'invalid-start-position':
        return t.invalidStartPosition;
      case 'too-many-moves':
        return this.i18n.t().analysis.tooManyMoves;
      case 'illegal-move':
        return this.i18n.t().analysis.illegalMove(outcome.move);
    }
  });

  constructor() {
    afterRenderEffect(() => {
      const field = this.fallback()?.nativeElement;
      if (!field) return;
      field.focus();
      field.select();
    });
  }

  protected copyFen(): Promise<void> {
    return this.copy('fen', this.session.current().fen);
  }

  protected copyPgn(): Promise<void> {
    return this.copy('pgn', exportTreePgn(this.session.tree()));
  }

  /**
   * Copies the link and shows it in the address bar, replacing the current history entry: moving
   * pieces never touches the URL or the history. A tree too long for a link is not copied: the
   * link would not open, so the message sends the user to the PGN instead.
   */
  protected copyLink(): Promise<void> {
    if (this.tooLong()) {
      this.attempt.set(undefined);
      this.linkRefused.set(true);
      return Promise.resolve();
    }
    const link = this.link();
    void this.router.navigateByUrl(this.linkTree(), { replaceUrl: true });
    return this.copy('link', link);
  }

  protected load(event: Event, text: string): void {
    // A plain form: without this the browser would submit it and reload the page.
    event.preventDefault();
    this.outcome.set(this.session.load(text));
  }

  private async copy(what: Copied, text: string): Promise<void> {
    // Cleared first so a repeated copy is announced again.
    this.attempt.set(undefined);
    this.linkRefused.set(false);
    const ok = await copyText(this.document.defaultView?.navigator, text);
    this.attempt.set({ what, ok, text });
  }
}
