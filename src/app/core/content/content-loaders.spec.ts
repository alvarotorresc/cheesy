import { createFetchContentLoaders } from './content-loaders';
import { bundledContentLoaders } from './testing';

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
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
