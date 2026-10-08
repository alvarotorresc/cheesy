import type { ActivatedRouteSnapshot, ParamMap } from '@angular/router';
import type { LessonLevel } from '../content/content.types';
import { isLang, type Lang } from '../i18n/i18n.types';
import { pageUrls } from './site-urls';

/**
 * The language of the tree a route hangs from: the `data.lang` of `/es` and `/en`. Undefined
 * outside them, and for a route without a snapshot (the stand-in routes of some specs).
 */
export const routeLang = (route: ActivatedRouteSnapshot | undefined): Lang | undefined => {
  const lang: unknown = route?.data['lang'];
  return isLang(lang) ? lang : undefined;
};

/**
 * The content id behind a route parameter. Under `/es` and `/en` (`lang` given) the parameter is a
 * slug of that language, and a slug no entity has gives `''`, which no content has either (never
 * another language's id: `/es/aperturas/ruy-lopez` is no page). Without a language, as in the specs
 * of a page, the parameter is the id itself.
 */
export const routeId = (
  params: ParamMap,
  lang: Lang | undefined,
  param: string,
  kind: 'opening' | 'endgame' | 'position' | 'level' | 'lesson',
  level?: LessonLevel,
): string => {
  const value = params.get(param) ?? '';
  return lang ? (pageUrls.idOfSlug(kind, value, lang, level) ?? '') : value;
};
