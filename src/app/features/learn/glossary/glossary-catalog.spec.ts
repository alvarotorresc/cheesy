import { GLOSSARY_GROUPS } from '../../../core/content/content.types';
import { bundledGlossaryLoader } from '../../../core/content/testing';
import {
  applyFilters,
  filtersFromParams,
  groupCounts,
  groupTerms,
  matchesSearch,
  NO_FILTERS,
  paramsOf,
  sortTerms,
} from './glossary-catalog';

const params = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe('glossary catalogue', () => {
  it('should find terms with or without accents and in any case', async () => {
    const terms = await bundledGlossaryLoader();
    const pin = terms.find((t) => t.id === 'pin')!;
    const opposition = terms.find((t) => t.id === 'opposition')!;
    expect(matchesSearch(pin, 'CLAVADA', 'es')).toBe(true);
    expect(matchesSearch(opposition, 'oposicion', 'es')).toBe(true);
    expect(matchesSearch(pin, 'oposición', 'es')).toBe(false);
    expect(matchesSearch(pin, '', 'es')).toBe(true);
  });

  it('should sort by the name in the given language', async () => {
    const terms = await bundledGlossaryLoader();
    const en = sortTerms(terms, 'en').map((t) => t.name.en);
    expect(en).toEqual([...en].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('should group the terms by family in the fixed order, alphabetical inside each family', async () => {
    const terms = await bundledGlossaryLoader();
    const groups = groupTerms(terms, 'es');
    expect(groups.map((g) => g.key)).toEqual([...GLOSSARY_GROUPS]);
    expect(groups.map((g) => g.terms.length)).toEqual([12, 21, 5, 18, 13, 9]);
    for (const group of groups) {
      const names = group.terms.map((t) => t.name.es);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
      expect(group.terms.every((t) => t.group === group.key)).toBe(true);
    }
  });

  it('should leave out the families with no term', async () => {
    const terms = await bundledGlossaryLoader();
    const mates = terms.filter((t) => t.group === 'mates');
    expect(groupTerms(mates, 'en').map((g) => g.key)).toEqual(['mates']);
    expect(groupTerms([], 'en')).toEqual([]);
  });

  it('should combine the family, the level and the search', async () => {
    const terms = await bundledGlossaryLoader();
    const ids = (filters: Parameters<typeof applyFilters>[1]) =>
      applyFilters(terms, filters, 'es').map((t) => t.id);
    expect(ids(NO_FILTERS)).toHaveLength(78);
    expect(ids({ ...NO_FILTERS, group: 'mates' })).toHaveLength(5);
    expect(ids({ ...NO_FILTERS, level: 'advanced' }).sort()).toEqual(
      terms
        .filter((t) => t.level === 'advanced')
        .map((t) => t.id)
        .sort(),
    );
    expect(ids({ group: 'endgames', level: 'advanced', query: '' }).sort()).toEqual([
      'building-a-bridge',
      'lucena-position',
      'philidor-position',
    ]);
    // «Oposición» holds «posicion» too.
    expect(ids({ group: 'endgames', level: 'all', query: 'posicion' }).sort()).toEqual([
      'lucena-position',
      'opposition',
      'philidor-position',
    ]);
    expect(ids({ group: 'rules', level: 'all', query: 'zzz' })).toEqual([]);
  });

  it('should count every family with the other filters applied, and all of them', async () => {
    const terms = await bundledGlossaryLoader();
    const all = groupCounts(terms, NO_FILTERS, 'es');
    expect(all).toEqual({
      all: 78,
      rules: 12,
      tactics: 21,
      mates: 5,
      strategy: 18,
      pawns: 13,
      endgames: 9,
    });
    // The family filter itself does not change the counts of the families.
    expect(groupCounts(terms, { ...NO_FILTERS, group: 'mates' }, 'es')).toEqual(all);
    const advanced = groupCounts(terms, { ...NO_FILTERS, level: 'advanced' }, 'es');
    expect(advanced.endgames).toBe(3);
    expect(advanced.mates).toBe(0);
    expect(advanced.all).toBe(terms.filter((t) => t.level === 'advanced').length);
  });

  it('should read the filters from the address and ignore unknown values', () => {
    expect(filtersFromParams(params({}))).toEqual(NO_FILTERS);
    expect(filtersFromParams(params({ group: 'tactics', level: 'beginner', q: 'cla' }))).toEqual({
      group: 'tactics',
      level: 'beginner',
      query: 'cla',
    });
    expect(filtersFromParams(params({ group: 'openings', level: 'expert' }))).toEqual(NO_FILTERS);
  });

  it('should write only the filters that are set, in a fixed order', () => {
    expect(paramsOf(NO_FILTERS)).toEqual({});
    expect(paramsOf({ group: 'mates', level: 'all', query: '  ' })).toEqual({ group: 'mates' });
    expect(Object.entries(paramsOf({ group: 'rules', level: 'advanced', query: 'fila' }))).toEqual([
      ['group', 'rules'],
      ['level', 'advanced'],
      ['q', 'fila'],
    ]);
  });
});
