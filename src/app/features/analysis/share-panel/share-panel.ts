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
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../../../core/game';
import { I18nService } from '../../../core/i18n';
import { FEN_PARAM } from '../shared-position';
import { copyText } from './clipboard';

type Copied = 'fen' | 'pgn' | 'link';

interface CopyAttempt {
  what: Copied;
  /** False when the text could not be copied and is shown for a manual copy. */
  ok: boolean;
  text: string;
}

/**
 * Copies the displayed position (FEN), the whole game (PGN) or a link to the position. When the
 * clipboard is not available the text is shown, selected, so it can be copied by hand.
 */
@Component({
  selector: 'app-share-panel',
  templateUrl: './share-panel.html',
  styleUrl: './share-panel.css',
})
export class SharePanel {
  private readonly game = inject(GameService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  protected readonly attempt = signal<CopyAttempt | undefined>(undefined);
  private readonly fallback = viewChild<ElementRef<HTMLTextAreaElement>>('fallback');

  protected readonly message = computed(() => {
    const attempt = this.attempt();
    if (!attempt) return '';
    const t = this.i18n.t().share;
    if (!attempt.ok) return t.copyFailed;
    return { fen: t.fenCopied, pgn: t.pgnCopied, link: t.linkCopied }[attempt.what];
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
    return this.copy('fen', this.game.fen());
  }

  protected copyPgn(): Promise<void> {
    return this.copy('pgn', this.game.exportPgn());
  }

  /**
   * Copies a link to the displayed position and shows the same link in the address bar. The
   * address bar is only updated here, replacing the current history entry: moving pieces never
   * touches the URL or the browser history.
   */
  protected copyLink(): Promise<void> {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { [FEN_PARAM]: this.game.fen() },
    });
    const path = this.location.prepareExternalUrl(this.router.serializeUrl(tree));
    const link = new URL(path, this.document.location.origin).href;
    void this.router.navigateByUrl(tree, { replaceUrl: true });
    return this.copy('link', link);
  }

  private async copy(what: Copied, text: string): Promise<void> {
    // Cleared first so a repeated copy is announced again.
    this.attempt.set(undefined);
    const ok = await copyText(this.document.defaultView?.navigator, text);
    this.attempt.set({ what, ok, text });
  }
}
