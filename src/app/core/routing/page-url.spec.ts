import { langOfPath, pageUrls, type Page } from '.';

const { pathOf, pageOf, translateUrl, indexablePages } = pageUrls;

describe('page addresses', () => {
  it.each<[Page, string, string]>([
    [{ kind: 'home' }, '/es', '/en'],
    [{ kind: 'category', category: 'openings' }, '/es/aperturas', '/en/openings'],
    [
      { kind: 'opening', id: 'italian-game' },
      '/es/aperturas/apertura-italiana',
      '/en/openings/italian-game',
    ],
    [
      { kind: 'practice', id: 'italian-game' },
      '/es/aperturas/apertura-italiana/practica',
      '/en/openings/italian-game/practice',
    ],
    [
      { kind: 'endgame', id: 'lucena-position' },
      '/es/finales/posicion-de-lucena',
      '/en/endgames/lucena-position',
    ],
    [
      { kind: 'position', id: 'smothered-mate' },
      '/es/posiciones/mate-de-la-coz',
      '/en/positions/smothered-mate',
    ],
    [{ kind: 'category', category: 'learn' }, '/es/aprender', '/en/learn'],
    [{ kind: 'level', level: 'beginner' }, '/es/aprender/principiante', '/en/learn/beginner'],
    [
      { kind: 'lesson', level: 'beginner', id: 'knight-moves' },
      '/es/aprender/principiante/el-caballo',
      '/en/learn/beginner/knight-moves',
    ],
    [{ kind: 'glossary' }, '/es/aprender/glosario', '/en/learn/glossary'],
    [{ kind: 'about' }, '/es/acerca', '/en/about'],
    [{ kind: 'analysis' }, '/es/analisis', '/en/analysis'],
    [{ kind: 'progress' }, '/es/tu-progreso', '/en/your-progress'],
    [{ kind: 'puzzles' }, '/es/aprender/problemas', '/en/learn/puzzles'],
    [
      { kind: 'puzzle', lesson: 'the-fork' },
      '/es/aprender/problemas/la-horquilla',
      '/en/learn/puzzles/the-fork',
    ],
  ])('%j is %s and %s, and back', (page, es, en) => {
    expect(pathOf(page, 'es')).toBe(es);
    expect(pathOf(page, 'en')).toBe(en);
    expect(pageOf(es)).toEqual({ lang: 'es', page });
    expect(pageOf(en)).toEqual({ lang: 'en', page });
  });

  it('gives the category page for an unknown id', () => {
    expect(pathOf({ kind: 'opening', id: 'nope' }, 'es')).toBe('/es/aperturas');
    expect(pathOf({ kind: 'lesson', level: 'advanced', id: 'nope' }, 'en')).toBe(
      '/en/learn/advanced',
    );
  });

  it('knows no page behind unknown, mixed-language or old addresses', () => {
    for (const url of [
      '/',
      '/openings/italian-game',
      '/es/openings',
      '/es/aperturas/italian-game',
      '/en/openings/italian-game/practica',
      '/es/aprender/avanzado/el-caballo',
      '/es/aprender/glosario/x',
      '/es/acerca/x',
      '/fr',
    ]) {
      expect(pageOf(url), url).toBeUndefined();
    }
  });

  it('reads an address with a trailing slash, a query or a fragment', () => {
    expect(pageOf('/es/aperturas/')).toEqual({
      lang: 'es',
      page: { kind: 'category', category: 'openings' },
    });
    expect(pageOf('/en/learn/glossary#pin')).toEqual({ lang: 'en', page: { kind: 'glossary' } });
    expect(pageOf('/en/analysis?fen=x')).toEqual({ lang: 'en', page: { kind: 'analysis' } });
  });

  it('tells the language of an address', () => {
    expect(langOfPath('/es/aperturas')).toBe('es');
    expect(langOfPath('/en')).toBe('en');
    expect(langOfPath('/en?x=1')).toBe('en');
    expect(langOfPath('/')).toBeUndefined();
    expect(langOfPath('/openings')).toBeUndefined();
    expect(langOfPath('/esx')).toBeUndefined();
  });
});

describe('the id behind a slug', () => {
  it('looks each kind up in its own language', () => {
    const { idOfSlug } = pageUrls;
    expect(idOfSlug('opening', 'apertura-italiana', 'es')).toBe('italian-game');
    expect(idOfSlug('opening', 'apertura-italiana', 'en')).toBeUndefined();
    expect(idOfSlug('endgame', 'cutting-off-the-king', 'en')).toBe('rook-cuts-king');
    expect(idOfSlug('position', 'mate-de-la-coz', 'es')).toBe('smothered-mate');
    expect(idOfSlug('level', 'intermedio', 'es')).toBe('intermediate');
    expect(idOfSlug('lesson', 'el-caballo', 'es', 'beginner')).toBe('knight-moves');
    expect(idOfSlug('lesson', 'el-caballo', 'es', 'advanced')).toBeUndefined();
    expect(idOfSlug('lesson', 'la-horquilla', 'es')).toBe('the-fork');
    expect(idOfSlug('lesson', 'nope', 'en')).toBeUndefined();
  });
});

describe('the same address in the other language', () => {
  it.each([
    ['/es/finales/posicion-de-lucena', 'en', '/en/endgames/lucena-position'],
    ['/en/learn/glossary?group=tactics#pin', 'es', '/es/aprender/glosario?group=tactics#pin'],
    [
      '/en/analysis?fen=8%2F8&from=endgame:mate-rook',
      'es',
      '/es/analisis?fen=8%2F8&from=endgame:mate-rook',
    ],
    ['/es/aperturas/apertura-espanola/practica', 'en', '/en/openings/ruy-lopez/practice'],
    ['/es', 'es', '/es'],
    ['/', 'es', '/es'],
    ['/', 'en', '/en'],
    ['/?x=1', 'es', '/es?x=1'],
    ['/es/no-such-page', 'en', '/en'],
  ] as const)('%s in %s is %s', (url, lang, expected) => {
    expect(translateUrl(url, lang)).toBe(expected);
  });
});

describe('the prerendered pages', () => {
  it('are 94 per language, each at an address of its own that leads back to it', () => {
    const pages = indexablePages();
    expect(pages).toHaveLength(94);
    for (const lang of ['es', 'en'] as const) {
      const paths = pages.map((page) => pathOf(page, lang));
      expect(new Set(paths).size).toBe(94);
      for (const [index, path] of paths.entries()) {
        expect(pageOf(path), path).toEqual({ lang, page: pages[index] });
        expect(path.endsWith('/'), path).toBe(false);
      }
    }
  });
});
