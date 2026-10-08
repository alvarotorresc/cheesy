// The public address of every page, in both languages, and the page behind an address.
//
// Pure functions over the slugs of `content/authoring/slugs.ts` (`slugs.json`), with no Angular and
// only type imports: the routes, the links, the language switcher and the build scripts (Node.js,
// which strips the types) share them. Addresses never end with a slash: `/es`, `/es/aperturas`,
// `/es/aperturas/apertura-italiana` (pages are written as `route.html`, which Netlify serves at
// `/route` and sends `/route/` to).
import type { LessonLevel } from '../content/content.types';
import type { Lang } from '../i18n/i18n.types';

type Slug = Record<Lang, string>;
type SlugTable = Record<string, Slug>;

/** The shape of `slugs.json` (written by `pnpm content:build` from `content/authoring/slugs.ts`). */
export interface SlugData {
  sections: Record<'openings' | 'endgames' | 'positions' | 'learn' | 'glossary' | 'about', Slug>;
  levels: Record<LessonLevel, Slug>;
  openings: SlugTable;
  endgames: SlugTable;
  positions: SlugTable;
  lessons: Record<LessonLevel, SlugTable>;
  app: Record<'analysis' | 'practice' | 'puzzles', Slug>;
}

/** The four categories, each with a page that lists its entities. */
export type CategoryId = 'openings' | 'endgames' | 'positions' | 'learn';

/** A page of the site, whatever its language. Ids are content ids, never slugs. */
export type Page =
  | { readonly kind: 'home' }
  | { readonly kind: 'category'; readonly category: CategoryId }
  | { readonly kind: 'opening'; readonly id: string }
  | { readonly kind: 'practice'; readonly id: string }
  | { readonly kind: 'endgame'; readonly id: string }
  | { readonly kind: 'position'; readonly id: string }
  | { readonly kind: 'level'; readonly level: LessonLevel }
  | { readonly kind: 'lesson'; readonly level: LessonLevel; readonly id: string }
  | { readonly kind: 'glossary' }
  | { readonly kind: 'about' }
  | { readonly kind: 'analysis' }
  | { readonly kind: 'puzzles' }
  | { readonly kind: 'puzzle'; readonly lesson: string };

export interface LocatedPage {
  readonly lang: Lang;
  readonly page: Page;
}

const PAGE_LANGS: readonly Lang[] = ['es', 'en'];
const CATEGORIES: readonly CategoryId[] = ['openings', 'endgames', 'positions', 'learn'];

const isPageLang = (value: string | undefined): value is Lang =>
  (PAGE_LANGS as readonly (string | undefined)[]).includes(value);

const idOf = (table: SlugTable, slug: string | undefined, lang: Lang): string | undefined =>
  slug === undefined
    ? undefined
    : Object.keys(table).find((id) => Object.hasOwn(table, id) && table[id][lang] === slug);

