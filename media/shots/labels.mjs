// ===== Texts of the screenshots =====
//
// Writes media/out/labels.json: per language, one entry per scene of scenes.mjs with its image,
// its route and the hand-written texts of TEXTS:
//   name     the name of the screen
//   alt      what is seen in the screenshot, in one sentence
//   caption  a short caption for a gallery
//   text     one sentence on what the screen is for
// It checks that every scene has its texts in both languages, that no text is left without a
// scene and that every PNG is already in media/out.
//
// Usage: node media/shots/labels.mjs  (after shots.mjs; it neither builds nor opens the app)

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUT, SITE } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const LANGS = ['es', 'en'];

const t = (name, alt, caption, text) => ({ name, alt, caption, text });

// Keyed by the `file` of each scene. The texts describe the screenshots as they are: when a
// scene changes what it shows, its texts change with it. A position to solve is never described.
const TEXTS = {
  cover: {
    es: t(
      'Inicio',
      'La página de inicio de Cheesy: el titular «Aperturas, finales y táctica, en tu navegador.», un tablero grande con la Apertura Española tras 6.Te1, un panel con sus jugadas y el botón «Jugar esta apertura», y debajo el comienzo de las cuatro secciones.',
      'El inicio, con una apertura',
      'Enseña una apertura jugada paso a paso y da acceso a las cuatro secciones: aperturas, finales, posiciones y análisis.',
    ),
    en: t(
      'Home',
      'The Cheesy home page: the headline “Openings, endgames and tactics, in your browser.”, a large board with the Ruy Lopez after 6.Re1, a panel with its moves and the “Play this opening” button, and below the top of the four sections.',
      'Home, with an opening',
      'Shows an opening played move by move and leads to the four sections: openings, endgames, positions and analysis.',
    ),
  },
  'cover-mobile': {
    es: t(
      'Inicio en el móvil',
      'La página de inicio de Cheesy en un móvil: la cabecera, el titular «Aperturas, finales y táctica, en tu navegador.», el texto de entrada y un tablero con la Apertura Española.',
      'El inicio en el móvil',
      'La misma página de inicio en la pantalla de un móvil, con el tablero bajo el titular.',
    ),
    en: t(
      'Home on a phone',
      'The Cheesy home page on a phone: the header, the headline “Openings, endgames and tactics, in your browser.”, the intro and a board with the Ruy Lopez.',
      'Home on a phone',
      'The same home page on a phone screen, with the board under the headline.',
    ),
  },
  'screen-01-aperturas': {
    es: t(
      'Catálogo de aperturas',
      'El catálogo de aperturas: los filtros por primera jugada, familia, bando y progreso, y la fila «1.e4 e5: juegos abiertos» con cuatro aperturas, cada una con su minitablero, su progreso y los botones «Jugar» y «Practicar».',
      'Las 21 aperturas, con filtros',
      'Reúne las 21 aperturas, con filtros por primera jugada, bando y progreso, y cuántas líneas tienes dominadas de cada una.',
    ),
    en: t(
      'Opening catalogue',
      'The opening catalogue: the filters by first move, family, side and progress, and the row “1.e4 e5: open games” with four openings, each with its mini board, its progress and the “Play” and “Practise” buttons.',
      'The 21 openings, with filters',
      'Gathers the 21 openings, with filters by first move, side and progress, and how many lines of each you have mastered.',
    ),
  },
  'screen-02-jugar': {
    es: t(
      'Jugar una apertura',
      'Una partida de la Apertura Española con blancas, en el tema oscuro: el tablero tras 5…Ae7, el aviso «Te toca mover», el panel de teoría con la Variante Cerrada y la nota «Estás dentro de nuestras líneas», y la lista de jugadas.',
      'Una apertura, con su teoría',
      'Juegas una apertura contra un rival que responde con las líneas que cubrimos, o contra Stockfish en cinco niveles, con la teoría junto al tablero.',
    ),
    en: t(
      'Play an opening',
      'A game of the Ruy Lopez as White, in the dark theme: the board after 5…Be7, the notice “Your move”, the theory panel with the Closed Variation and the note “You are in our lines”, and the move list.',
      'An opening, with its theory',
      'You play an opening against a rival that answers with the lines we cover, or against Stockfish at five levels, with the theory next to the board.',
    ),
  },
  'screen-03-practicar': {
    es: t(
      'Practicar una línea',
      'La práctica de la línea principal de la Siciliana Najdorf con negras: el tablero visto desde las negras tras 6.Ag5, el avance «Jugada 6 de 13», el contador de fallos en esta jugada a 0 de 3 y la lista de jugadas.',
      'Una línea, jugada de memoria',
      'Modo estricto: solo vale la jugada de la línea; una línea queda dominada tras 3 pasadas seguidas sin fallos.',
    ),
    en: t(
      'Practise a line',
      'Practice of the main line of the Sicilian Najdorf as Black: the board seen from Black’s side after 6.Bg5, the progress “Move 6 of 13”, the count of mistakes on this move at 0 of 3 and the move list.',
      'A line, played from memory',
      'Strict mode: only the move of the line counts, and a line is mastered after 3 clean runs in a row.',
    ),
  },
  'screen-04-finales': {
    es: t(
      'Lista de finales',
      'La lista de finales en el tema oscuro: la explicación de los dos objetivos, ganar y tablas, los filtros por tipo de final y por objetivo, el recuento «4 de 14 superados» y el grupo «Rey y peón» con dos finales marcados como «Superado».',
      'Los 14 finales, por tipo',
      'Reúne los 14 finales por tipo y por objetivo, ganar o hacer tablas, y recuerda los que has superado.',
    ),
    en: t(
      'Endgame list',
      'The endgame list in the dark theme: the explanation of the two goals, win and draw, the filters by type of endgame and by goal, the count of 4 of 14 passed and the group “King and pawn” with two endgames marked as passed.',
      'The 14 endgames, by type',
      'Gathers the 14 endgames by type and by goal, to win or to draw, and remembers the ones you have passed.',
    ),
  },
  'screen-05-final': {
    es: t(
      'Final contra la tablebase',
      'La Posición de Lucena, a ganar con blancas: el tablero, la lista de objetivos con «La victoria sigue en juego» y el panel de la tablebase abierto, con el resultado teórico «Ganas», «Das mate en 17» y el botón «Ver pista».',
      'Un final contra la tablebase',
      'Juegas el final contra un rival que responde con la jugada de la tablebase de Lichess, y un panel te dice el resultado teórico de la posición.',
    ),
    en: t(
      'Endgame against the tablebase',
      'The Lucena position, to win with White: the board, the goal checklist with “The win is still on” and the tablebase panel open, with the theoretical result “You win”, “You mate in 17” and the “Show hint” button.',
      'An endgame against the tablebase',
      'You play the endgame against a rival that answers with the Lichess tablebase move, and a panel tells you the theoretical result of the position.',
    ),
  },
  'screen-06-posiciones': {
    es: t(
      'Galería de posiciones',
      'La galería de posiciones tácticas en el tema oscuro: el recuento «13 posiciones, 5 resueltas», los filtros por bando, número de jugadas tuyas y progreso, y la fila «Una jugada» con cuatro minitableros marcados como «A la primera», «Resuelta» o «Sin resolver».',
      'Las 13 posiciones tácticas',
      'Reúne las 13 posiciones tácticas por número de jugadas, sin nombre ni tema a la vista, y marca las que has resuelto.',
    ),
    en: t(
      'Position gallery',
      'The gallery of tactical positions in the dark theme: the count of 13 positions, 5 of them solved, the filters by side, number of your own moves and progress, and a row of one-move positions with four mini boards marked “First try”, “Solved” or “Unsolved”.',
      'The 13 tactical positions',
      'Gathers the 13 tactical positions by number of moves, with no name or theme in view, and marks the ones you have solved.',
    ),
  },
  'screen-07-posicion': {
    es: t(
      'Posición táctica',
      'Un ejercicio táctico sin resolver: el tablero, la indicación «Juegan negras · 1 jugada tuya», la instrucción «Encuentra la jugada ganadora» y los botones «Pista» y «Ver solución».',
      'Una posición por resolver',
      'Buscas la jugada ganadora en el tablero; el nombre y el tema de la posición no se ven hasta que la resuelves o pides la solución.',
    ),
    en: t(
      'Tactical position',
      'An unsolved tactical exercise: the board, the note “Black to play · 1 move of yours”, the instruction “Find the winning move” and the “Hint” and “Show solution” buttons.',
      'A position to solve',
      'You look for the winning move on the board; the name and theme of the position stay hidden until you solve it or ask for the solution.',
    ),
  },
  'screen-08-analisis': {
    es: t(
      'Tablero de análisis',
      'El tablero de análisis en el tema oscuro con una partida de la Apertura Española: el motor encendido a profundidad 20, la barra de evaluación, las tres mejores líneas, una flecha verde con la mejor jugada y la lista de jugadas con una variación plegada.',
      'Análisis con motor y variaciones',
      'Un tablero libre para explorar cualquier idea: Stockfish se ejecuta en el navegador y las jugadas forman un árbol con variaciones que se pliegan.',
    ),
    en: t(
      'Analysis board',
      'The analysis board in the dark theme with a Ruy Lopez game: the engine on at depth 20, the evaluation bar, the three best lines, a green arrow on the best move and the move list with a folded variation.',
      'Analysis with engine and variations',
      'A free board to explore any idea: Stockfish runs in the browser and the moves form a tree with variations you can fold.',
    ),
  },
};

