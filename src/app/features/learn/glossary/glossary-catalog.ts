import {
  GLOSSARY_GROUPS,
  type GlossaryGroup,
  type GlossaryLevel,
  type GlossaryTerm,
} from '../../../core/content/content.types';
import type { Lang } from '../../../core/i18n';

export type GroupFilter = GlossaryGroup | 'all';
export type LevelFilter = GlossaryLevel | 'all';

export interface GlossaryFilters {
  readonly group: GroupFilter;
  readonly level: LevelFilter;
  readonly query: string;
}

export const NO_FILTERS: GlossaryFilters = { group: 'all', level: 'all', query: '' };

export const GLOSSARY_LEVELS: readonly GlossaryLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface TermGroup {
  readonly key: GlossaryGroup;
  readonly terms: readonly GlossaryTerm[];
}

const fold = (text: string): string =>
  text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

export const sortTerms = (terms: readonly GlossaryTerm[], lang: Lang): GlossaryTerm[] =>
  [...terms].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));

/** Whether the name of the term, in the given language, contains the query (case and accents aside). */
export const matchesSearch = (term: GlossaryTerm, query: string, lang: Lang): boolean =>
  fold(term.name[lang]).includes(fold(query));

const matchesLevelAndSearch = (term: GlossaryTerm, filters: GlossaryFilters, lang: Lang) =>
  (filters.level === 'all' || term.level === filters.level) &&
  matchesSearch(term, filters.query, lang);

/** The terms that pass every filter, in alphabetical order of the language. */
export const applyFilters = (
  terms: readonly GlossaryTerm[],
  filters: GlossaryFilters,
  lang: Lang,
): GlossaryTerm[] =>
  sortTerms(terms, lang).filter(
    (term) =>
      (filters.group === 'all' || term.group === filters.group) &&
      matchesLevelAndSearch(term, filters, lang),
  );

/** One group per family that has terms, in the fixed order of the families. */
export const groupTerms = (terms: readonly GlossaryTerm[], lang: Lang): TermGroup[] => {
  const sorted = sortTerms(terms, lang);
  return GLOSSARY_GROUPS.map((key) => ({
    key,
    terms: sorted.filter((t) => t.group === key),
  })).filter((group) => group.terms.length > 0);
};

/**
 * Terms of each family (and of all of them) that pass the level and the search: what each family
 * chip would show if it were chosen. The family filter itself is left out.
 */
export const groupCounts = (
  terms: readonly GlossaryTerm[],
  filters: GlossaryFilters,
  lang: Lang,
): Record<GroupFilter, number> => {
  const counts = Object.fromEntries(['all', ...GLOSSARY_GROUPS].map((key) => [key, 0])) as Record<
    GroupFilter,
    number
  >;
  for (const term of terms) {
    if (!matchesLevelAndSearch(term, filters, lang)) continue;
    counts.all++;
    counts[term.group]++;
  }
  return counts;
};

const isGroup = (value: string | null): value is GlossaryGroup =>
  (GLOSSARY_GROUPS as readonly (string | null)[]).includes(value);
const isLevel = (value: string | null): value is GlossaryLevel =>
  (GLOSSARY_LEVELS as readonly (string | null)[]).includes(value);

/** `?group=&level=&q=` of the address; a value that is not a family or a level filters nothing. */
export const filtersFromParams = (params: {
  get(name: string): string | null;
}): GlossaryFilters => {
  const group = params.get('group');
  const level = params.get('level');
  return {
    group: isGroup(group) ? group : 'all',
    level: isLevel(level) ? level : 'all',
    query: params.get('q') ?? '',
  };
};

/** The query parameters for the filters: only those that are set, always in the same order. */
export const paramsOf = (filters: GlossaryFilters): Record<string, string> => ({
  ...(filters.group === 'all' ? {} : { group: filters.group }),
  ...(filters.level === 'all' ? {} : { level: filters.level }),
  ...(filters.query.trim() ? { q: filters.query } : {}),
});
