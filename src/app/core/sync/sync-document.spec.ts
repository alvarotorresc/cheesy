import type { LineProgress, PositionProgress } from '../progress/progress.types';
import {
  canonicalDocument,
  documentHash,
  dropFutureDates,
  emptyDocument,
  FUTURE_SLACK,
  parseSyncDocument,
  SECTION_TABLE,
  type SyncDocument,
} from './sync-document';

const line = (overrides: Partial<LineProgress> = {}): LineProgress => ({
  openingId: 'ruy-lopez',
  color: 'white',
  lineId: 'e2e4 e7e5',
  practiced: 2,
  clean: 1,
  streak: 1,
  lastPracticed: 100,
  bestMistakes: 0,
  ...overrides,
});

const pos = (overrides: Partial<PositionProgress> = {}): PositionProgress => ({
  positionId: 'legal-mate',
  solves: 1,
  firstTry: true,
  spoiled: false,
  lastSolvedAt: 50,
  ...overrides,
});

const doc = (overrides: Partial<SyncDocument> = {}): SyncDocument => ({
  ...emptyDocument(),
  ...overrides,
});

describe('emptyDocument', () => {
  it('should hold no rows and no marks', () => {
    expect(emptyDocument()).toEqual({
      format: 'cheesy-progress',
      v: 1,
      cleared: {},
      lines: [],
      endgames: [],
      positions: [],
      lessons: [],
      puzzles: [],
    });
  });
});

describe('SECTION_TABLE', () => {
  it('should map each section to the table it deletes', () => {
    expect(SECTION_TABLE).toEqual({
      openings: 'lines',
      endgames: 'endgames',
      positions: 'positions',
      lessons: 'lessons',
      puzzles: 'puzzles',
    });
  });
});

describe('parseSyncDocument', () => {
  it.each<[string, unknown]>([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'cheesy-progress'],
    ['an array', []],
    ['no format', { v: 1 }],
    ['another format', { format: 'other', v: 1 }],
    ['no version', { format: 'cheesy-progress' }],
    ['a version that is not a number', { format: 'cheesy-progress', v: '1' }],
    ['version 0', { format: 'cheesy-progress', v: 0 }],
    ['a fractional version', { format: 'cheesy-progress', v: 1.5 }],
  ])('should not take %s for a document', (_name, value) => {
    expect(parseSyncDocument(value)).toEqual({ ok: false, reason: 'not-a-document' });
  });

  it('should tell a document of a newer version apart', () => {
    expect(parseSyncDocument({ format: 'cheesy-progress', v: 2 })).toEqual({
      ok: false,
      reason: 'newer-version',
    });
  });

  it('should read a document back as it was written', () => {
    const written = canonicalDocument(
      doc({ cleared: { lessons: 5 }, lines: [line()], positions: [pos({ spoiledAt: 3 })] }),
    );
    expect(parseSyncDocument(JSON.parse(JSON.stringify(written)))).toEqual({
      ok: true,
      doc: written,
      dropped: 0,
    });
  });

  it.each(['lines', 'endgames', 'positions', 'lessons', 'puzzles'])(
    'should not take a document whose %s are missing or not a list',
    (table) => {
      const missing: Record<string, unknown> = { ...emptyDocument() };
      delete missing[table];
      expect(parseSyncDocument(missing)).toEqual({ ok: false, reason: 'not-a-document' });
      expect(parseSyncDocument({ ...emptyDocument(), [table]: {} })).toEqual({
        ok: false,
        reason: 'not-a-document',
      });
    },
  );

  describe('with the current time', () => {
    const NOW = 1_000_000_000;
    const LIMIT = NOW + FUTURE_SLACK;

    it('should allow a day of clock difference and no more', () => {
      expect(FUTURE_SLACK).toBe(24 * 60 * 60 * 1000);
    });

    it('should drop rows dated after the limit and count them', () => {
      const result = parseSyncDocument(
        {
          ...emptyDocument(),
          lines: [
            line({ lastPracticed: LIMIT }),
            line({ color: 'black', lastPracticed: LIMIT + 1 }),
          ],
          positions: [pos({ lastSolvedAt: 5, spoiledAt: LIMIT + 1 })],
        },
        NOW,
      );
      expect(result).toEqual({
        ok: true,
        doc: doc({ lines: [line({ lastPracticed: LIMIT })] }),
        dropped: 2,
      });
    });

    it('should ignore marks dated after the limit', () => {
      const result = parseSyncDocument(
        { ...emptyDocument(), cleared: { lessons: LIMIT, puzzles: LIMIT + 1 } },
        NOW,
      );
      expect(result).toEqual({ ok: true, doc: doc({ cleared: { lessons: LIMIT } }), dropped: 0 });
    });

    it('should keep far dates when no time is given', () => {
      const far = doc({ lines: [line({ lastPracticed: 8e15 })], cleared: { lessons: 8e15 } });
      expect(parseSyncDocument(far)).toEqual({ ok: true, doc: far, dropped: 0 });
    });
  });

  describe('dropFutureDates', () => {
    it('should drop the rows and marks of a document dated after the limit', () => {
      const NOW = 1_000;
      const LIMIT = NOW + FUTURE_SLACK;
      expect(
        dropFutureDates(
          doc({
            cleared: { openings: LIMIT + 1, endgames: 3 },
            lines: [line({ lastPracticed: LIMIT + 1 })],
            lessons: [{ lessonId: 'pins', completedAt: LIMIT, exercises: 1, firstTry: 1 }],
          }),
          NOW,
        ),
      ).toEqual(
        doc({
          cleared: { endgames: 3 },
          lessons: [{ lessonId: 'pins', completedAt: LIMIT, exercises: 1, firstTry: 1 }],
        }),
      );
    });
  });

  it('should drop bad rows and count them', () => {
    const result = parseSyncDocument({
      ...emptyDocument(),
      lines: [line(), line({ lineId: 'not uci' }), 'row'],
      positions: [pos({ firstTry: false })],
      puzzles: [null],
    });
    expect(result).toEqual({ ok: true, doc: doc({ lines: [line()] }), dropped: 4 });
  });

  it('should derive the key of a line, whatever the row says', () => {
    const result = parseSyncDocument({ ...emptyDocument(), lines: [{ ...line(), key: 'x' }] });
    expect(result).toEqual({ ok: true, doc: doc({ lines: [line()] }), dropped: 0 });
  });

  it('should merge rows that share a key', () => {
    const result = parseSyncDocument({
      ...emptyDocument(),
      lines: [line({ practiced: 5, lastPracticed: 200 }), line({ clean: 2, streak: 2 })],
    });
    expect(result).toEqual({
      ok: true,
      doc: doc({ lines: [line({ practiced: 5, clean: 2, streak: 1, lastPracticed: 200 })] }),
      dropped: 0,
    });
  });

  it('should keep only marks of known sections with a valid date', () => {
    const result = parseSyncDocument({
      ...emptyDocument(),
      cleared: { lessons: 10, puzzles: -1, openings: '3', invented: 4, endgames: 0 },
    });
    expect(result).toEqual({
      ok: true,
      doc: doc({ cleared: { endgames: 0, lessons: 10 } }),
      dropped: 0,
    });
  });

  it('should ignore marks that are not an object', () => {
    const result = parseSyncDocument({ ...emptyDocument(), cleared: [5] });
    expect(result).toEqual({ ok: true, doc: emptyDocument(), dropped: 0 });
  });
});

