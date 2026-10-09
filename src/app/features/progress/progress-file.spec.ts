import { emptyDocument, type SyncDocument } from '../../core/sync/sync-document';
import {
  MAX_FILE_BYTES,
  codeWordCount,
  exportFileName,
  hasRows,
  readProgressFile,
  rowCounts,
  totalRows,
} from './progress-file';

const NOW = Date.UTC(2026, 9, 10, 12);

const withRows = (): SyncDocument => ({
  ...emptyDocument(),
  lessons: [
    { lessonId: 'pins', completedAt: 1, exercises: 1, firstTry: 1 },
    { lessonId: 'forks', completedAt: 1, exercises: 1, firstTry: 0 },
  ],
  endgames: [
    { endgameId: 'lucena-position', completions: 1, firstCompletedAt: 1, lastCompletedAt: 1 },
  ],
});

const file = (content: string, name = 'progress.json'): File =>
  new File([content], name, { type: 'application/json' });

describe('progress files', () => {
  it('counts the rows of each table and tells an empty document apart', () => {
    expect(rowCounts(withRows())).toEqual({
      lines: 0,
      endgames: 1,
      positions: 0,
      lessons: 2,
      puzzles: 0,
    });
    expect(totalRows(withRows())).toBe(3);
    expect(hasRows(withRows())).toBe(true);
    expect(hasRows(emptyDocument())).toBe(false);
  });

  it('names the export after the local date, not the UTC one', () => {
    // 00:30 on the 11th in the local zone may still be the 10th in UTC.
    expect(exportFileName(new Date(2026, 9, 11, 0, 30))).toBe('cheesy-progress-2026-10-11.json');
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe('cheesy-progress-2026-01-05.json');
  });

  it('counts the words of a code typed in any way, as the server does', () => {
    expect(codeWordCount('Ábaco  mesa\nsilla-PERRO')).toBe(4);
    expect(codeWordCount('  uno.dos_tres  ')).toBe(3);
    expect(codeWordCount('')).toBe(0);
    expect(codeWordCount('a b c d e')).toBe(5);
  });

  it('reads a document exported before', async () => {
    const read = await readProgressFile(file(JSON.stringify(withRows())), NOW);
    expect(read.ok).toBe(true);
    if (read.ok) expect(totalRows(read.doc)).toBe(3);
  });

  it('refuses a file over 1 MB without reading it', async () => {
    const big = file('x');
    Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
    const text = vi.spyOn(big, 'text');

    expect(await readProgressFile(big, NOW)).toEqual({ ok: false, reason: 'too-big' });
    expect(text).not.toHaveBeenCalled();
  });

  it('refuses a file that is not JSON, not a progress document or from a newer Cheesy', async () => {
    expect(await readProgressFile(file('{ nope'), NOW)).toEqual({ ok: false, reason: 'not-json' });
    expect(await readProgressFile(file('{"format":"other","v":1}'), NOW)).toEqual({
      ok: false,
      reason: 'not-a-document',
    });
    expect(await readProgressFile(file(JSON.stringify({ ...emptyDocument(), v: 2 })), NOW)).toEqual(
      { ok: false, reason: 'newer-version' },
    );
  });
});
