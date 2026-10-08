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
import { OUT, pathIn, SITE } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const LANGS = ['es', 'en'];

const t = (name, alt, caption, text) => ({ name, alt, caption, text });

// Keyed by the `file` of each scene. The texts describe the screenshots as they are: when a
// scene changes what it shows, its texts change with it. A position to solve is never described.
const TEXTS = {
  cover: {
    es: t(
      'Inicio',
      'La página de inicio de Cheesy: el menú con Aprender, Aperturas, Finales, Posiciones y Análisis, el titular «Aperturas, finales y táctica, en tu navegador.», un tablero grande con la Apertura Española tras la sexta jugada de las blancas, un panel con sus jugadas y el botón «Jugar esta apertura», la franja «¿Empiezas desde cero?» con el botón «Aprende a jugar» y debajo el comienzo de las secciones.',
      'El inicio, con una apertura',
      'Enseña una apertura jugada paso a paso, invita a aprender desde cero y da acceso a las secciones: aprender, aperturas, finales, posiciones y análisis.',
    ),
    en: t(
      'Home',
      'The Cheesy home page: the menu with Learn, Openings, Endgames, Positions and Analysis, the headline “Openings, endgames and tactics, in your browser.”, a large board with the Ruy Lopez after White’s sixth move, a panel with its moves and the “Play this opening” button, the band “Starting from scratch?” with the “Learn to play” button and below the top of the sections.',
      'Home, with an opening',
      'Shows an opening played move by move, invites you to learn from scratch and leads to the sections: learn, openings, endgames, positions and analysis.',
    ),
  },
  'cover-mobile': {
    es: t(
      'Inicio en el móvil',
      'La página de inicio de Cheesy en un móvil: la cabecera con el idioma, el conmutador «Palabras» / «Notación» y el menú, el titular «Aperturas, finales y táctica, en tu navegador.», el texto de entrada y un tablero con la Apertura Española.',
      'El inicio en el móvil',
      'La misma página de inicio en la pantalla de un móvil, con el tablero bajo el titular.',
    ),
    en: t(
      'Home on a phone',
      'The Cheesy home page on a phone: the header with the language, the “Words” / “Notation” switch and the menu, the headline “Openings, endgames and tactics, in your browser.”, the intro and a board with the Ruy Lopez.',
      'Home on a phone',
      'The same home page on a phone screen, with the board under the headline.',
    ),
  },
  'screen-learn': {
    es: t(
      'Aprender',
      'La página Aprender: el botón «Continuar: La enfilada» y cinco tarjetas, los niveles Principiante, Medio y Avanzado con su número de lecciones, el Glosario y Practica más, y debajo la nota de que el progreso se guarda solo en el navegador.',
      'Lecciones de principiante a avanzado',
      'Enseña ajedrez desde cero en lecciones cortas por niveles, con un glosario y problemas para practicar, y te lleva a la siguiente lección.',
    ),
    en: t(
      'Learn',
      'The Learn page: the “Continue: The skewer” button and five cards, the Beginner, Intermediate and Advanced levels with their number of lessons, the Glossary and Practise more, and below the note that progress is kept only in the browser.',
      'Lessons from beginner to advanced',
      'Teaches chess from scratch in short lessons by level, with a glossary and puzzles to practise, and takes you to your next lesson.',
    ),
  },
  'screen-lesson': {
    es: t(
      'Una lección',
      'El primer paso de la lección «La horquilla»: un tablero con un caballo blanco y dos flechas hacia el rey y la torre negros, el texto que lo explica en palabras, el avance «Paso 1 de 7» y abierta la burbuja del término «Jaque», con su definición, un minitablero y el enlace «Ver en el glosario».',
      'Una lección, paso a paso',
      'Cada lección avanza por pasos con un tablero y texto en lenguaje llano; las palabras de ajedrez se abren en una burbuja con su definición.',
    ),
    en: t(
      'A lesson',
      'The first step of the lesson “The fork”: a board with a white knight and two arrows to the black king and rook, the text that explains it in words, the progress “Step 1 of 7” and the bubble of the term “Check” open, with its definition, a mini board and the “See in the glossary” link.',
      'A lesson, step by step',
      'Each lesson goes step by step with a board and plain-language text; chess words open in a bubble with their definition.',
    ),
  },
  'screen-glossary': {
    es: t(
      'Glosario',
      'El glosario en el tema oscuro, filtrado por la familia Táctica: el buscador, los filtros por nivel y por familia, el recuento «21 de 78 términos» y la primera fila de tarjetas, cada una con su tablero de ejemplo, su nivel, su definición y la lección donde se aprende.',
      'Las palabras del ajedrez, con tablero',
      'Explica en llano cada palabra del ajedrez con un tablero de ejemplo, por familias y niveles, y lleva a la lección que la enseña.',
    ),
    en: t(
      'Glossary',
      'The glossary in the dark theme, filtered by the Tactics family: the search box, the filters by level and by family, the count “21 of 78 terms” and the first row of cards, each with its example board, its level, its definition and the lesson where it is learnt.',
      'Chess words, with a board',
      'Explains every chess word in plain language with an example board, by family and level, and leads to the lesson that teaches it.',
    ),
  },
  'screen-puzzles': {
    es: t(
      'Practica más',
      'La lista de Practica más en el tema oscuro: problemas reales de Lichess agrupados por lección, con tres lecciones empezadas, «16 de 50 a la primera» en Piezas sin defensa y 8 de 50 en La horquilla y en La clavada, y el resto por empezar.',
      'Problemas de Lichess por tema',
      'Problemas reales de partidas de Lichess para cada lección de táctica y finales, de diez en diez y del más fácil al más difícil.',
    ),
    en: t(
      'Practise more',
      'The Practise more list in the dark theme: real Lichess puzzles grouped by lesson, with three lessons started, “16 of 50 on the first try” in Hanging pieces and 8 of 50 in The fork and The pin, and the rest still to start.',
      'Lichess puzzles by theme',
      'Real puzzles from Lichess games for each tactics and endgame lesson, ten at a time, from easiest to hardest.',
    ),
  },
  'screen-puzzle': {
    es: t(
      'Un problema',
      'Un problema de La horquilla sin resolver: el tablero, el avance «Problema 1 de 10», la indicación «Juegas con las blancas. Las negras acaban de mover: peón a c5. Busca la mejor jugada.» y el botón «Siguiente problema» desactivado.',
      'Un problema por resolver',
      'Buscas la mejor jugada en el tablero; la última jugada del rival se dice en palabras, y la tanda sigue cuando lo resuelves.',
    ),
    en: t(
      'A puzzle',
      'An unsolved puzzle of The fork: the board, the progress “Puzzle 1 of 10”, the prompt “You play White. Black just moved: pawn to c5. Find the best move.” and the “Next puzzle” button disabled.',
      'A puzzle to solve',
      'You look for the best move on the board; the rival’s last move is given in words, and the batch goes on once you solve it.',
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
      'Una partida de la Apertura Española con blancas, en el tema oscuro: el tablero tras la tercera jugada de las negras, el aviso «Te toca mover», el panel de teoría con la Defensa Morphy explicada en palabras y la nota «Estás dentro de nuestras líneas», y la lista de jugadas.',
      'Una apertura, con su teoría',
      'Juegas una apertura contra un rival que responde con las líneas que cubrimos, o contra Stockfish en cinco niveles, con la teoría junto al tablero.',
    ),
    en: t(
      'Play an opening',
      'A game of the Ruy Lopez as White, in the dark theme: the board after Black’s third move, the notice “Your move”, the theory panel with the Morphy Defence explained in words and the note “You are in our lines”, and the move list.',
      'An opening, with its theory',
      'You play an opening against a rival that answers with the lines we cover, or against Stockfish at five levels, with the theory next to the board.',
    ),
  },
  'screen-03-practicar': {
    es: t(
      'Practicar una línea',
      'La práctica de la línea principal de la Siciliana Najdorf con negras: el tablero visto desde las negras tras la sexta jugada de las blancas, el avance «Jugada 6 de 13», el contador de fallos en esta jugada a 0 de 3 y la lista de jugadas.',
      'Una línea, jugada de memoria',
      'Modo estricto: solo vale la jugada de la línea; una línea queda dominada tras 3 pasadas seguidas sin fallos.',
    ),
    en: t(
      'Practise a line',
      'Practice of the main line of the Sicilian Najdorf as Black: the board seen from Black’s side after White’s sixth move, the progress “Move 6 of 13”, the count of mistakes on this move at 0 of 3 and the move list.',
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
      href: SITE + pathIn(scene.path, lang),
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
