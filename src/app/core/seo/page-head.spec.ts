import categoryTexts from '../content/data/category-texts.json';
import endgames from '../content/data/endgames.json';
import positions from '../content/data/positions.json';
import type { RichText } from '../content/content.types';
import { DICTIONARIES } from '../i18n/i18n.service';
import { LANGS } from '../i18n/i18n.types';
import { pageUrls } from '../routing/site-urls';
import { MAX_DESCRIPTION, textOf } from './describe';
import { pageHead, type HeadInput, type PageFacts, SITE_ORIGIN } from './page-head';

const head = (path: string, facts?: PageFacts) =>
  pageHead({ path, urls: pageUrls, messages: DICTIONARIES, categoryTexts, facts } as HeadInput);

const lucenaEs: PageFacts = {
  id: 'lucena-position',
  name: 'Posición de Lucena',
  texts: ['El rey atacante está en la casilla de coronación. Hay que construir un puente.'],
};

describe('pageHead', () => {
  it('gives an indexable page its canonical address and both languages', () => {
    const result = head('/es/finales/posicion-de-lucena', lucenaEs);
    expect(result.lang).toBe('es');
    expect(result.canonical).toBe(`${SITE_ORIGIN}/es/finales/posicion-de-lucena`);
    expect(result.alternates).toEqual([
      { hreflang: 'es', href: `${SITE_ORIGIN}/es/finales/posicion-de-lucena` },
      { hreflang: 'en', href: `${SITE_ORIGIN}/en/endgames/lucena-position` },
      { hreflang: 'x-default', href: `${SITE_ORIGIN}/en/endgames/lucena-position` },
    ]);
    expect(result.noindex).toBe(false);
    expect(result.ogLocale).toBe('es_ES');
    expect(result.ogLocaleAlternate).toBe('en_US');
  });

  it('shares each page with the card of its section in its language, described in it', () => {
    const cards: [string, string][] = [
      ['/', 'og/en/site.png'],
      ['/es', 'og/es/site.png'],
      ['/en/about', 'og/en/site.png'],
      ['/es/aperturas', 'og/es/openings.png'],
      ['/en/openings/italian-game', 'og/en/openings.png'],
      ['/es/finales/posicion-de-lucena', 'og/es/endgames.png'],
      ['/en/positions', 'og/en/positions.png'],
      ['/es/aprender', 'og/es/learn.png'],
      ['/en/learn/beginner', 'og/en/learn.png'],
      ['/es/aprender/glosario', 'og/es/learn.png'],
      ['/es/no-existe', 'og/es/site.png'],
    ];
    for (const [path, file] of cards) {
      expect(head(path).ogImage, path).toBe(`${SITE_ORIGIN}/${file}`);
    }
    expect(head('/es/finales').ogImageAlt).toMatch(/^Cheesy, Finales: un rey/);
    expect(head('/en/endgames').ogImageAlt).toMatch(/^Cheesy, Endgames: a white king/);
  });

  it('names an entity page after it, keyword first and the site last', () => {
    const result = head('/es/finales/posicion-de-lucena', lucenaEs);
    expect(result.title).toBe('Posición de Lucena: final de ajedrez para practicar · Cheesy');
    expect(result.description).toBe(lucenaEs.texts[0]);
  });

  it('shows the breadcrumb of an entity and describes it as structured data', () => {
    const result = head('/es/finales/posicion-de-lucena', lucenaEs);
    expect(result.crumbs).toEqual([
      { name: 'Inicio', path: '/es' },
      { name: 'Finales', path: '/es/finales' },
      { name: 'Posición de Lucena', path: '/es/finales/posicion-de-lucena' },
    ]);
    const graph = (
      result.jsonLd as { '@graph': { '@type': string; itemListElement?: unknown[] }[] }
    )['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList']);
    expect(graph[0].itemListElement?.[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Posición de Lucena',
      item: `${SITE_ORIGIN}/es/finales/posicion-de-lucena`,
    });
  });

  it('never takes the facts of another page', () => {
    const result = head('/es/finales/posicion-de-philidor', lucenaEs);
    expect(result.title).toBe('Finales · Cheesy');
    expect(result.crumbs).toEqual([]);
    expect(result.canonical).toBe(`${SITE_ORIGIN}/es/finales/posicion-de-philidor`);
  });

  it('gives / the canonical address of the English home page', () => {
    const root = head('/');
    const en = head('/en');
    expect(root.lang).toBe('en');
    expect(root.canonical).toBe(`${SITE_ORIGIN}/en`);
    expect(root.alternates).toEqual(en.alternates);
    expect(root.title).toBe(en.title);
  });

  it('describes the site on the home page, once, at one address for both languages', () => {
    for (const [path, lang] of [
      ['/es', 'es'],
      ['/en', 'en'],
    ]) {
      const graph = (head(path).jsonLd as { '@graph': Record<string, unknown>[] })['@graph'];
      expect(graph).toEqual([
        {
          '@type': 'WebSite',
          '@id': `${SITE_ORIGIN}/#website`,
          url: `${SITE_ORIGIN}/`,
          name: 'Cheesy',
          inLanguage: lang,
        },
      ]);
    }
  });

  it('gives the categories, the glossary and about their breadcrumb', () => {
    expect(head('/es/finales').crumbs).toEqual([
      { name: 'Inicio', path: '/es' },
      { name: 'Finales', path: '/es/finales' },
    ]);
    expect(head('/en/learn/glossary').crumbs.map((crumb) => crumb.path)).toEqual([
      '/en',
      '/en/learn',
      '/en/learn/glossary',
    ]);
    expect(head('/es/acerca').crumbs).toEqual([
      { name: 'Inicio', path: '/es' },
      { name: 'Acerca de', path: '/es/acerca' },
    ]);
    const graph = (head('/es/acerca').jsonLd as { '@graph': { '@type': string }[] })['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList']);
  });

  it('marks a lesson as a learning resource', () => {
    const result = head('/en/learn/beginner/knight-moves', {
      id: 'knight-moves',
      name: 'The knight',
      texts: ['It jumps.'],
    });
    expect(result.title).toBe('The knight: beginner chess lesson · Cheesy');
    expect(result.crumbs.map((crumb) => crumb.path)).toEqual([
      '/en',
      '/en/learn',
      '/en/learn/beginner',
      '/en/learn/beginner/knight-moves',
    ]);
    const graph = (result.jsonLd as { '@graph': { '@type': string }[] })['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList', 'LearningResource']);
  });

  it('keeps the states of the app out of search engines, with their own title', () => {
    for (const path of [
      '/es/analisis',
      '/en/openings/italian-game/practice',
      '/en/learn/puzzles',
    ]) {
      const result = head(path);
      expect(result.noindex, path).toBe(true);
      expect(result.title, path).toBeUndefined();
      expect(result.canonical, path).toBeUndefined();
      expect(result.alternates, path).toEqual([]);
    }
  });

  it('says an unknown address is no page, and keeps it out of search engines', () => {
    const result = head('/es/aperturas/nada');
    expect(result.lang).toBe('es');
    expect(result.noindex).toBe(true);
    expect(result.title).toBeUndefined();
    expect(result.canonical).toBeUndefined();
  });

  describe('every page but the lessons, with the content', () => {
    const facts = (kind: string, id: string, name: string, about: RichText, lang: 'es' | 'en') => ({
      kind,
      id,
      name,
      texts: [textOf(about[lang], lang)],
    });
    const heads = LANGS.flatMap((lang) =>
      pageUrls.indexablePages().flatMap((page) => {
        const path = pageUrls.pathOf(page, lang);
        if (page.kind === 'endgame') {
          const endgame = endgames.find((e) => e.id === page.id)!;
          return [
            head(
              path,
              facts('endgame', page.id, endgame.name[lang], endgame.about as RichText, lang),
            ),
          ];
        }
        if (page.kind === 'position') {
          const position = positions.find((p) => p.id === page.id)!;
          return [
            head(
              path,
              facts('position', page.id, position.title[lang], position.about as RichText, lang),
            ),
          ];
        }
        return page.kind === 'lesson' || page.kind === 'opening' ? [] : [head(path)];
      }),
    );

    it('has a description of at most 160 characters', () => {
      for (const result of heads) {
        expect(result.description.length, result.canonical).toBeGreaterThan(0);
        expect(result.description.endsWith('…'), result.canonical).toBe(false);
        expect(result.description.length, result.canonical).toBeLessThanOrEqual(MAX_DESCRIPTION);
      }
    });

    it('has titles and descriptions of its own', () => {
      const titles = heads.map((result) => result.title);
      const descriptions = heads.map((result) => result.description);
      expect(new Set(titles).size).toBe(titles.length);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    });
  });
});
