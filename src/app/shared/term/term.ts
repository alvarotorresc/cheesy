import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import type { GlossaryTerm } from '../../core/content/content.types';
import { I18nService } from '../../core/i18n';
import { frameFromFen, MiniBoard } from '../mini-board';
import { RichTextView } from '../rich-text';
import { TermRegistry } from './term-registry';

type State =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; term: GlossaryTerm | undefined };

interface Place {
  readonly left: number;
  readonly width: number;
  /** Distance from the top of the screen (below the word) or from the bottom (above it). */
  readonly edge: number;
  readonly above: boolean;
  /** Room left on the chosen side: the popup scrolls inside rather than past the screen. */
  readonly maxHeight: number;
}

const HOVER_MS = 300;
/** Grace time to cross from the word to the popup with the mouse without losing it. */
const LEAVE_MS = 150;
const GUTTER = 16;
const GAP = 8;
const WIDTH = 352; // 22rem
/** Height assumed for the popup until it has been drawn and measured. */
const ESTIMATED_HEIGHT = 380;

let nextId = 0;

/**
 * A glossary term inside a text: the word as written, with a discreet underline. A click, a tap,
 * Enter or Space (or the mouse resting on it) opens a popup with the definition, a small board and a
 * link to the glossary page. It downloads the glossary only when first opened.
 */
@Component({
  selector: 'app-term',
  imports: [RouterLink, MiniBoard, forwardRef(() => RichTextView)],
  templateUrl: './term.html',
  styleUrl: './term.css',
  host: { '(focusout)': 'onFocusOut($event)' },
})
export class TermView {
  readonly id = input.required<string>();
  readonly text = input.required<string>();

  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly registry = inject(TermRegistry);
  /** What the registry calls to close this term when another one opens. */
  private readonly handle = { close: () => this.close(false) };
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');

  protected readonly popupId = `term-popup-${nextId++}`;
  protected readonly nameId = `${this.popupId}-name`;
  protected readonly state = signal<State>({ kind: 'closed' });
  protected readonly open = computed(() => this.state().kind !== 'closed');
  protected readonly place = signal<Place>({
    left: 0,
    width: WIDTH,
    edge: 0,
    above: false,
    maxHeight: 0,
  });
  protected readonly readyTerm = computed<GlossaryTerm | undefined>(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.term : undefined;
  });
  protected readonly frames = computed(() => {
    const term = this.readyTerm();
    return term ? [frameFromFen(term.example.fen)] : [];
  });

  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;
  private openedByHover = false;

  constructor() {
    const host = () => this.button().nativeElement.parentElement;
    const onPress = (event: Event) => {
      if (this.open() && !host()?.contains(event.target as Node)) this.close(false);
    };
    // Escape closes it wherever the focus is (a popup opened by the mouse never took it), and is
    // kept from the rest of the page (the Analysis board uses the keyboard).
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !this.open()) return;
      event.preventDefault();
      event.stopPropagation();
      this.close(host()?.contains(event.target as Node) ?? false);
    };
    // The popup was placed for one window size and scroll position: close it rather than chase them.
    const onViewChange = () => this.open() && this.close(false);
    this.document.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    this.document.addEventListener('keydown', onKey, { capture: true });
    const view = this.document.defaultView;
    view?.addEventListener('scroll', onViewChange, { passive: true });
    view?.addEventListener('resize', onViewChange, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.hoverTimer);
      clearTimeout(this.leaveTimer);
      this.registry.release(this.handle);
      this.document.removeEventListener('pointerdown', onPress, { capture: true });
      this.document.removeEventListener('keydown', onKey, { capture: true });
      view?.removeEventListener('scroll', onViewChange);
      view?.removeEventListener('resize', onViewChange);
    });

    // The popup grows when its content arrives: place it again once it has been drawn.
    effect(() => {
      if (!this.state() || !this.open()) return;
      afterNextRender(
        () => {
          this.raise();
          this.position();
        },
        { injector: this.injector },
      );
    });
  }

  protected toggle(): void {
    if (this.open() && this.openedByHover) {
      // A click on a popup the mouse opened pins it: it stays, and is not loaded again.
      this.openedByHover = false;
      return;
    }
    if (this.open()) this.close(false);
    else this.show(false);
  }

  protected onEnter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.cancelLeave();
    if (!this.open()) this.hoverTimer = setTimeout(() => this.show(true), HOVER_MS);
  }

  protected onPopupEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.cancelLeave();
  }

  /** A press inside a popup the mouse opened pins it, like a click on the word. */
  protected onPopupPress(): void {
    this.openedByHover = false;
    this.cancelLeave();
  }

  protected onLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(this.hoverTimer);
    if (!this.openedByHover) return;
    this.leaveTimer = setTimeout(() => this.close(false), LEAVE_MS);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    // No next element (a click on the popup's text, the window losing focus) is not leaving.
    if (next && !this.button().nativeElement.parentElement?.contains(next)) this.close(false);
  }

  private cancelLeave(): void {
    clearTimeout(this.leaveTimer);
  }

  private show(byHover: boolean): void {
    clearTimeout(this.hoverTimer);
    this.openedByHover = byHover;
    this.registry.claim(this.handle);
    this.state.set({ kind: 'loading' });
    this.content.glossaryTerm(this.id()).then(
      (term) => this.open() && this.state.set({ kind: 'ready', term }),
      () => this.open() && this.state.set({ kind: 'failed' }),
    );
  }

  private close(focus: boolean): void {
    clearTimeout(this.hoverTimer);
    this.cancelLeave();
    this.openedByHover = false;
    this.registry.release(this.handle);
    this.state.set({ kind: 'closed' });
    if (focus) this.button().nativeElement.focus();
  }

  /** Puts the popup in the top layer once (it leaves it by itself when it is removed). */
  private raise(): void {
    const popup = this.popup()?.nativeElement;
    if (!popup || typeof popup.showPopover !== 'function' || popup.matches(':popover-open')) return;
    popup.showPopover();
  }

  /**
   * Under the word, or above it when it would not fit below; never past the screen edges (fixed in
   * the top layer, so it ignores any scroll container and any transformed ancestor).
   */
  private position(): void {
    if (!this.open()) return;
    const view = this.document.defaultView;
    const rect = this.button().nativeElement.getBoundingClientRect();
    const viewportWidth = view?.innerWidth ?? WIDTH + 2 * GUTTER;
    const viewportHeight = view?.innerHeight ?? ESTIMATED_HEIGHT + 2 * GUTTER;
    // Until the content is there the popup is a one-line status: place it as if it were full size.
    const kind = this.state().kind;
    const measured = kind === 'ready' || kind === 'failed';
    const height = (measured && this.popup()?.nativeElement.offsetHeight) || ESTIMATED_HEIGHT;
    const width = Math.min(WIDTH, viewportWidth - 2 * GUTTER);
    const left = Math.min(Math.max(rect.left, GUTTER), viewportWidth - GUTTER - width);
    const roomBelow = viewportHeight - rect.bottom - GAP - GUTTER;
    const roomAbove = rect.top - GAP - GUTTER;
    const above = height > roomBelow && roomAbove > roomBelow;
    this.place.set({
      left,
      width,
      above,
      edge: above ? viewportHeight - rect.top + GAP : rect.bottom + GAP,
      maxHeight: Math.max(above ? roomAbove : roomBelow, 0),
    });
  }
}