describe('canonicalDocument', () => {
  it('should sort the rows by their key and fix the order of the fields', () => {
    const black = line({ color: 'black' });
    const london = line({ openingId: 'london-system' });
    const canonical = canonicalDocument(
      doc({
        cleared: { puzzles: 2, openings: 1 },
        lines: [line(), black, london],
        positions: [pos({ positionId: 'z-mate' }), { spoiledAt: 1, ...pos() }],
      }),
    );
    expect(canonical.lines).toEqual([london, black, line()]);
    expect(canonical.positions.map((row) => row.positionId)).toEqual(['legal-mate', 'z-mate']);
    expect(Object.keys(canonical.positions[0])).toEqual([
      'positionId',
      'solves',
      'firstTry',
      'spoiled',
      'lastSolvedAt',
      'spoiledAt',
    ]);
    expect(Object.keys(canonical.cleared)).toEqual(['openings', 'puzzles']);
    expect(Object.keys(canonical)).toEqual([
      'format',
      'v',
      'cleared',
      'lines',
      'endgames',
      'positions',
      'lessons',
      'puzzles',
    ]);
  });
});

describe('documentHash', () => {
  it('should be a SHA-256 in hex', async () => {
    expect(await documentHash(emptyDocument())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should not depend on the order of the rows', async () => {
    const a = doc({
      lines: [line(), line({ color: 'black' })],
      cleared: { lessons: 1, puzzles: 2 },
    });
    const b = doc({
      lines: [line({ color: 'black' }), line()],
      cleared: { puzzles: 2, lessons: 1 },
    });
    expect(await documentHash(a)).toBe(await documentHash(b));
  });

  it('should change with the content', async () => {
    const a = doc({ lines: [line()] });
    expect(await documentHash(a)).not.toBe(
      await documentHash(doc({ lines: [line({ practiced: 3 })] })),
    );
    expect(await documentHash(a)).not.toBe(await documentHash({ ...a, cleared: { lessons: 1 } }));
  });
});
