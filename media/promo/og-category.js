// Fills og-category.html from its query string: ?cat=openings|endgames|positions|learn.
//
// One card per section, for both languages: the Spanish name of the section is the headline (the
// gap of the site is in Spanish) and the English one goes under it. The board strip shows one idea
// of the section, made up for the card: it is no position of the site, so it gives nothing away.
// Squares are [file, rank] counted from the top left of the strip (four files, six ranks).
const CARDS = {
  openings: {
    es: 'Aperturas',
    en: 'Openings',
    // The first move: a pawn two squares up, the square it left still marked.
    from: [1, 4],
    current: [1, 2],
    pieces: [['wP', 1, 2]],
    dots: [],
  },
  endgames: {
    es: 'Finales',
    en: 'Endgames',
    // King and pawn against king: the pawn on its way, the square ahead marked.
    current: [1, 3],
    pieces: [
      ['wP', 1, 3],
      ['wK', 2, 4],
      ['bK', 3, 1],
    ],
    dots: [[1, 2]],
  },
  positions: {
    es: 'Posiciones',
    en: 'Positions',
    // A tactic: a knight that hits the king and the queen at once.
    current: [1, 3],
    pieces: [
      ['wN', 1, 3],
      ['bK', 0, 1],
      ['bQ', 2, 1],
    ],
    dots: [],
  },
  learn: {
    es: 'Aprender',
    en: 'Learn',
    // How a piece moves, as the first lessons show it: a rook and the squares it reaches.
    current: [1, 3],
    pieces: [['wR', 1, 3]],
    dots: [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 4],
      [1, 5],
      [0, 3],
      [2, 3],
      [3, 3],
    ],
  },
};

const card = CARDS[new URLSearchParams(location.search).get('cat')] ?? CARDS.openings;
document.getElementById('section').textContent = card.es;
const other = document.getElementById('other');
other.textContent = card.en;
other.lang = 'en';

const board = document.getElementById('board');
const square = (className, [col, row]) => {
  const el = document.createElement('span');
  el.className = className;
  el.style.setProperty('--col', col);
  el.style.setProperty('--row', row);
  board.append(el);
};
if (card.from) square('from', card.from);
square('current', card.current);
for (const dot of card.dots) square('dot', dot);
for (const [code, col, row] of card.pieces) square(`pc pc-${code}`, [col, row]);
