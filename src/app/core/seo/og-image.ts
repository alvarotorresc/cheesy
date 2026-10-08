// The image of a page when it is shared (Open Graph and Twitter) and its alternative text.
//
// One card per section (`public/og/<section>.png`, made by `media/shots/promo.mjs --og`) for the
// section page and every page under it; the home page, the about page and the rest keep the card of
// the site (`public/og.png`). No imports but types, so the build check (`scripts/check-pages.mjs`)
// reads it as it is.
import type { Lang } from '../i18n/i18n.types';
import type { CategoryId, Page } from '../routing/page-url';

const ORIGIN = 'https://cheesy.alvarotc.com';

export interface OgImage {
  readonly url: string;
  readonly alt: string;
}

type Card = CategoryId | 'site';

const ALTS: Readonly<Record<Card, Readonly<Record<Lang, string>>>> = {
  site: {
    es: 'El nombre Cheesy, la frase «Aperturas, finales y táctica, en tu navegador.» y un caballo de ajedrez sobre un tablero.',
    en: 'The name Cheesy, the line "Openings, endgames and tactics, in your browser." and a chess knight on a board.',
  },
  openings: {
    es: 'Cheesy, Aperturas: un peón blanco que acaba de avanzar dos casillas en un tablero.',
    en: 'Cheesy, Openings: a white pawn that has just moved two squares up a chessboard.',
  },
  endgames: {
    es: 'Cheesy, Finales: un rey y un peón blancos contra el rey negro, con la casilla a la que avanza el peón marcada.',
    en: 'Cheesy, Endgames: a white king and pawn against the black king, with the square the pawn goes to marked.',
  },
  positions: {
    es: 'Cheesy, Posiciones: un caballo blanco que ataca a la vez al rey y a la dama negros.',
    en: 'Cheesy, Positions: a white knight that attacks the black king and queen at once.',
  },
  learn: {
    es: 'Cheesy, Aprender: una torre blanca con las casillas a las que puede ir marcadas.',
    en: 'Cheesy, Learn: a white rook with the squares it can reach marked.',
  },
};

/** The section a page belongs to, for its card; `site` for the pages of no section. */
const cardOf = (page: Page | undefined): Card => {
  switch (page?.kind) {
    case 'category':
      return page.category;
    case 'opening':
    case 'practice':
      return 'openings';
    case 'endgame':
      return 'endgames';
    case 'position':
      return 'positions';
    case 'level':
    case 'lesson':
    case 'glossary':
    case 'puzzles':
    case 'puzzle':
      return 'learn';
    default:
      return 'site';
  }
};

/** The shared image of `page` (undefined for an address that is no page) in `lang`. */
export const ogImageOf = (page: Page | undefined, lang: Lang): OgImage => {
  const card = cardOf(page);
  return {
    url: card === 'site' ? `${ORIGIN}/og.png` : `${ORIGIN}/og/${card}.png`,
    alt: ALTS[card][lang],
  };
};