/** The language an address is in: its first segment, or undefined (`/`, old addresses). */
export const langOfPath = (path: string): Lang | undefined => {
  const first = path.split(/[?#]/)[0].split('/')[1];
  return isPageLang(first) ? first : undefined;
};

export function createPageUrls(data: SlugData) {
  const levels = Object.keys(data.levels) as LessonLevel[];
  const levelOfLesson = (id: string): LessonLevel | undefined =>
    levels.find((level) => Object.hasOwn(data.lessons[level], id));

  /** The address of a page in a language. An unknown id gives the page of its category. */
  const pathOf = (page: Page, lang: Lang): string => {
    const root = `/${lang}`;
    const section = (id: keyof SlugData['sections']) => `${root}/${data.sections[id][lang]}`;
    const app = (id: keyof SlugData['app']) => data.app[id][lang];
    switch (page.kind) {
      case 'home':
        return root;
      case 'category':
        return section(page.category);
      case 'opening':
      case 'practice': {
        const slug = data.openings[page.id]?.[lang];
        if (!slug) return section('openings');
        const opening = `${section('openings')}/${slug}`;
        return page.kind === 'opening' ? opening : `${opening}/${app('practice')}`;
      }
      case 'endgame': {
        const slug = data.endgames[page.id]?.[lang];
        return slug ? `${section('endgames')}/${slug}` : section('endgames');
      }
      case 'position': {
        const slug = data.positions[page.id]?.[lang];
        return slug ? `${section('positions')}/${slug}` : section('positions');
      }
      case 'level':
        return `${section('learn')}/${data.levels[page.level][lang]}`;
      case 'lesson': {
        const slug = data.lessons[page.level]?.[page.id]?.[lang];
        const level = `${section('learn')}/${data.levels[page.level][lang]}`;
        return slug ? `${level}/${slug}` : level;
      }
      case 'glossary':
        return `${section('learn')}/${data.sections.glossary[lang]}`;
      case 'about':
        return section('about');
      case 'analysis':
        return `${root}/${app('analysis')}`;
      case 'puzzles':
        return `${section('learn')}/${app('puzzles')}`;
      case 'puzzle': {
        const level = levelOfLesson(page.lesson);
        const slug = level && data.lessons[level][page.lesson][lang];
        const list = `${section('learn')}/${app('puzzles')}`;
        return slug ? `${list}/${slug}` : list;
      }
    }
  };

  /** The page behind an address (path only, or with query and fragment), if it is one. */
  const pageOf = (url: string): LocatedPage | undefined => {
    const path = url.split(/[?#]/)[0];
    const [, lang, sectionSlug, ...rest] = path.replace(/\/+$/, '').split('/');
    if (!isPageLang(lang)) return undefined;
    const at = (page: Page): LocatedPage => ({ lang, page });
    if (sectionSlug === undefined) return at({ kind: 'home' });
    if (sectionSlug === data.app.analysis[lang]) {
      return rest.length === 0 ? at({ kind: 'analysis' }) : undefined;
    }
    if (sectionSlug === data.sections.about[lang]) {
      return rest.length === 0 ? at({ kind: 'about' }) : undefined;
    }
    const section = CATEGORIES.find((id) => data.sections[id][lang] === sectionSlug);
    if (section === undefined) return undefined;
    if (rest.length === 0) return at({ kind: 'category', category: section });
    const [first, second, ...more] = rest;
    if (more.length > 0) return undefined;
    switch (section) {
      case 'openings': {
        const id = idOf(data.openings, first, lang);
        if (!id) return undefined;
        if (second === undefined) return at({ kind: 'opening', id });
        return second === data.app.practice[lang] ? at({ kind: 'practice', id }) : undefined;
      }
      case 'endgames':
      case 'positions': {
        const id = idOf(data[section], first, lang);
        if (!id || second !== undefined) return undefined;
        return at({ kind: section === 'endgames' ? 'endgame' : 'position', id });
      }
      case 'learn': {
        if (first === data.sections.glossary[lang]) {
          return second === undefined ? at({ kind: 'glossary' }) : undefined;
        }
        if (first === data.app.puzzles[lang]) {
          if (second === undefined) return at({ kind: 'puzzles' });
          const level = levels.find((l) => idOf(data.lessons[l], second, lang));
          const lesson = level && idOf(data.lessons[level], second, lang);
          return lesson ? at({ kind: 'puzzle', lesson }) : undefined;
        }
        const level = levels.find((l) => data.levels[l][lang] === first);
        if (!level) return undefined;
        if (second === undefined) return at({ kind: 'level', level });
        const id = idOf(data.lessons[level], second, lang);
        return id ? at({ kind: 'lesson', level, id }) : undefined;
      }
    }
    return undefined;
  };

  /**
   * The same address in another language, with its query and fragment: the same entity under its
   * translated slug. `/` is the English home page, so it stays `/` in English. An address that is no
   * page goes to the home page of the language.
   */
  const translateUrl = (url: string, lang: Lang): string => {
    const match = /^([^?#]*)(.*)$/.exec(url);
    const path = match?.[1] ?? '';
    const tail = match?.[2] ?? '';
    if (path === '' || path === '/') return lang === 'en' ? `/${tail}` : `/${lang}${tail}`;
    const located = pageOf(path);
    return located ? `${pathOf(located.page, lang)}${tail}` : `/${lang}`;
  };

  /**
   * Every page that is prerendered, in one language: home, categories, levels, glossary, about and
   * one page per opening, endgame, position and lesson of the slug tables (tested to match the
   * catalogues in `content/tests/fast/slugs.test.ts`).
   */
  const indexablePages = (): Page[] => [
    { kind: 'home' },
    ...CATEGORIES.map((category): Page => ({ kind: 'category', category })),
    ...Object.keys(data.openings).map((id): Page => ({ kind: 'opening', id })),
    ...Object.keys(data.endgames).map((id): Page => ({ kind: 'endgame', id })),
    ...Object.keys(data.positions).map((id): Page => ({ kind: 'position', id })),
    ...levels.map((level): Page => ({ kind: 'level', level })),
    ...levels.flatMap((level) =>
      Object.keys(data.lessons[level]).map((id): Page => ({ kind: 'lesson', level, id })),
    ),
    { kind: 'glossary' },
    { kind: 'about' },
  ];

  return { pathOf, pageOf, translateUrl, indexablePages, langs: PAGE_LANGS };
}

export type PageUrls = ReturnType<typeof createPageUrls>;
