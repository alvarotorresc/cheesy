import {
  createFetchContentLoaders,
  createFetchGlossaryLoader,
  createFetchLessonLoaders,
  createFetchPuzzleLoaders,
} from './content-loaders';
import {
  bundledContentLoaders,
  bundledGlossaryLoader,
  bundledLessonLoaders,
  bundledPuzzleLoaders,
} from './testing';

const BASE = 'https://chess.example/app/';

/** Answers with `body` as the server would; an object is sent as JSON. */
const reply = (body: unknown, status = 200): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('createFetchContentLoaders', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: URL | string) => Promise<Response>>>;

  /** Serves the real content files, as the build copies them. */
  const serveContent = () =>
    fetchMock.mockImplementation(async (url) => {
      const path = new URL(url).pathname.replace('/app/content/', '');
      if (path === 'opening-catalog.json')
        return reply(await bundledContentLoaders.openingCatalog());
      if (path === 'endgames.json') return reply(await bundledContentLoaders.endgames());
      if (path === 'positions.json') return reply(await bundledContentLoaders.positions());
      const opening = /^openings\/(.+)\.json$/.exec(path);
      if (opening) return reply(await bundledContentLoaders.opening(opening[1]));
      return reply('<!doctype html><html></html>');
    });

  const requested = () => fetchMock.mock.calls.map(([url]) => url.toString());

  beforeEach(() => {
    fetchMock = vi.fn<(url: URL | string) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should request each file from the content folder of the same origin', async () => {
    serveContent();
    const loaders = createFetchContentLoaders(BASE);

    await loaders.openingCatalog();
    await loaders.opening('ruy-lopez');
    await loaders.endgames();
    await loaders.positions();

    expect(requested()).toEqual([
      'https://chess.example/app/content/opening-catalog.json',
      'https://chess.example/app/content/openings/ruy-lopez.json',
      'https://chess.example/app/content/endgames.json',
      'https://chess.example/app/content/positions.json',
    ]);
  });

  it('should resolve with the content of each file when the server sends it', async () => {
    serveContent();
    const loaders = createFetchContentLoaders(BASE);

    expect(await loaders.openingCatalog()).toEqual(await bundledContentLoaders.openingCatalog());
    expect(await loaders.opening('french-defence')).toEqual(
      await bundledContentLoaders.opening('french-defence'),
    );
    expect(await loaders.endgames()).toEqual(await bundledContentLoaders.endgames());
    expect(await loaders.positions()).toEqual(await bundledContentLoaders.positions());
  });

  it('should reject when the download fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(createFetchContentLoaders(BASE).positions()).rejects.toThrowError(
      'Failed to fetch',
    );
  });

  it('should reject when the server answers with an error status', async () => {
    fetchMock.mockResolvedValue(reply('Not found', 404));

    await expect(createFetchContentLoaders(BASE).endgames()).rejects.toThrowError(/404/);
  });

  it('should reject when the server answers with a page instead of the file', async () => {
    // A missing file on the host falls back to index.html, with status 200.
    serveContent();

    await expect(createFetchContentLoaders(BASE).opening('no-such-opening')).rejects.toThrow();
  });

  it('should reject when the file does not have the expected shape', async () => {
    const loaders = createFetchContentLoaders(BASE);

    fetchMock.mockResolvedValue(reply({ id: 'legal-mate' }));
    await expect(loaders.positions()).rejects.toThrowError(/content/);
    fetchMock.mockResolvedValue(reply([{ id: 'lucena-position' }]));
    await expect(loaders.endgames()).rejects.toThrowError(/content/);
    fetchMock.mockResolvedValue(reply([{ name: 'Ruy Lopez' }]));
    await expect(loaders.openingCatalog()).rejects.toThrowError(/content/);
  });

  it('should reject when the opening file belongs to another opening', async () => {
    fetchMock.mockResolvedValue(reply(await bundledContentLoaders.opening('ruy-lopez')));

    await expect(createFetchContentLoaders(BASE).opening('italian-game')).rejects.toThrowError(
      /content/,
    );
  });

  it('should reject without downloading when the opening id is not a plain name', async () => {
    serveContent();
    const loaders = createFetchContentLoaders(BASE);

    await expect(loaders.opening('../endgames')).rejects.toThrow();
    await expect(loaders.opening('https://evil.example/x')).rejects.toThrow();
    await expect(loaders.opening('a--b')).rejects.toThrow();
    await expect(loaders.opening('a'.repeat(65))).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createFetchGlossaryLoader', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: URL | string) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: URL | string) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should request the glossary from the content folder and resolve with its terms', async () => {
    const terms = await bundledGlossaryLoader();
    fetchMock.mockResolvedValue(reply(terms));

    expect(await createFetchGlossaryLoader(BASE)()).toEqual(terms);
    expect(fetchMock.mock.calls.map(([url]) => url.toString())).toEqual([
      'https://chess.example/app/content/glossary.json',
    ]);
  });

  it('should reject when the server answers with an error status', async () => {
    fetchMock.mockResolvedValue(reply('Not found', 404));

    await expect(createFetchGlossaryLoader(BASE)()).rejects.toThrowError(/404/);
  });

  it('should reject when the file is not a list of terms with an id', async () => {
    const load = createFetchGlossaryLoader(BASE);

    fetchMock.mockResolvedValue(reply('<!doctype html><html></html>'));
    await expect(load()).rejects.toThrow();
    fetchMock.mockResolvedValue(reply({ id: 'pin' }));
    await expect(load()).rejects.toThrowError(/content/);
    fetchMock.mockResolvedValue(reply([{ name: 'Pin' }]));
    await expect(load()).rejects.toThrowError(/content/);
  });
});

