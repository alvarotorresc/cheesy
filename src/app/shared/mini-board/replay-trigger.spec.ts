import { Component, provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { INITIAL_FEN } from 'chessops/fen';
import { framesFromLine } from './mini-frames';
import { createReplay, type Replay } from './replay';
import { ReplayTrigger } from './replay-trigger';

@Component({
  selector: 'app-trigger-host',
  imports: [ReplayTrigger],
  template: `<div class="card" [appReplayTrigger]="replay"><button type="button">Play</button></div>
    <button type="button" class="outside">Outside</button>`,
})
class Host {
  readonly replay: Replay = createReplay({
    frames: () => framesFromLine(INITIAL_FEN, ['e4', 'e5']),
    restPly: 'first',
  });
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

describe('ReplayTrigger', () => {
  let fixture: ComponentFixture<Host>;
  let card: HTMLElement;

  const setup = (media: Record<string, boolean>): Replay => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: media[query] ?? false }));
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    card = fixture.nativeElement.querySelector('.card');
    return fixture.componentInstance.replay;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should start on hover with a mouse and stop when the pointer leaves', () => {
    const replay = setup({ [FINE_POINTER]: true });

    card.dispatchEvent(new Event('pointerenter'));
    expect(replay.playing()).toBe(true);

    card.dispatchEvent(new Event('pointerleave'));
    expect(replay.playing()).toBe(false);
  });

  it('should keep playing after the pointer leaves when the button pinned it', () => {
    const replay = setup({ [FINE_POINTER]: true });
    replay.toggleFromButton();

    card.dispatchEvent(new Event('pointerleave'));

    expect(replay.playing()).toBe(true);
  });

  it('should not start on hover without a fine pointer or with reduced motion', () => {
    let replay = setup({});
    card.dispatchEvent(new Event('pointerenter'));
    expect(replay.playing()).toBe(false);

    fixture.destroy();
    replay = setup({ [FINE_POINTER]: true, [REDUCED]: true });
    card.dispatchEvent(new Event('pointerenter'));
    expect(replay.playing()).toBe(false);
  });

  it('should start on keyboard focus and stop when the focus leaves the card', () => {
    const replay = setup({ [FINE_POINTER]: true });
    const button = card.querySelector('button') as HTMLButtonElement;
    const outside = fixture.nativeElement.querySelector('.outside') as HTMLButtonElement;

    // The button is not really focused in the test, so say that its focus is a keyboard one.
    vi.spyOn(button, 'matches').mockImplementation((selector) => selector === ':focus-visible');
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(replay.playing()).toBe(true);

    // Focus moving inside the card does not stop it.
    card.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: button }));
    expect(replay.playing()).toBe(true);

    card.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    expect(replay.playing()).toBe(false);
  });

  it('should not start on focus that is not a keyboard focus (a tap on the button)', () => {
    const replay = setup({ [FINE_POINTER]: true });
    const button = card.querySelector('button') as HTMLButtonElement;
    vi.spyOn(button, 'matches').mockReturnValue(false);

    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(replay.playing()).toBe(false);
  });

  it('should not start on focus with reduced motion', () => {
    const replay = setup({ [REDUCED]: true });

    card.querySelector('button')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(replay.playing()).toBe(false);
  });

  it('should stop and unpin a replay whose card scrolls out of view', () => {
    let notify: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const replay = setup({ [FINE_POINTER]: true });
    replay.toggleFromButton();
    expect(replay.pinned()).toBe(true);

    notify?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);

    expect(replay.playing()).toBe(false);
    expect(replay.pinned()).toBe(false);
  });
});
