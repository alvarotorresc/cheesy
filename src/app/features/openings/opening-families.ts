import type { OpeningSummary } from '../../core/content';

/** Families the opening list is grouped by, in display order. */
export const OPENING_FAMILIES = [
  'openGames',
  'sicilian',
  'otherE4',
  'closedGames',
  'indian',
  'otherD4',
  'flank',
  'other',
] as const;

export type OpeningFamily = (typeof OPENING_FAMILIES)[number];

export interface OpeningGroup {
  family: OpeningFamily;
  openings: readonly OpeningSummary[];
}

interface EcoRange {
  from: string;
  to: string;
  family: OpeningFamily;
}

/**
 * ECO ranges of each family. The first matching range wins; codes outside every range fall in
 * `other`, so an unexpected code never drops an opening from the list.
 */
const ECO_RANGES: readonly EcoRange[] = [
  { from: 'A00', to: 'A39', family: 'flank' },
  { from: 'A40', to: 'A44', family: 'otherD4' },
  { from: 'A45', to: 'A79', family: 'indian' },
  { from: 'A80', to: 'A99', family: 'otherD4' },
  { from: 'B00', to: 'B19', family: 'otherE4' },
  { from: 'B20', to: 'B99', family: 'sicilian' },
  { from: 'C00', to: 'C19', family: 'otherE4' },
  { from: 'C20', to: 'C99', family: 'openGames' },
  { from: 'D00', to: 'D69', family: 'closedGames' },
  { from: 'D70', to: 'D99', family: 'indian' },
  { from: 'E00', to: 'E99', family: 'indian' },
];

const ECO_CODE = /^[A-E]\d{2}/;

/** Family of an ECO code or range ("C60-C99"): only the first code counts. */
export const familyOf = (eco: string): OpeningFamily => {
  const code = ECO_CODE.exec(eco.trim().toUpperCase())?.[0];
  if (!code) return 'other';
  return ECO_RANGES.find(({ from, to }) => code >= from && code <= to)?.family ?? 'other';
};

/** Groups the catalogue by family, keeping the catalogue order inside each one. Empty ones are left out. */
export const groupByFamily = (catalog: readonly OpeningSummary[]): OpeningGroup[] =>
  OPENING_FAMILIES.map((family) => ({
    family,
    openings: catalog.filter((opening) => familyOf(opening.eco) === family),
  })).filter((group) => group.openings.length > 0);
