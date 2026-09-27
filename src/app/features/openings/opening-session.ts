import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { Color } from 'chessops';
import {
  ContentService,
  isContentId,
  type OpeningBook,
  type OpeningSummary,
} from '../../core/content';
import { EngineService } from '../../core/engine';
import { GameService, type GameResult, type MoveInput } from '../../core/game';
import { describeTheory, type Theory, type TheoryDeviation } from './opening-theory';

/** How the rival answers while the game is still in the tree. Out of it, the engine always plays. */
export type OpponentMode = 'book' | 'engine';

/**
 * `idle`: no opening loaded. `player`: the player's move. `opponent`: the rival is answering.
 * `deviation`: the player left the tree and has to choose between undoing and going on.
 * `engine-error`: the engine could not answer; it can be retried. `game-over`: mate or draw.
 */
export type SessionPhase =
  'idle' | 'player' | 'opponent' | 'deviation' | 'engine-error' | 'game-over';

export type LoadState = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

/** Short pause before the rival moves, so its answer does not land at the same instant. */
export const REPLY_DELAY_MS = 450;
/** Thinking time given to the engine for each move. */
export const ENGINE_MOVETIME_MS = 800;
export const MIN_SKILL_LEVEL = 0;
export const MAX_SKILL_LEVEL = 20;
export const DEFAULT_SKILL_LEVEL = 10;

const sideToMoveAfter = (plies: number): Color => (plies % 2 === 0 ? 'white' : 'black');

/**
 * State and rules of a game played from an opening: who moves, when the rival answers (from the
 * tree or with the engine), where the game stands in theory and what happens when the player
 * leaves it. The board never blocks: any legal move is accepted.
 *
 * Every rival answer carries a generation number. Undo, restart, a colour change, a new opening
 * or leaving the page bump it, so an answer that arrives late is dropped.
 *
 * Provided by the play page together with its own `GameService` and `EngineService`.
 */
@Injectable()
export class OpeningSession {
  private readonly game = inject(GameService);
  private readonly engine = inject(EngineService);
  private readonly content = inject(ContentService);

  private readonly loadStatus = signal<LoadState>('idle');
  private readonly current = signal<{ book: OpeningBook; summary: OpeningSummary } | undefined>(
    undefined,
  );
  private readonly color = signal<Color>('white');
  private readonly mode = signal<OpponentMode>('book');
  private readonly skill = signal(DEFAULT_SKILL_LEVEL);
  private readonly waiting = signal(false);
  private readonly replyFailed = signal(false);
  private readonly pendingDeviation = signal<TheoryDeviation | undefined>(undefined);
  /** Result at the end of the game, read from `GameService` whenever the game changes. */
  private readonly finalResult = signal<GameResult | undefined>(undefined);

  private loadGeneration = 0;
  private replyGeneration = 0;
  private replyTimer: ReturnType<typeof setTimeout> | undefined;
  private requestedId: string | undefined;

  readonly loadState = this.loadStatus.asReadonly();
  readonly book = computed(() => this.current()?.book);
  /** Catalogue entry of the loaded opening: name, ECO code, side and description. */
  readonly opening = computed(() => this.current()?.summary);
  readonly playerColor = this.color.asReadonly();
  readonly opponentMode = this.mode.asReadonly();
  readonly skillLevel = this.skill.asReadonly();
  readonly result = this.finalResult.asReadonly();
  /** Deviation waiting for the player to undo it or go on against the engine. */
  readonly deviation = this.pendingDeviation.asReadonly();

  private readonly sans = computed(() => this.game.moves().map((move) => move.san));

  /** Theory at the displayed position, so browsing the moves also browses the theory. */
  readonly theory = computed<Theory | undefined>(() => {
    const book = this.book();
    return book && describeTheory(book, this.sans().slice(0, this.game.ply()));
  });

  /** Theory at the end of the game. */
  readonly lineTheory = computed<Theory | undefined>(() => {
    const book = this.book();
    return book && describeTheory(book, this.sans());
  });

  readonly phase = computed<SessionPhase>(() => {
    if (!this.book()) return 'idle';
    if (this.finalResult()) return 'game-over';
    if (this.pendingDeviation()) return 'deviation';
    if (this.replyFailed()) return 'engine-error';
    return sideToMoveAfter(this.game.moves().length) === this.color() ? 'player' : 'opponent';
  });

  /** True while the rival is working on its answer. */
  readonly isThinking = computed(() => this.waiting());

  /** Whether the board accepts a move: the player's turn, on a position where the player moves. */
  readonly canMove = computed(
    () => this.phase() === 'player' && this.game.turn() === this.color() && !this.game.isGameOver(),
  );

