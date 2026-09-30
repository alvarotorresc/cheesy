import { TestBed } from '@angular/core/testing';
import { CONTENT_LOADERS, GLOSSARY_LOADER, type ContentLoaders } from './content-loaders';
import { bundledContentLoaders } from './testing';
import { ContentService } from './content.service';
import type { GlossaryTerm, OpeningSummary, OpeningTree } from './content.types';
import { OpeningBook } from './opening-book';

const OPENING_IDS = [
  'ruy-lopez',
  'italian-game',
  'sicilian-najdorf',
  'french-defence',
  'caro-kann-defence',
  'scotch-game',
  'petrov-defence',
  'kings-gambit',
  'sicilian-dragon',
  'sicilian-sveshnikov',
  'sicilian-alapin',
  'scandinavian-defence',
  'pirc-defence',
  'queens-gambit-declined',
  'queens-gambit-accepted',
  'slav-defence',
  'london-system',
  'kings-indian-defence',
  'nimzo-indian-defence',
  'grunfeld-defence',
  'english-opening',
];

const describedBy = ({ id, name, eco, side, description }: OpeningTree | OpeningSummary) => ({
  id,
  name,
  eco,
  side,
  description,
});

/** Bundled loaders with call counting, so tests can check what is downloaded and when. */
const spyLoaders = (overrides: Partial<ContentLoaders> = {}) => {
  const loaders: ContentLoaders = { ...bundledContentLoaders, ...overrides };
  return {
    openingCatalog: vi.fn(loaders.openingCatalog),
    opening: vi.fn(loaders.opening),
    endgames: vi.fn(loaders.endgames),
    positions: vi.fn(loaders.positions),
  };
};

const setup = (loaders: ContentLoaders = bundledContentLoaders): ContentService => {
  TestBed.configureTestingModule({
    providers: [{ provide: CONTENT_LOADERS, useValue: loaders }],
  });
  return TestBed.inject(ContentService);
};