describe('createFetchLessonLoaders', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: URL | string) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: URL | string) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should request the catalogue and a lesson from the content folder', async () => {
    const lesson = { id: 'knight-moves', steps: [] };
    const catalog = [{ id: 'a', level: 'beginner' }];
    fetchMock.mockImplementation(async (url) =>
      reply(new URL(url).pathname.endsWith('lesson-catalog.json') ? catalog : lesson),
    );
    const loaders = createFetchLessonLoaders(BASE);

    expect(await loaders.catalog()).toEqual(catalog);
    expect(await loaders.lesson('knight-moves')).toEqual(lesson);
    expect(fetchMock.mock.calls.map(([url]) => url.toString())).toEqual([
      'https://chess.example/app/content/lesson-catalog.json',
      'https://chess.example/app/content/lessons/knight-moves.json',
    ]);
  });

  it('should refuse an id that is not a content id and a file of another lesson', async () => {
    fetchMock.mockImplementation(async () => reply({ id: 'other', steps: [] }));
    const loaders = createFetchLessonLoaders(BASE);

    await expect(loaders.lesson('../secret')).rejects.toThrowError(/Invalid lesson id/);
    await expect(loaders.lesson('knight-moves')).rejects.toThrowError(/Unexpected content/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('bundledLessonLoaders', () => {
  it('should load the real catalogue and a real lesson through the variable import path', async () => {
    const catalog = await bundledLessonLoaders.catalog();
    const ids = catalog.map((entry) => entry.id);
    expect(ids).toContain('the-board');
    expect(ids).toContain('knight-moves');

    const lesson = await bundledLessonLoaders.lesson('knight-moves');
    expect(lesson.id).toBe('knight-moves');
    expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
  });
});

describe('createFetchPuzzleLoaders', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: URL | string) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: URL | string) => Promise<Response>>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should request the catalogue and the puzzles of a lesson from the content folder', async () => {
    const catalog = { source: { url: 'https://database.lichess.org' }, lessons: [] };
    const puzzle = {
      id: 'KEPe0',
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      moves: ['Rf7', 'Nxf7'],
      themes: [],
    };
    const file = { lesson: 'the-fork', themes: { fork: 'fork' }, puzzles: [puzzle] };
    fetchMock.mockImplementation(async (url) =>
      reply(new URL(url).pathname.endsWith('puzzle-catalog.json') ? catalog : file),
    );
    const loaders = createFetchPuzzleLoaders(BASE);

    expect(await loaders.catalog()).toEqual(catalog);
    expect(await loaders.puzzles('the-fork')).toEqual(file);
    expect(fetchMock.mock.calls.map(([url]) => url.toString())).toEqual([
      'https://chess.example/app/content/puzzle-catalog.json',
      'https://chess.example/app/content/puzzles/the-fork.json',
    ]);
  });

  it('should refuse an id that is not a content id and a file of another lesson', async () => {
    fetchMock.mockImplementation(async () => reply({ lesson: 'the-pin', themes: {}, puzzles: [] }));
    const loaders = createFetchPuzzleLoaders(BASE);

    await expect(loaders.puzzles('../secret')).rejects.toThrowError(/Invalid lesson id/);
    await expect(loaders.puzzles('the-fork')).rejects.toThrowError(/Unexpected content/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should reject a file whose puzzles or themes the page could not play', async () => {
    const puzzle = {
      id: 'KEPe0',
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      moves: ['Rf7', 'Nxf7'],
      themes: [],
    };
    const loaders = createFetchPuzzleLoaders(BASE);
    const broken = [
      { lesson: 'the-fork', themes: { fork: 'fork' }, puzzles: [{ ...puzzle, moves: ['Rf7'] }] },
      { lesson: 'the-fork', themes: { fork: 'fork' }, puzzles: [{ ...puzzle, moves: ['Rf7', 4] }] },
      { lesson: 'the-fork', themes: { fork: 'fork' }, puzzles: [{ ...puzzle, moves: 'Rf7 Nxf7' }] },
      { lesson: 'the-fork', themes: { fork: 'fork' }, puzzles: [{ ...puzzle, themes: undefined }] },
      { lesson: 'the-fork', themes: ['fork'], puzzles: [puzzle] },
      { lesson: 'the-fork', puzzles: [puzzle] },
    ];
    for (const file of broken) {
      fetchMock.mockImplementationOnce(async () => reply(file));
      await expect(loaders.puzzles('the-fork')).rejects.toThrowError(/Unexpected content/);
    }
  });

  it('should reject a catalogue without its lessons or its source', async () => {
    fetchMock.mockImplementation(async () => reply({ lessons: [] }));
    const loaders = createFetchPuzzleLoaders(BASE);

    await expect(loaders.catalog()).rejects.toThrowError(/Unexpected content/);
  });
});

describe('bundledPuzzleLoaders', () => {
  it('should load the real catalogue and the puzzles of each lesson in it', async () => {
    const catalog = await bundledPuzzleLoaders.catalog();
    expect(catalog.lessons.map((entry) => entry.lesson)).toContain('the-fork');

    for (const entry of catalog.lessons) {
      const file = await bundledPuzzleLoaders.puzzles(entry.lesson);
      expect(file.lesson).toBe(entry.lesson);
      expect(file.puzzles).toHaveLength(entry.count);
    }
  });
});