  /** Whether the game contains a move of the player to take back. */
  readonly canUndo = computed(
    () => !!this.book() && this.game.moves().length > (this.color() === 'white' ? 0 : 1),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.loadGeneration++;
      this.cancelReply();
    });
  }

  /** Loads an opening by id, normally taken from the URL, and starts a game from its side. */
  async load(id: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.requestedId = id;
    this.cancelReply();
    this.current.set(undefined);
    this.game.reset();
    if (!isContentId(id)) {
      this.loadStatus.set('not-found');
      return;
    }
    this.loadStatus.set('loading');
    try {
      const [book, catalog] = await Promise.all([
        this.content.openingBook(id),
        this.content.openingCatalog(),
      ]);
      if (generation !== this.loadGeneration) return;
      const summary = catalog.find((entry) => entry.id === id);
      if (!book || !summary) {
        this.loadStatus.set('not-found');
        return;
      }
      this.current.set({ book, summary });
      this.loadStatus.set('ready');
      this.startGame(book.side);
    } catch (error) {
      if (generation !== this.loadGeneration) return;
      console.error(error);
      this.loadStatus.set('error');
    }
  }

  /** Tries the last requested opening again after a failed load. */
  retryLoad(): Promise<void> {
    return this.requestedId === undefined ? Promise.resolve() : this.load(this.requestedId);
  }

  /** New game with the same opening and colour. */
  restart(): void {
    if (this.book()) this.startGame(this.color());
  }

  /** New game playing the given colour. */
  setPlayerColor(color: Color): void {
    if (this.book()) this.startGame(color);
  }

  switchColor(): void {
    this.setPlayerColor(this.color() === 'white' ? 'black' : 'white');
  }

  /** Applies to the next answer of the rival. */
  setOpponentMode(mode: OpponentMode): void {
    this.mode.set(mode);
  }

  /** Engine strength for the next answers, from 0 to 20. */
  setSkillLevel(level: number): void {
    if (Number.isNaN(level)) return;
    this.skill.set(Math.min(Math.max(Math.round(level), MIN_SKILL_LEVEL), MAX_SKILL_LEVEL));
  }

  /**
   * Plays the player's move from the displayed position (if the player went back, the moves after
   * it are replaced). Leaving the tree pauses the game until the player undoes or goes on.
   * Returns false when it is not the player's turn or the move is illegal.
   */
  play(move: MoveInput): boolean {
    if (!this.canMove()) return false;
    const wasInBook = this.theory()?.status === 'in-book';
    if (!this.game.play(move)) return false;
    this.cancelReply();
    this.afterMove();
    const theory = this.lineTheory();
    if (wasInBook && theory?.status === 'out-of-book') {
      this.pendingDeviation.set(theory.deviation);
      return true;
    }
    this.requestReply();
    return true;
  }

  /** Accepts the deviation: the game goes on against the engine. */
  continueOutOfBook(): void {
    if (!this.pendingDeviation()) return;
    this.pendingDeviation.set(undefined);
    this.requestReply();
  }

  /**
   * Takes back the last move of the player, and the rival's answer to it if there is one. Any
   * answer on its way is dropped. Always ends on the player's turn.
   */
  undo(): void {
    if (!this.canUndo()) return;
    this.cancelReply();
    this.pendingDeviation.set(undefined);
    this.replyFailed.set(false);
    this.game.goToEnd();
    let removedPlayerMove = false;
    while (!removedPlayerMove) {
      removedPlayerMove = sideToMoveAfter(this.game.moves().length - 1) === this.color();
      this.game.undo();
    }
    this.afterMove();
  }

  /** Asks the engine again after it failed. */
  retryReply(): void {
    if (!this.replyFailed()) return;
    this.replyFailed.set(false);
    this.requestReply();
  }

  private startGame(color: Color): void {
    this.cancelReply();
    this.pendingDeviation.set(undefined);
    this.replyFailed.set(false);
    this.color.set(color);
    this.game.reset();
    this.afterMove();
    this.requestReply();
  }

  /** Records the result at the end of the game. Called with the last position displayed. */
  private afterMove(): void {
    this.finalResult.set(this.game.result());
  }

  /** Starts the rival's answer if it is its turn. */
  private requestReply(): void {
    if (this.phase() !== 'opponent') return;
    const generation = ++this.replyGeneration;
    const moves = this.game.moves().length;
    const theory = this.lineTheory();
    const bookMove = this.mode() === 'book' ? theory?.next : undefined;
    const startedAt = Date.now();
    this.waiting.set(true);
    const answer = bookMove
      ? Promise.resolve(bookMove.san)
      : this.engine
          .bestMove(this.game.moves().at(-1)?.fenAfter ?? this.game.startFen(), {
            skillLevel: this.skill(),
            movetime: ENGINE_MOVETIME_MS,
          })
          .then((move) => move?.san);
    answer.then(
      (san) => {
        if (generation !== this.replyGeneration) return;
        const remaining = Math.max(0, REPLY_DELAY_MS - (Date.now() - startedAt));
        this.replyTimer = setTimeout(() => this.applyReply(generation, moves, san), remaining);
      },
      (error: unknown) => {
        if (generation !== this.replyGeneration) return;
        console.error(error);
        this.waiting.set(false);
        this.replyFailed.set(true);
      },
    );
  }

  private applyReply(generation: number, moves: number, san: string | undefined): void {
    this.replyTimer = undefined;
    if (generation !== this.replyGeneration || this.game.moves().length !== moves) return;
    this.waiting.set(false);
    this.game.goToEnd();
    if (!san || !this.game.playSan(san)) {
      this.replyFailed.set(true);
      return;
    }
    this.afterMove();
  }

  /** Drops the answer on its way, if any, and stops the engine search behind it. */
  private cancelReply(): void {
    this.replyGeneration++;
    clearTimeout(this.replyTimer);
    this.replyTimer = undefined;
    if (this.waiting()) {
      this.waiting.set(false);
      this.engine.stop();
    }
  }
}