function check() {
  const files = SCENES.map((scene) => scene.file);
  const extra = Object.keys(TEXTS).filter((file) => !files.includes(file));
  if (extra.length) throw new Error(`TEXTS has texts without a scene: ${extra.join(', ')}`);
  const missing = files.filter((file) => !TEXTS[file]);
  if (missing.length) throw new Error(`TEXTS has no texts for: ${missing.join(', ')}`);
}

function buildEntries(lang) {
  return SCENES.map((scene) => {
    const txt = TEXTS[scene.file][lang];
    if (!txt) throw new Error(`${scene.file}: the language "${lang}" is missing in TEXTS`);
    const image = `${scene.file}-${lang}.png`;
    const entry = {
      file: scene.file,
      image,
      path: scene.path,
      href: SITE + scene.path,
      theme: scene.theme,
      name: txt.name,
      alt: txt.alt,
      caption: txt.caption,
      text: txt.text,
    };
    for (const [field, value] of Object.entries(entry)) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${scene.file} (${lang}): the field "${field}" is empty`);
      }
    }
    if (!existsSync(join(OUT, image))) {
      throw new Error(`${image}: not found in media/out; run shots.mjs first`);
    }
    return entry;
  });
}

async function main() {
  check();
  const data = { count: SCENES.length };
  for (const lang of LANGS) data[lang] = buildEntries(lang);
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'labels.json'), JSON.stringify(data, null, 2) + '\n');
  const total = LANGS.map((lang) => data[lang].length).join(' + ');
  console.log(`labels.json written to media/out (${total} entries)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
