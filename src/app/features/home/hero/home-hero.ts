import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
  type OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n';
import { Icon } from '../../../shared/icon';
import { MiniBoard, ReplayCoordinator } from '../../../shared/mini-board';
import { HERO_OPENING_IDS, type OpeningLine } from '../home-data';
import { createHeroPlayer } from '../hero-player';

interface MovePair {
  readonly number: number;
  readonly moves: readonly { readonly index: number; readonly text: string }[];
}

/**
 * The main board of the home page: it plays the main line of four openings one after another,
 * with the moves, the name of the variation and the controls next to it. It waits, without
 * pausing, while a section card plays, and it does not move off screen or in a hidden tab.
 */
@Component({
  selector: 'app-home-hero',
  imports: [Icon, MiniBoard, RouterLink],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.css',
})
export class HomeHero implements OnInit {
  readonly lines = input.required<readonly OpeningLine[]>();

  protected readonly i18n = inject(I18nService);
  private readonly coordinator = inject(ReplayCoordinator);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly player = createHeroPlayer({
    lines: () => this.lines(),
    releaseHold: () => this.coordinator.active()?.stop(),
  });

  protected readonly line = computed(() => this.lines()[this.player.index()]);
  protected readonly name = computed(() => this.i18n.localize(this.line().name));

  protected readonly pairs = computed<MovePair[]>(() => {
    const sans = this.line().sans;
    const pairs: MovePair[] = [];
    for (let index = 0; index < sans.length; index += 2) {
      pairs.push({
        number: index / 2 + 1,
        moves: sans
          .slice(index, index + 2)
          .map((san, offset) => ({ index: index + offset, text: this.i18n.san(san) })),
      });
    }
    return pairs;
  });

  /** Name of the variation the line has reached, only when it says more than the opening's name. */
  protected readonly variant = computed(() => {
    const names = this.line().names;
    let reached = '';
    for (let index = 0; index < this.player.ply(); index++) {
      const localized = names[index];
      if (localized) reached = this.i18n.localize(localized);
    }
    return reached && !this.name().startsWith(reached) ? reached : '';
  });

  protected readonly progress = computed(() => {
    const last = this.player.lastPly();
    return last === 0 ? 0 : this.player.ply() / last;
  });

  constructor() {
    // A section card that plays takes the stage: the hero waits.
    effect(() => {
      const hold = this.coordinator.active() !== undefined;
      untracked(() => this.player.setHold(hold));
    });
    afterNextRender(() => this.watchEnvironment());
  }

  ngOnInit(): void {
    this.player.begin();
  }

  private watchEnvironment(): void {
    if (typeof matchMedia === 'function') {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const onReducedChange = (): void => {
        if (reduced.matches) this.player.reduceMotion();
      };
      reduced.addEventListener('change', onReducedChange);
      this.destroyRef.onDestroy(() => reduced.removeEventListener('change', onReducedChange));
    }

    // Off screen or in a hidden tab nothing moves.
    let onScreen = true;
    const update = (): void => this.player.setOffscreen(!onScreen || this.document.hidden);
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) onScreen = entry.isIntersecting;
          update();
        },
        { threshold: 0.25 },
      );
      observer.observe(this.stage().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    }
    this.document.addEventListener('visibilitychange', update);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', update));
  }

  protected shortName(id: string): string {
    return this.i18n.t().home.heroShort[id as (typeof HERO_OPENING_IDS)[number]];
  }

  /** Touching the hero controls gives the stage back to the big board. */
  protected previous(): void {
    this.coordinator.active()?.stop();
    this.player.previous();
  }

  protected next(): void {
    this.coordinator.active()?.stop();
    this.player.next();
  }

  protected choose(index: number): void {
    this.coordinator.active()?.stop();
    this.player.choose(index);
  }
}
