// What the `<head>` of every page says: title, description, canonical address, the same page in the
// other language, Open Graph, robots and structured data, plus the breadcrumb the page shows.
//
// Pure, no Angular, like `core/routing/page-url.ts`: the app writes it to the document (`PageHead`)
// and the build checks it in the prerendered HTML (`scripts/check-pages.mjs`). The texts come from
// the dictionaries (titles, and descriptions of the pages with no text of their own) and from the
// content (descriptions cut from the page's own sentences).
import type { LessonLevel } from '../content/content.types';
import type { Messages } from '../i18n/dictionaries/en';
import type { Lang } from '../i18n/i18n.types';
import {
  langOfPath,
  type CategoryId,
  type LocatedPage,
  type Page,
  type PageUrls,
} from '../routing/page-url';
import { describe } from './describe';

export const SITE_ORIGIN = 'https://cheesy.alvarotc.com';
export const SITE_NAME = 'Cheesy';
/** The image of every page when shared: no capture of 1200×630 but this one exists. */
export const OG_IMAGE = `${SITE_ORIGIN}/og.png`;

const OG_LOCALES: Readonly<Record<Lang, string>> = { es: 'es_ES', en: 'en_US' };

/** One step of the breadcrumb: its name and its address (absolute path). */
export interface Crumb {
  readonly name: string;
  readonly path: string;
}

export interface Alternate {
  readonly hreflang: Lang | 'x-default';
  readonly href: string;
}

/**
 * What a page of an entity knows of what it shows, in the language on screen: its id (so the facts
 * of the last page are never taken for this one), its name and the texts its description is cut
 * from, in order.
 */
export interface PageFacts {
  readonly id: string;
  readonly name: string;
  readonly texts: readonly string[];
}

/** The two paragraphs of each category page, per language (`category-texts.json`). */
export type CategoryTexts = Readonly<Record<CategoryId, Readonly<Record<Lang, readonly string[]>>>>;

export interface HeadInput {
  /** The path of the address, without query or fragment (`/`, `/es/finales/posicion-de-lucena`). */
  readonly path: string;
  readonly urls: PageUrls;
  readonly messages: Readonly<Record<Lang, Messages>>;
  readonly categoryTexts: CategoryTexts;
  readonly facts?: PageFacts;
}

export interface PageHead {
  readonly lang: Lang;
  /** Undefined for the states of the app (analysis, practice, puzzles): they keep their own. */
  readonly title: string | undefined;
  readonly description: string;
  readonly canonical: string | undefined;
  readonly alternates: readonly Alternate[];
  readonly noindex: boolean;
  readonly ogLocale: string;
  readonly ogLocaleAlternate: string;
  readonly ogImage: string;
  readonly ogImageAlt: string;
  readonly crumbs: readonly Crumb[];
  /** One JSON-LD document (`@graph`), or undefined when the page has no structured data. */
  readonly jsonLd: object | undefined;
}

/** The page of an entity, with the id its facts must have. */
const entityIdOf = (page: Page): string | undefined => {
  switch (page.kind) {
    case 'opening':
    case 'endgame':
    case 'position':
    case 'lesson':
      return page.id;
    default:
      return undefined;
  }
};

const APP_STATES: readonly Page['kind'][] = ['analysis', 'practice', 'puzzles', 'puzzle'];

const absolute = (path: string): string => `${SITE_ORIGIN}${path}`;

const withSite = (title: string): string => `${title} · ${SITE_NAME}`;

/** How many pages of a kind the site has, from the slugs: `21 openings`, `12 lessons`. */
const countOf = (urls: PageUrls, match: (page: Page) => boolean): number =>
  urls.indexablePages().filter(match).length;

const levelCount = (urls: PageUrls, level: LessonLevel): number =>
  countOf(urls, (page) => page.kind === 'lesson' && page.level === level);

interface Texts {
  readonly title: string;
  readonly description: string;
}

/** Title (without the site name) and description of an indexable page. */
const textsOf = (page: Page, lang: Lang, input: HeadInput, facts: PageFacts | undefined): Texts => {
  const t = input.messages[lang];
  const { titles, descriptions } = t.seo;
  const { urls } = input;
  const category = (id: CategoryId) => describe(input.categoryTexts[id][lang]);
  switch (page.kind) {
    case 'home':
      return { title: titles.home, description: descriptions.home };
    case 'category': {
      const description = category(page.category);
      switch (page.category) {
        case 'openings':
          return {
            title: titles.openings(countOf(urls, (p) => p.kind === 'opening')),
            description,
          };
        case 'endgames':
          return {
            title: titles.endgames(countOf(urls, (p) => p.kind === 'endgame')),
            description,
          };
        case 'positions':
          return { title: titles.positions, description };
        case 'learn':
          return { title: titles.learn(countOf(urls, (p) => p.kind === 'lesson')), description };
      }
      break;
    }
    case 'level':
      return {
        title: titles.levels[page.level](levelCount(urls, page.level)),
        description: descriptions.levels[page.level],
      };
    case 'glossary':
      return { title: titles.glossary, description: descriptions.glossary };
    case 'about':
      return { title: titles.about, description: descriptions.about };
    case 'opening':
    case 'endgame':
    case 'position':
    case 'lesson': {
      const section = page.kind === 'lesson' ? 'learn' : (`${page.kind}s` as CategoryId);
      if (!facts) return { title: t.nav[section], description: category(section) };
      const description = describe(facts.texts);
      switch (page.kind) {
        case 'opening':
          return { title: titles.opening(facts.name), description };
        case 'endgame':
          return { title: titles.endgame(facts.name), description };
        case 'position':
          return { title: titles.position(facts.name), description };
        case 'lesson':
          return {
            title: titles.lesson(facts.name, t.learn.levels[page.level].name),
            description,
          };
      }
    }
  }
  return { title: SITE_NAME, description: descriptions.home };
};

