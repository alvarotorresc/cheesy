import type { ParamMap } from '@angular/router';
import { INITIAL_FEN } from 'chessops/fen';
import { isContentId } from '../content/content-id';
import type { Lang } from '../i18n/i18n.types';
import { MoveTree, ROOT_ID } from '../move-tree';
import { pageUrls } from '../routing/site-urls';

/** A FEN is under 100 characters; anything much longer is not one and is not parsed. */
export const MAX_SHARED_FEN_LENGTH = 128;
/** Longest movetext a link can carry, once decoded. A longer one makes the link invalid. */
export const MAX_SHARED_PGN_LENGTH = 6000;

export const FEN_PARAM = 'fen';
export const PGN_PARAM = 'pgn';
export const PLY_PARAM = 'ply';
export const FROM_PARAM = 'from';

export type AnalysisOriginKind = 'opening' | 'practice' | 'endgame' | 'position';

const ORIGIN_KINDS: readonly AnalysisOriginKind[] = ['opening', 'practice', 'endgame', 'position'];

/** Where a link to Analysis comes from: it shows the "From" notice and a way back. */
export interface AnalysisOrigin {
  readonly kind: AnalysisOriginKind;
  readonly id: string;
}

export interface AnalysisLinkInput {
  /** Start position; left out of the link when it is the initial one. */
  readonly fen?: string;
  /** Main line in English SAN, from `fen`. */
  readonly moves?: readonly string[];
  /** The whole tree instead, with its variations. Wins over `moves`. */
  readonly tree?: MoveTree;
  /** Half-moves of the main line to show; left out when it is the end of the line. */
  readonly ply?: number;
  readonly from?: AnalysisOrigin;
  /** Language of the page the link opens (`/en/analysis`, `/es/analisis`); English by default. */
  readonly lang?: Lang;
}

/** What `routerLink` needs to open Analysis. */
export interface AnalysisLink {
  readonly commands: [string];
  readonly queryParams: Record<string, string>;
}

export type ParsedAnalysisLink =
  /** No parameter of the link is there: Analysis opens as it does on its own. */
  | { readonly status: 'none' }
  | {
      readonly status: 'ok';
      readonly tree: MoveTree;
      readonly currentId: string;
      readonly origin?: AnalysisOrigin;
    }
  /** A parameter is not valid: Analysis shows its notice and the initial position. */
  | { readonly status: 'invalid' };

const treeOf = (input: AnalysisLinkInput): MoveTree => {
  if (input.tree) return input.tree;
  const tree = MoveTree.fromFen(input.fen ?? INITIAL_FEN);
  let id = ROOT_ID;
  for (const san of input.moves ?? []) {
    const played = tree.playSan(id, san);
    if (!played) throw new Error(`Illegal move in the link: ${san}`);
    id = played.id;
  }
  return tree;
};

/**
 * The link to Analysis for a position, a line or a whole tree. The router encodes the parameters.
 * The moves are always English SAN, whatever the language of the screen.
 */
export const analysisLink = (input: AnalysisLinkInput): AnalysisLink => {
  const tree = treeOf(input);
  const queryParams: Record<string, string> = {};
  if (tree.startFen !== INITIAL_FEN) queryParams[FEN_PARAM] = tree.startFen;
  const pgn = tree.toPgn();
  if (pgn) queryParams[PGN_PARAM] = pgn;
  const { ply } = input;
  if (ply !== undefined && Number.isInteger(ply) && ply >= 0 && ply < tree.mainLine().length) {
    queryParams[PLY_PARAM] = String(ply);
  }
  if (input.from) queryParams[FROM_PARAM] = `${input.from.kind}:${input.from.id}`;
  return { commands: [pageUrls.pathOf({ kind: 'analysis' }, input.lang ?? 'en')], queryParams };
};

/** The same link as an absolute URL, for "Copy link". `baseHref` is the `<base href>`. */
export const absoluteAnalysisUrl = (input: AnalysisLinkInput, baseHref: string): string => {
  const { queryParams } = analysisLink(input);
  const url = new URL(pageUrls.pathOf({ kind: 'analysis' }, input.lang ?? 'en').slice(1), baseHref);
  for (const [name, value] of Object.entries(queryParams)) url.searchParams.set(name, value);
  return url.toString().replace(/\+/g, '%20');
};

/** Lines of PGN headers (`[Event "x"]`) have no place in a link and are dropped. */
const withoutHeaders = (pgn: string): string =>
  pgn
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('['))
    .join('\n');

const parseOrigin = (value: string | null): AnalysisOrigin | undefined => {
  if (value === null) return undefined;
  const colon = value.indexOf(':');
  if (colon < 0) return undefined;
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!(ORIGIN_KINDS as readonly string[]).includes(kind) || !isContentId(id)) return undefined;
  return { kind: kind as AnalysisOriginKind, id };
};

/**
 * Reads the parameters of a link to Analysis. They are untrusted: sizes are checked before
 * anything is parsed, and the chess parts are validated by chessops. A bad `ply` or `from` is
 * ignored; a bad `fen` or `pgn` makes the whole link invalid.
 */
export const parseAnalysisParams = (params: ParamMap): ParsedAnalysisLink => {
  const fen = params.get(FEN_PARAM);
  const pgn = params.get(PGN_PARAM);
  const ply = params.get(PLY_PARAM);
  const origin = parseOrigin(params.get(FROM_PARAM));
  if (fen === null && pgn === null && ply === null && origin === undefined) {
    return { status: 'none' };
  }

  if (fen !== null && fen.length > MAX_SHARED_FEN_LENGTH) return { status: 'invalid' };
  if (pgn !== null && pgn.length > MAX_SHARED_PGN_LENGTH) return { status: 'invalid' };

  let tree: MoveTree;
  try {
    tree = MoveTree.fromPgn(pgn === null ? '' : withoutHeaders(pgn), fen ?? INITIAL_FEN);
  } catch {
    return { status: 'invalid' };
  }

  const main = tree.mainLine();
  const shown = ply !== null && /^\d{1,6}$/.test(ply) ? Number(ply) : undefined;
  const currentId =
    shown !== undefined && shown <= main.length
      ? shown === 0
        ? ROOT_ID
        : main[shown - 1].id
      : tree.lineEnd(ROOT_ID);
  return origin ? { status: 'ok', tree, currentId, origin } : { status: 'ok', tree, currentId };
};
