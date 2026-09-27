export const LANGS = ['es', 'en'] as const;

export type Lang = (typeof LANGS)[number];

/** A piece of content written in every supported language. */
export interface Localized {
  es: string;
  en: string;
}

export const isLang = (value: unknown): value is Lang =>
  typeof value === 'string' && (LANGS as readonly string[]).includes(value);

export const resolveLocalized = (value: Localized, lang: Lang): string => value[lang];
