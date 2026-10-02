import { describe, expect, it } from 'vitest';
import { normalizeMove } from 'chessops/chess';
import { parseSquare } from 'chessops/util';
import { loadGlossary, loadGlossaryRaw, loadPositions } from '../../lib/content.ts';
import { fenError, positionFromFen } from '../../lib/chess.ts';
import { validateGlossaryTerm } from '../../lib/schema.ts';

/** The closed list of the plan (docs/superpowers/plans/2026-09-30-lenguaje-llano-pr3-glosario.md). */
const EXPECTED_IDS = [
  'rank',
  'file',
  'diagonal',
  'check',
  'checkmate',
  'stalemate',
  'castling',
  'en-passant',
  'promotion',
  'queening-square',
  'piece-value',
  'centre',
  'development',
  'exchange',
  'gambit',
  'fianchetto',
  'long-diagonal',
  'flank',
  'space',
  'initiative',
  'counterplay',
  'pawn-structure',
  'pawn-chain',
  'pawn-break',
  'isolated-pawn',
  'doubled-pawns',
  'hanging-pawns',
  'bishop-pair',
  'minority-attack',
  'tempo',
  'intermediate-move',
  'pin',
  'fork',
  'knight-fork',
  'skewer',
  'double-check',
  'discovered-attack',
  'deflection',
  'attraction',
  'back-rank',
  'sacrifice',
  'queen-sacrifice',
  'opening-trap',
  'smothered-mate',
  'legal-mate',
  'boden-mate',
  'anastasia-mate',
  'arabian-mate',
  'opposition',
  'key-squares',
  'rule-of-the-square',
  'lucena-position',
  'philidor-position',
  'building-a-bridge',
].sort();

/** The family of every term: the glossary page groups the terms by it, in this order. */
const GROUPS: Record<string, string[]> = {
  rules: [
    'check',
    'checkmate',
    'stalemate',
    'castling',
    'promotion',
    'en-passant',
    'rank',
    'file',
    'diagonal',
    'queening-square',
    'piece-value',
  ],
  tactics: [
    'pin',
    'fork',
    'knight-fork',
    'skewer',
    'double-check',
    'discovered-attack',
    'deflection',
    'attraction',
    'intermediate-move',
    'sacrifice',
    'queen-sacrifice',
    'back-rank',
    'opening-trap',
  ],
  mates: ['smothered-mate', 'legal-mate', 'boden-mate', 'anastasia-mate', 'arabian-mate'],
  strategy: [
    'centre',
    'development',
    'gambit',
    'fianchetto',
    'long-diagonal',
    'flank',
    'space',
    'initiative',
    'counterplay',
    'tempo',
    'exchange',
    'bishop-pair',
  ],
  pawns: [
    'pawn-structure',
    'pawn-chain',
    'pawn-break',
    'isolated-pawn',
    'doubled-pawns',
    'hanging-pawns',
    'minority-attack',
  ],
  endgames: [
    'opposition',
    'key-squares',
    'rule-of-the-square',
    'lucena-position',
    'philidor-position',
    'building-a-bridge',
  ],
};

const SOURCE_HOSTS = ['fide.com', 'lichess.org', 'wikipedia.org', 'chess.com'];

const raw = loadGlossaryRaw();
const glossary = loadGlossary();

describe('glossary', () => {
  it('every entry matches the GlossaryTerm schema', () => {
    const errors = (raw as unknown[]).flatMap((t, i) => validateGlossaryTerm(t, `glossary[${i}]`));
    expect(errors).toEqual([]);
  });

  it('ids are unique', () => {
    const ids = glossary.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds only terms of the closed list', () => {
    const unknown = glossary.map((t) => t.id).filter((id) => !EXPECTED_IDS.includes(id));
    expect(unknown).toEqual([]);
  });

  it('holds every term of the closed list', () => {
    expect(glossary.map((t) => t.id).sort()).toEqual(EXPECTED_IDS);
  });

  it('the families cover the closed list, each term in exactly one', () => {
    expect(Object.values(GROUPS).flat().sort()).toEqual(EXPECTED_IDS);
  });

  it('every term belongs to its family', () => {
    const wrong = glossary
      .filter((t) => !GROUPS[t.group]?.includes(t.id))
      .map((t) => `${t.id}: ${String(t.group)}`);
    expect(wrong).toEqual([]);
  });

  it('every tag of the positions is a glossary term', () => {
    const ids = new Set(glossary.map((t) => t.id));
    const missing = [...new Set(loadPositions().flatMap((p) => p.tags))].filter(
      (tag) => !ids.has(tag),
    );
    expect(missing).toEqual([]);
  });

  describe('validateGlossaryTerm rejects bad values', () => {
    const good = (raw as Record<string, unknown>[])[0]!;
    const withExample = (patch: Record<string, unknown>) => ({
      ...good,
      example: { ...(good.example as object), ...patch },
    });
    const arrow = (a: object) =>
      withExample({ arrows: [{ from: 'e2', to: 'e4', move: true, ...a }] });
    const cases: [string, unknown][] = [
      ['a highlight off the board', withExample({ highlights: ['e9'] })],
      ['a highlight that is not a square', withExample({ highlights: ['e'] })],
      ['an arrow origin off the board', arrow({ from: 'i2' })],
      ['an arrow target off the board', arrow({ to: 'a0' })],
      ['a source that is not a URL', { ...good, sources: ['not a url'] }],
      ['a source over http', { ...good, sources: ['http://lichess.org/x'] }],
      ['an unknown family', { ...good, group: 'openings' }],
      ['no family', { ...good, group: undefined }],
    ];

    it('accepts the untouched term', () => {
      expect(validateGlossaryTerm(good, 'g')).toEqual([]);
    });

    it.each(cases)('rejects %s', (_name, term) => {
      expect(validateGlossaryTerm(term, 'g')).not.toEqual([]);
    });
  });

  describe.each(glossary)('$id', (term) => {
    it('has a legal example position', () => {
      expect(fenError(term.example.fen)).toBeUndefined();
    });

    it('rings and arrows name real squares', () => {
      const squares = [
        ...term.example.highlights,
        ...term.example.arrows.flatMap((a) => [a.from, a.to]),
      ];
      expect(squares.filter((s) => parseSquare(s) === undefined)).toEqual([]);
    });

    it('every arrow marked as a move is a legal move of the example', () => {
      const position = positionFromFen(term.example.fen);
      const illegal = term.example.arrows
        .filter((a) => a.move)
        .filter((a) => {
          const move = normalizeMove(position, {
            from: parseSquare(a.from)!,
            to: parseSquare(a.to)!,
          });
          return !position.isLegal(move);
        })
        .map((a) => `${a.from}-${a.to}`);
      expect(illegal).toEqual([]);
    });

    it('has at least one source, all of them https on a known host', () => {
      expect(term.sources.length).toBeGreaterThan(0);
      const bad = term.sources.filter((s) => {
        const url = URL.parse(s);
        return (
          !url ||
          url.protocol !== 'https:' ||
          !SOURCE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
        );
      });
      expect(bad).toEqual([]);
    });
  });
});
