import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { GlossaryTerm, Segment } from '../../../core/content/content.types';
import { I18nService } from '../../../core/i18n';
import { ReadingModeService } from '../../../core/reading-mode';

/** The same wait as the popups of `<app-term>` elsewhere: a mouse that only passes shows nothing. */
const HOVER_MS = 300;
/** Grace time after the mouse leaves, so the hint does not flicker between two words. */
const LEAVE_MS = 150;
const GUTTER = 16;
const GAP = 6;

let nextId = 0;

/**
 * A text of the content as plain words: terms and squares as written, moves as the reading mode
 * writes them (the sentence in words mode, the number and the SAN in notation).
 */
export const plainSegments = (segments: readonly Segment[], reading: ReadingModeService): string =>
  segments
    .map((segment) => {
      switch (segment.kind) {
        case 'text':
        case 'term':
          return segment.text;
        case 'square':
          return segment.square;
        case 'move':
          return reading.words()
            ? reading.full(segment.san, { start: segment.start })
            : `${segment.number ?? ''}${reading.full(segment.san)}`;
      }
    })
    .join('');

/** Up to the first full stop (or question or exclamation mark) followed by a space or the end. */
export const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  return /^.*?[.!?…]['"»”’)]*(?=\s|$)/su.exec(trimmed)?.[0] ?? trimmed;
};

interface Hint {
  readonly link: HTMLAnchorElement;
  readonly text: string;
}

/**
 * Wraps the cards of the glossary page: a glossary link inside a definition shows, when the mouse
 * rests on it or the keyboard reaches it, a small bubble with the first sentence of that term. No
 * board, and nothing on touch, where a tap goes straight to the card. Only this page uses it: the
 * same links inside the popups of `<app-term>` stay plain.
 */
@Component({
  selector: 'app-term-hints',
  templateUrl: './term-hints.html',
  styleUrl: './term-hints.css',
  host: {
    '(pointerover)': 'onOver($event)',
    '(pointerout)': 'onOut($event)',
    '(pointerdown)': 'hide()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(click)': 'hide()',
  },
})
export class TermHints {
  readonly terms = input.required<readonly GlossaryTerm[]>();

  private readonly i18n = inject(I18nService);
  private readonly reading = inject(ReadingModeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly bubble = viewChild<ElementRef<HTMLElement>>('bubble');

  protected readonly id = `term-hint-${nextId++}`;
  private readonly current = signal<HTMLAnchorElement | null>(null);
  protected readonly place = signal<{ left: number; top: number } | null>(null);
  protected readonly hint = computed<Hint | null>(() => {
    const link = this.current();
    if (!link) return null;
    const id = link.hash.slice(1);
    const term = this.terms().find((t) => t.id === id);
    if (!term) return null;
    const text = plainSegments(term.definition[this.i18n.lang()], this.reading);
    return { link, text: firstSentence(text) };
  });

  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * The last thing the reader used was a pointer, not the keyboard: the focus a tap or a click gives
   * a link must not open a hint (on touch, a tap only goes to the card).
   */
  private pointing = false;

  constructor() {
    const onPress = () => (this.pointing = true);
    // Escape hides it wherever the focus is (a hint the mouse opened never took it).
    const onKey = (event: KeyboardEvent) => {
      this.pointing = false;
      if (event.key !== 'Escape' || !this.current()) return;
      event.preventDefault();
      this.hide();
    };
    // Placed for one scroll position and window size: hide it rather than chase them.
    const onViewChange = () => this.current() && this.hide();
    const view = this.document.defaultView;
    this.document.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    this.document.addEventListener('keydown', onKey, { capture: true });
    view?.addEventListener('scroll', onViewChange, { passive: true });
    view?.addEventListener('resize', onViewChange, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      this.hide();
      this.document.removeEventListener('pointerdown', onPress, { capture: true });
      this.document.removeEventListener('keydown', onKey, { capture: true });
      view?.removeEventListener('scroll', onViewChange);
      view?.removeEventListener('resize', onViewChange);
    });
  }

  protected onOver(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const link = this.linkOf(event.target);
    if (!link) return;
    clearTimeout(this.leaveTimer);
    if (this.current() === link) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => this.show(link), HOVER_MS);
  }

  protected onOut(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const link = this.linkOf(event.target);
    if (!link || link.contains(event.relatedTarget as Node | null)) return;
    clearTimeout(this.hoverTimer);
    if (this.current() !== link) return;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => this.hide(), LEAVE_MS);
  }

  protected onFocusIn(event: FocusEvent): void {
    const link = this.linkOf(event.target);
    if (!link || this.pointing) return;
    this.show(link);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (this.linkOf(event.target) === this.current()) this.hide();
  }

  hide(): void {
    clearTimeout(this.hoverTimer);
    clearTimeout(this.leaveTimer);
    this.current()?.removeAttribute('aria-describedby');
    this.current.set(null);
    this.place.set(null);
  }

  private show(link: HTMLAnchorElement): void {
    clearTimeout(this.hoverTimer);
    clearTimeout(this.leaveTimer);
    if (this.current() !== link) this.current()?.removeAttribute('aria-describedby');
    this.current.set(link);
    this.place.set(null);
    if (!this.hint()) {
      this.current.set(null);
      return;
    }
    link.setAttribute('aria-describedby', this.id);
    afterNextRender(() => this.position(link), { injector: this.injector });
  }

  private linkOf(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null;
    const link = target.closest<HTMLAnchorElement>('a.term');
    return link && this.host.nativeElement.contains(link) ? link : null;
  }

  /**
   * Under the word, or above it when it does not fit below: never over the word itself, and never
   * past the edges of the window. Fixed in the top layer, so no card or scroll box clips it.
   */
  private position(link: HTMLAnchorElement): void {
    const bubble = this.bubble()?.nativeElement;
    if (!bubble || this.current() !== link) return;
    if (typeof bubble.showPopover === 'function' && !bubble.matches(':popover-open')) {
      bubble.showPopover();
    }
    const view = this.document.defaultView;
    const width = view?.innerWidth ?? 0;
    const height = view?.innerHeight ?? 0;
    const word = link.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    const below = word.bottom + GAP;
    const top = below + box.height > height - GUTTER ? word.top - GAP - box.height : below;
    const left = Math.min(
      Math.max(word.left, GUTTER),
      Math.max(width - GUTTER - box.width, GUTTER),
    );
    this.place.set({ left, top: Math.max(top, GUTTER) });
  }
}
