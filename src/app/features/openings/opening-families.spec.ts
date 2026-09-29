import type { OpeningSummary } from '../../core/content';
import { familyOf, groupByFamily } from './opening-families';

const summary = (id: string, eco: string): OpeningSummary => ({
  id,
  name: { es: id, en: id },
  eco,
  side: 'white',
  description: { es: '', en: '' },
  lineCount: 1,
  preview: { sans: [], names: [], namedPly: 4 },
});

describe('opening families', () => {
  describe('familyOf', () => {
    it.each([
      ['C60-C99', 'openGames'], // Ruy Lopez
      ['C50-C59', 'openGames'], // Italian Game
      ['C44-C45', 'openGames'], // Scotch Game
      ['C42-C43', 'openGames'], // Petrov Defence
      ['C30-C39', 'openGames'], // King's Gambit
      ['B90-B99', 'sicilian'], // Najdorf
      ['B70-B79', 'sicilian'], // Dragon
      ['B33', 'sicilian'], // Sveshnikov
      ['B22', 'sicilian'], // Alapin
      ['C00-C19', 'otherE4'], // French Defence
      ['B10-B19', 'otherE4'], // Caro-Kann
      ['B01', 'otherE4'], // Scandinavian
      ['B07-B09', 'otherE4'], // Pirc
      ['D30-D69', 'closedGames'], // Queen's Gambit Declined
      ['D20-D29', 'closedGames'], // Queen's Gambit Accepted
      ['D10-D19', 'closedGames'], // Slav
      ['D02', 'closedGames'], // London System after 1.d4 d5
      ['E60-E99', 'indian'], // King's Indian
      ['E20-E59', 'indian'], // Nimzo-Indian
      ['D70-D99', 'indian'], // Grünfeld
      ['A10-A39', 'flank'], // English
      ['A80-A99', 'otherD4'], // Dutch
      ['A40', 'otherD4'],
    ] as const)('should place %s in %s', (eco, family) => {
      expect(familyOf(eco)).toBe(family);
    });

    it.each(['', 'Z12', 'unknown', 'C'])('should fall back to other when the code is %j', (eco) => {
      expect(familyOf(eco)).toBe('other');
    });

    it('should accept lowercase codes and surrounding spaces', () => {
      expect(familyOf('  c65 ')).toBe('openGames');
    });
  });

  describe('groupByFamily', () => {
    it('should group in family order and keep the catalogue order inside each family', () => {
      const catalog = [
        summary('french', 'C00-C19'),
        summary('ruy', 'C60-C99'),
        summary('caro', 'B10-B19'),
        summary('italian', 'C50-C59'),
      ];

      const groups = groupByFamily(catalog);

      expect(groups.map((group) => [group.family, group.openings.map((o) => o.id)])).toEqual([
        ['openGames', ['ruy', 'italian']],
        ['otherE4', ['french', 'caro']],
      ]);
    });

    it('should keep openings with an unknown code in the last group', () => {
      const groups = groupByFamily([summary('odd', '???'), summary('english', 'A10')]);

      expect(groups.at(-1)).toEqual({ family: 'other', openings: [summary('odd', '???')] });
    });

    it('should return no groups when the catalogue is empty', () => {
      expect(groupByFamily([])).toEqual([]);
    });
  });
});
