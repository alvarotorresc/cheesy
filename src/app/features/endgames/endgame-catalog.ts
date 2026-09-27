import type { EndgamePosition } from '../../core/content';
import type { Localized } from '../../core/i18n';

export interface EndgameCategory {
  /** Stable key: the English name of the category. */
  key: string;
  name: Localized;
  endgames: readonly EndgamePosition[];
}

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