describe('ContentService', () => {
  describe('with the bundled content', () => {
    let content: ContentService;

    beforeEach(() => {
      content = setup();
    });

    it('should list every opening in display order when the catalogue is loaded', async () => {
      const catalog = await content.openingCatalog();

      expect(catalog.map((opening) => opening.id)).toEqual(OPENING_IDS);
    });

    it('should describe each opening in the catalogue exactly as its own file does', async () => {
      const catalog = await content.openingCatalog();
      const trees = await Promise.all(catalog.map((entry) => content.opening(entry.id)));

      expect(catalog.map(describedBy)).toEqual(trees.map((tree) => describedBy(tree!)));
    });

    it('should count in the catalogue the lines of each opening book and preview its main line', async () => {
      const catalog = await content.openingCatalog();

      for (const entry of catalog) {
        const book = (await content.openingBook(entry.id))!;
        const main = book.mainLine.map((node) => node.san);
        expect(entry.lineCount, entry.id).toBe(book.lines.length);
        expect(entry.preview.sans, entry.id).toEqual(main.slice(0, 12));
        expect(entry.preview.names, entry.id).toHaveLength(entry.preview.sans.length);
        expect(entry.preview.namedPly, entry.id).toBeLessThanOrEqual(entry.preview.sans.length);
      }
    });

    it('should load the tree of an opening when the id is in the catalogue', async () => {
      const tree = await content.opening('french-defence');

      expect(tree?.id).toBe('french-defence');
      expect(tree?.root.length).toBeGreaterThan(0);
    });

    it('should build the book of an opening when the id is in the catalogue', async () => {
      const book = await content.openingBook('caro-kann-defence');

      expect(book).toBeInstanceOf(OpeningBook);
      expect(book?.id).toBe('caro-kann-defence');
    });

    it('should load every endgame when asked', async () => {
      const endgames = await content.endgames();

      expect(endgames.length).toBeGreaterThan(0);
      expect(endgames.every((endgame) => endgame.fen.length > 0)).toBe(true);
    });

    it('should find an endgame by id', async () => {
      const endgame = await content.endgame('lucena-position');

      expect(endgame?.id).toBe('lucena-position');
    });

    it('should load every curated position when asked', async () => {
      const positions = await content.positions();

      expect(positions.length).toBeGreaterThan(0);
      expect(positions.every((position) => position.solution.length > 0)).toBe(true);
    });

    it('should find a curated position by id', async () => {
      const position = await content.position('legal-mate');

      expect(position?.id).toBe('legal-mate');
    });

    it('should resolve to undefined when an endgame or position id is unknown', async () => {
      expect(await content.endgame('no-such-endgame')).toBeUndefined();
      expect(await content.position('no-such-position')).toBeUndefined();
    });
  });

  describe('loading', () => {
    it('should resolve to undefined without downloading when the opening id is unknown', async () => {
      const loaders = spyLoaders();
      const content = setup(loaders);

      const tree = await content.opening('../endgames');
      const book = await content.openingBook('unknown-opening');

      expect(tree).toBeUndefined();
      expect(book).toBeUndefined();
      expect(loaders.opening).not.toHaveBeenCalled();
    });

    it('should download each file once when it is requested again', async () => {
      const loaders = spyLoaders();
      const content = setup(loaders);

      const [first, second] = await Promise.all([
        content.opening('ruy-lopez'),
        content.opening('ruy-lopez'),
      ]);
      await content.endgames();
      await content.endgame('lucena-position');
      await content.positions();
      await content.position('legal-mate');

      expect(second).toBe(first);
      expect(loaders.openingCatalog).toHaveBeenCalledTimes(1);
      expect(loaders.opening).toHaveBeenCalledTimes(1);
      expect(loaders.endgames).toHaveBeenCalledTimes(1);
      expect(loaders.positions).toHaveBeenCalledTimes(1);
    });

    it('should download an opening once when both its tree and its book are requested', async () => {
      const loaders = spyLoaders();
      const content = setup(loaders);

      await Promise.all([content.opening('ruy-lopez'), content.openingBook('ruy-lopez')]);
      await content.openingBook('ruy-lopez');

      expect(loaders.opening).toHaveBeenCalledTimes(1);
    });

    it('should build each opening book once when it is requested again', async () => {
      const content = setup();

      const first = await content.openingBook('italian-game');
      const second = await content.openingBook('italian-game');

      expect(second).toBe(first);
    });

    it('should try again when a previous download failed', async () => {
      const endgames = vi
        .fn(bundledContentLoaders.endgames)
        .mockRejectedValueOnce(new Error('network down'));
      const content = setup(spyLoaders({ endgames }));

      await expect(content.endgames()).rejects.toThrowError('network down');
      const retried = await content.endgames();

      expect(retried.length).toBeGreaterThan(0);
      expect(endgames).toHaveBeenCalledTimes(2);
    });

    it('should download the file again from the same origin when retried after a failed download', async () => {
      // The default loaders: browsers remember a failed dynamic import and never request that
      // file again, so the content is downloaded with fetch, which always tries anew.
      const positions = await bundledContentLoaders.positions();
      const fetchMock = vi
        .fn<(url: URL | string) => Promise<Response>>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockImplementation(async () => new Response(JSON.stringify(positions)));
      vi.stubGlobal('fetch', fetchMock);
      const content = TestBed.inject(ContentService);

      try {
        await expect(content.positions()).rejects.toThrowError('Failed to fetch');
        const retried = await content.positions();

        expect(retried).toEqual(positions);
        expect(fetchMock.mock.calls.map(([url]) => url.toString())).toEqual([
          new URL('content/positions.json', document.baseURI).href,
          new URL('content/positions.json', document.baseURI).href,
        ]);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('should reject when the tree of an opening in the catalogue is not valid', async () => {
      const broken: OpeningTree = {
        ...(await bundledContentLoaders.opening('ruy-lopez')),
        root: [{ san: 'Ke2', children: [] }],
      };
      const content = setup(spyLoaders({ opening: async () => broken }));

      await expect(content.openingBook('ruy-lopez')).rejects.toThrowError(/Illegal move/);
    });
  });
});

describe('ContentService glossary', () => {
  it('should load the glossary once and find a term by id', async () => {
    const load = vi.fn(async () => [
      { id: 'pin', name: { es: 'Clavada', en: 'Pin' } } as GlossaryTerm,
    ]);
    TestBed.configureTestingModule({ providers: [{ provide: GLOSSARY_LOADER, useValue: load }] });
    const content = TestBed.inject(ContentService);

    expect((await content.glossaryTerm('pin'))?.name.en).toBe('Pin');
    expect(await content.glossaryTerm('nope')).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should ask for the glossary again after a failed download', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    TestBed.configureTestingModule({ providers: [{ provide: GLOSSARY_LOADER, useValue: load }] });
    const content = TestBed.inject(ContentService);

    await expect(content.glossary()).rejects.toThrow('offline');
    await expect(content.glossary()).resolves.toEqual([]);
  });
});
