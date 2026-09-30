import {
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  forwardRef,
  inject,
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

type State =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; term: GlossaryTerm | undefined };

const HOVER_MS = 300;
const GUTTER = 16;
const WIDTH = 352; // 22rem

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
  host: { '(keydown)': 'onKeydown($event)' },
})
export class TermView {
  readonly id = input.required<string>();
  readonly text = input.required<string>();

  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly document = inject(DOCUMENT);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  protected readonly popupId = `term-popup-${nextId++}`;
  protected readonly state = signal<State>({ kind: 'closed' });
  protected readonly open = computed(() => this.state().kind !== 'closed');
  protected readonly place = signal({ top: 0, left: 0, width: WIDTH });
  protected readonly readyTerm = computed<GlossaryTerm | undefined>(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.term : undefined;
  });
  protected readonly frames = computed(() => {
    const term = this.readyTerm();
    return term ? [frameFromFen(term.example.fen)] : [];
  });

  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  private openedByHover = false;

  constructor() {
    const onPress = (event: Event) => {
      if (!this.open()) return;
      const host = this.button().nativeElement.parentElement;
      if (!host?.contains(event.target as Node)) this.close(false);
    };
    const onScroll = () => this.open() && this.close(false);
    this.document.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    this.document.defaultView?.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.hoverTimer);
      this.document.removeEventListener('pointerdown', onPress, { capture: true });
      this.document.defaultView?.removeEventListener('scroll', onScroll);
    });
  }

  protected toggle(): void {
    if (this.open() && !this.openedByHover) this.close(false);
    else this.show(false);
  }

  protected onEnter(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.open()) return;
    this.hoverTimer = setTimeout(() => this.show(true), HOVER_MS);
  }

  protected onLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(this.hoverTimer);
    if (this.openedByHover) this.close(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  }

  private show(byHover: boolean): void {
    this.openedByHover = byHover;
    this.position();
    this.state.set({ kind: 'loading' });
    this.content.glossaryTerm(this.id()).then(
      (term) => this.open() && this.state.set({ kind: 'ready', term }),
      () => this.open() && this.state.set({ kind: 'failed' }),
    );
  }

  private close(focus: boolean): void {
    clearTimeout(this.hoverTimer);
    this.openedByHover = false;
    this.state.set({ kind: 'closed' });
    if (focus) this.button().nativeElement.focus();
  }

  /** Below the word, never past the screen edges (fixed, so it ignores any scroll container). */
  private position(): void {
    const rect = this.button().nativeElement.getBoundingClientRect();
    const viewport = this.document.defaultView?.innerWidth ?? WIDTH + 2 * GUTTER;
    const width = Math.min(WIDTH, viewport - 2 * GUTTER);
    const left = Math.min(Math.max(rect.left, GUTTER), viewport - GUTTER - width);
    this.place.set({ top: rect.bottom + 8, left, width });
  }
}
