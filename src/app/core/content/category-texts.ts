import texts from './data/category-texts.json';
import type { CategoryId } from '../routing/page-url';
import type { Lang } from '../i18n/i18n.types';

/**
 * The two paragraphs of each category page (openings, endgames, positions, learn) in every
 * language, written in `content/authoring/categories.ts`. Small enough to ship with the app: the
 * category pages show them and their description for search engines is cut from them.
 */
export const categoryTexts: Readonly<
  Record<CategoryId, Readonly<Record<Lang, readonly [string, string]>>>
> = texts as Record<CategoryId, Record<Lang, [string, string]>>;
