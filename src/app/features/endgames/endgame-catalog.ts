import { parseFen } from 'chessops/fen';
import type { EndgamePosition } from '../../core/content';
import type { Localized } from '../../core/i18n';

export interface EndgameCategory {
  /** Stable key: the English name of the category. */
  key: string;
  name: Localized;
  endgames: readonly EndgamePosition[];
}

export type GoalFilter = 'all' | 'win' | 'draw';

/** The filters of the list: a category key (or `all`) and a goal (or `all`). */
export interface EndgameFilters {
  readonly category: string;
  readonly goal: GoalFilter;
}

export const NO_FILTERS: EndgameFilters = { category: 'all', goal: 'all' };

/** Groups endgames by category, keeping the order in which categories and endgames appear. */
export const groupByCategory = (endgames: readonly EndgamePosition[]): EndgameCategory[] => {
  const groups = new Map<string, { name: Localized; endgames: EndgamePosition[] }>();
  for (const endgame of endgames) {
    const key = endgame.category.en;
    const group = groups.get(key);
    if (group) {
      group.endgames.push(endgame);
    } else {
      groups.set(key, { name: endgame.category, endgames: [endgame] });
    }
  }
  return [...groups].map(([key, group]) => ({ key, ...group }));
};

/** The endgames that pass the filters, in their original order. */
export const applyFilters = (
  endgames: readonly EndgamePosition[],
  filters: EndgameFilters,
): EndgamePosition[] =>
  endgames.filter(
    (endgame) =>
      (filters.category === 'all' || endgame.category.en === filters.category) &&
      (filters.goal === 'all' || endgame.goal === filters.goal),
  );

/** Number of pieces (kings included) on the board of a FEN; 0 when it is not a valid FEN. */
export const pieceCount = (fen: string): number => {
  const setup = parseFen(fen);
  return setup.isOk ? setup.value.board.occupied.size() : 0;
};
