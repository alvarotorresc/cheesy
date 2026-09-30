import { computed, DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { Chess, castlingSide } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { kingCastlesTo, makeSquare } from 'chessops/util';
import type { SquareName } from 'chessops/types';

/** What a move or square of a text asks the board to show. */
export type SpotRequest =
  | { readonly kind: 'squares'; readonly squares: readonly SquareName[] }
  /** `before`: FEN of the position the move is played from, when the caller knows it. */
  | { readonly kind: 'move'; readonly san: string; readonly before?: string };

export interface SpotShapes {
  readonly squares: readonly SquareName[];
  readonly arrow?: { readonly from: SquareName; readonly to: SquareName };
}

const NONE: SpotShapes = { squares: [] };

const positionOf = (fen: string): Chess | undefined => {
  const setup = parseFen(fen);
  if (setup.isErr) return undefined;
  const position = Chess.fromSetup(setup.value);
  return position.isErr ? undefined : position.value;
};

/**
 * Turns a request into what the board draws. A move legal in its position (the one given, or the
 * board's) becomes an arrow; otherwise only its destination square is marked, since the text may
 * speak of a later position.
 */
export function resolveSpot(request: SpotRequest | undefined, boardFen: string): SpotShapes {
  if (!request) return NONE;
  if (request.kind === 'squares') return { squares: request.squares };
  const san = request.san.replace(/[!?]+$/, '');
  const position = positionOf(request.before ?? boardFen);
  const move = position ? parseSan(position, san) : undefined;
  if (position && move && 'from' in move && position.isLegal(move)) {
    const side = castlingSide(position, move);
    const to = side ? kingCastlesTo(position.turn, side) : move.to;
    return { squares: [], arrow: { from: makeSquare(move.from), to: makeSquare(to) } };
  }
  const destination = san.match(/[a-h][1-8](?=[^a-h1-8]*$)/)?.[0] as SquareName | undefined;
  return destination ? { squares: [destination] } : NONE;
}

/**
 * What a page with a main board is pointing at: a move or squares of a text or a list. Each page
 * with a board provides its own. A request is cleared only by whoever made it, so moving from one
 * move to the next never blinks. A request from a tap lasts until a press outside any trigger (SpotTrigger never clears it).
 */
@Injectable()
export class BoardSpotlight {
  private readonly current = signal<{ request: SpotRequest; owner: object } | undefined>(undefined);
  readonly request = computed(() => this.current()?.request);

  constructor() {
    const document = inject(DOCUMENT);
    const onPress = (event: Event) => {
      if (!(event.target as Element | null)?.closest?.('[data-spot]')) this.current.set(undefined);
    };
    document.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('pointerdown', onPress, { capture: true }),
    );
  }

  point(request: SpotRequest, owner: object): void {
    this.current.set({ request, owner });
  }

  clear(owner: object): void {
    if (this.current()?.owner === owner) this.current.set(undefined);
  }
}
