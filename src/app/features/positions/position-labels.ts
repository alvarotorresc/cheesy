import type { Side } from '../../core/content';
import type { Messages } from '../../core/i18n';

type PositionMessages = Messages['positions'];

/**
 * Translated name of a theme tag. Tags are free kebab-case text in the content, so a tag without a
 * translation is still shown, made readable, instead of breaking the gallery.
 */
export const tagLabel = (tag: string, t: PositionMessages): string =>
  Object.hasOwn(t.tags, tag) ? t.tags[tag] : tag.replaceAll('-', ' ');

export const sideToPlayLabel = (side: Side, t: PositionMessages): string =>
  side === 'white' ? t.whiteToPlay : t.blackToPlay;