/** The breadcrumb of a page: from the home page to the page itself, or none for the top pages. */
export const crumbsOf = (
  page: Page,
  lang: Lang,
  urls: PageUrls,
  t: Messages,
  facts: PageFacts | undefined,
): Crumb[] => {
  const at = (target: Page, name: string): Crumb => ({ name, path: urls.pathOf(target, lang) });
  const home = at({ kind: 'home' }, t.nav.home);
  const section = (category: CategoryId) => at({ kind: 'category', category }, t.nav[category]);
  const entity = (category: CategoryId): Crumb[] =>
    facts ? [home, section(category), at(page, facts.name)] : [];
  switch (page.kind) {
    case 'opening':
      return entity('openings');
    case 'endgame':
      return entity('endgames');
    case 'position':
      return entity('positions');
    case 'level':
      return [home, section('learn'), at(page, t.learn.levels[page.level].name)];
    case 'lesson':
      return facts
        ? [
            home,
            section('learn'),
            at({ kind: 'level', level: page.level }, t.learn.levels[page.level].name),
            at(page, facts.name),
          ]
        : [];
    default:
      return [];
  }
};

const breadcrumbList = (crumbs: readonly Crumb[]): object => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: absolute(crumb.path),
  })),
});

/** The structured data of a page: the site on the home page, breadcrumb, lessons as resources. */
const jsonLdOf = (
  page: Page,
  lang: Lang,
  canonical: string,
  texts: Texts,
  crumbs: readonly Crumb[],
  t: Messages,
): object | undefined => {
  const site = { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: SITE_NAME };
  const graph: object[] = [];
  if (page.kind === 'home') {
    graph.push(
      { ...site, url: canonical, inLanguage: lang, description: texts.description },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: canonical,
        description: texts.description,
        inLanguage: lang,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        license: 'https://www.gnu.org/licenses/gpl-3.0.html',
      },
    );
  }
  if (crumbs.length > 0) graph.push(breadcrumbList(crumbs));
  if (page.kind === 'lesson' && crumbs.length > 0) {
    graph.push({
      '@type': 'LearningResource',
      name: crumbs[crumbs.length - 1].name,
      description: texts.description,
      url: canonical,
      inLanguage: lang,
      learningResourceType: 'lesson',
      educationalLevel: t.learn.levels[page.level].name,
      isAccessibleForFree: true,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    });
  }
  return graph.length > 0 ? { '@context': 'https://schema.org', '@graph': graph } : undefined;
};

/** The head of the page at `input.path`. */
export const pageHead = (input: HeadInput): PageHead => {
  const { urls, path } = input;
  const root = path === '/' || path === '';
  const located: LocatedPage | undefined = root
    ? { lang: 'en', page: { kind: 'home' } }
    : urls.pageOf(path);
  const lang: Lang = located?.lang ?? langOfPath(path) ?? 'en';
  const t = input.messages[lang];
  const other: Lang = lang === 'es' ? 'en' : 'es';
  const base = {
    lang,
    ogLocale: OG_LOCALES[lang],
    ogLocaleAlternate: OG_LOCALES[other],
    ogImage: OG_IMAGE,
    ogImageAlt: t.seo.ogImageAlt,
  };
  if (!located) {
    return {
      ...base,
      title: withSite(t.seo.titles.notFound),
      description: t.seo.descriptions.notFound,
      canonical: undefined,
      alternates: [],
      noindex: true,
      crumbs: [],
      jsonLd: undefined,
    };
  }
  const { page } = located;
  if (APP_STATES.includes(page.kind)) {
    return {
      ...base,
      title: undefined,
      description: t.seo.descriptions.home,
      canonical: undefined,
      alternates: [],
      noindex: true,
      crumbs: [],
      jsonLd: undefined,
    };
  }
  const entityId = entityIdOf(page);
  const facts = entityId !== undefined && input.facts?.id === entityId ? input.facts : undefined;
  const texts = textsOf(page, lang, input, facts);
  const canonical = absolute(urls.pathOf(page, lang));
  const crumbs = crumbsOf(page, lang, urls, t, facts);
  return {
    ...base,
    title: withSite(texts.title),
    description: texts.description,
    canonical,
    alternates: [
      ...urls.langs.map((hreflang) => ({ hreflang, href: absolute(urls.pathOf(page, hreflang)) })),
      { hreflang: 'x-default' as const, href: absolute(urls.pathOf(page, 'en')) },
    ],
    noindex: false,
    crumbs,
    jsonLd: jsonLdOf(page, lang, canonical, texts, crumbs, t),
  };
};
