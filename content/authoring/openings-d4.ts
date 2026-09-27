import type { OpeningSpec } from './tree-builder.ts';

// ---------------------------------------------------------------- 1.d4 d5

const QGD = 'd4 d5 c4 e6 Nc3 Nf6';
const QGD_BG5 = `${QGD} Bg5 Be7 e3 O-O Nf3`;

export const qgd: OpeningSpec = {
  id: 'queens-gambit-declined',
  name: { es: 'Gambito de Dama Rehusado', en: "Queen's Gambit Declined" },
  eco: 'D30-D69',
  side: 'black',
  description: {
    es: 'Las negras mantienen el peón de d5 con ...e6: planteamiento sólido y clásico. El reto es liberar el alfil de c8 y romper con ...c5 o ...e5.',
    en: 'Black keeps the d5 pawn with ...e6: a solid, classical approach. The challenge is freeing the c8 bishop and breaking with ...c5 or ...e5.',
  },
  main: `${QGD_BG5} h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5`,
  lines: [
    `${QGD_BG5} h6 Bh4 Ne4 Bxe7 Qxe7 cxd5 Nxc3 bxc3 exd5 Qb3 Rd8`,
    `${QGD_BG5} Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5`,
    `${QGD} cxd5 exd5 Bg5 c6 Qc2 Be7 e3 Nbd7 Bd3 O-O Nge2 Re8 O-O Nf8`,
    `${QGD} Nf3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6 a3 Qa5 O-O-O`,
  ],
  notes: {
    'd4 d5 c4': {
      comment: {
        es: 'Gambito de Dama: no es un gambito real, porque las blancas recuperan el peón con facilidad.',
        en: "The Queen's Gambit: not a real gambit, since White easily regains the pawn.",
      },
    },
    'd4 d5 c4 e6': {
      name: { es: 'Gambito de Dama Rehusado', en: "Queen's Gambit Declined" },
      comment: {
        es: 'Las negras mantienen d5 con un peón: estructura muy sólida, aunque el alfil de c8 queda encerrado.',
        en: 'Black holds d5 with a pawn: a very solid structure, though the c8 bishop is shut in.',
      },
    },
    [`${QGD} Bg5`]: {
      name: { es: 'Variante Moderna (4.Ag5)', en: 'Modern Variation (4.Bg5)' },
      comment: {
        es: 'Clava el caballo de f6, uno de los defensores de d5.',
        en: 'Pins the f6 knight, one of the defenders of d5.',
      },
    },
    [`${QGD_BG5} h6 Bh4 b6`]: {
      name: { es: 'Defensa Tartakower', en: 'Tartakower Defence' },
      comment: {
        es: 'El alfil irá a b7, lo que resuelve el problema del alfil de casillas claras.',
        en: 'The bishop goes to b7, solving the problem of the light-squared bishop.',
      },
    },
    [`${QGD_BG5} h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5`]: {
      comment: {
        es: 'Tras los cambios, las negras juegan ...Ae6 y ...c5 y aceptan peones colgantes a cambio de actividad.',
        en: 'After the trades Black plays ...Be6 and ...c5, accepting hanging pawns in return for activity.',
      },
    },
    [`${QGD_BG5} h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3`]: {
      comment: {
        es: 'Presiona c5 y pone a prueba los peones colgantes.',
        en: 'Pressures c5 and tests the hanging pawns.',
      },
    },
    [`${QGD_BG5} h6 Bh4 Ne4`]: {
      name: { es: 'Defensa Lasker', en: 'Lasker Defence' },
      comment: {
        es: 'Cambia piezas para liberar la posición negra.',
        en: "Trades pieces to free Black's position.",
      },
    },
    [`${QGD_BG5} Nbd7`]: {
      name: { es: 'Defensa Ortodoxa', en: 'Orthodox Defence' },
      comment: {
        es: 'Desarrollo clásico: las negras mantienen d5 y preparan ...c6 y ...dxc4 en el momento oportuno.',
        en: 'Classical development: Black holds d5 and prepares ...c6 and ...dxc4 at the right moment.',
      },
    },
    [`${QGD_BG5} Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5`]: {
      name: { es: 'Sistema Capablanca', en: 'Capablanca System' },
      comment: {
        es: 'Maniobra liberadora: cambios en d5 y e7 y, después, la ruptura ...e5.',
        en: 'The freeing manoeuvre: trades on d5 and e7, followed by the ...e5 break.',
      },
    },
    [`${QGD} cxd5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: 'Fija la estructura; las blancas suelen plantear el ataque de minorías con b4-b5.',
        en: 'Fixes the structure; White often plans the minority attack with b4-b5.',
      },
    },
    [`${QGD} cxd5 exd5 Bg5 c6 Qc2`]: {
      comment: {
        es: 'Impide ...Af5 y prepara e3 y Ad3.',
        en: 'Prevents ...Bf5 and prepares e3 and Bd3.',
      },
    },
    [`${QGD} cxd5 exd5 Bg5 c6 Qc2 Be7 e3 Nbd7 Bd3 O-O Nge2`]: {
      comment: {
        es: 'Con Cge2 las blancas pueden preparar f3 y e4 en lugar del ataque de minorías.',
        en: 'With Nge2 White can prepare f3 and e4 instead of the minority attack.',
      },
    },
    [`${QGD} Nf3 Be7 Bf4`]: {
      name: { es: 'Ataque Harrwitz', en: 'Harrwitz Attack' },
      comment: {
        es: 'El alfil se desarrolla fuera de la cadena sin clavar el caballo.',
        en: 'The bishop develops outside the pawn chain without pinning the knight.',
      },
    },
    [`${QGD} Nf3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5`]: {
      name: { es: 'Ataque Harrwitz, línea principal', en: 'Harrwitz Attack, Main Line' },
      comment: {
        es: 'Las negras liberan su juego con ...c5 y buscan actividad con ...Cc6 y ...Da5.',
        en: 'Black frees the game with ...c5 and seeks activity with ...Nc6 and ...Qa5.',
      },
    },
  },
};

const QGA = 'd4 d5 c4 dxc4';
const QGA_CL = `${QGA} Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6`;

export const qga: OpeningSpec = {
  id: 'queens-gambit-accepted',
  name: { es: 'Gambito de Dama Aceptado', en: "Queen's Gambit Accepted" },
  eco: 'D20-D29',
  side: 'black',
  description: {
    es: 'Las negras toman el peón de c4 para ganar tiempo y atacar el centro con ...c5 o ...e5, sin intentar conservarlo.',
    en: 'Black takes the c4 pawn to gain time and hit the centre with ...c5 or ...e5, without trying to keep it.',
  },
  main: `${QGA_CL} a4 Nc6 Qe2 cxd4 Rd1 Be7 exd4 O-O Nc3 Nd5`,
  lines: [
    `${QGA_CL} Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Bd6`,
    `${QGA} e4 e5 Nf3 exd4 Bxc4 Bb4+ Nbd2 Nc6 O-O Nf6 e5 Nd5`,
    `${QGA} e4 Nf6 e5 Nd5 Bxc4 Nb6 Bb3 Nc6 Ne2 Bf5 Nbc3 e6 O-O Qd7`,
    `${QGA} e3 e5 Bxc4 exd4 exd4 Nf6 Nf3 Be7 O-O O-O`,
    `${QGA} Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5 Nc3 Nbd7 O-O Bd6`,
  ],
  notes: {
    'd4 d5 c4': {
      comment: {
        es: 'Gambito de Dama: no es un gambito real, porque las blancas recuperan el peón con facilidad.',
        en: "The Queen's Gambit: not a real gambit, since White easily regains the pawn.",
      },
    },
    [QGA]: {
      name: { es: 'Gambito de Dama Aceptado', en: "Queen's Gambit Accepted" },
      comment: {
        es: 'Las negras toman el peón no para conservarlo, sino para desarrollarse deprisa y atacar el centro con ...c5 o ...e5.',
        en: 'Black takes the pawn not to keep it, but to develop quickly and hit the centre with ...c5 or ...e5.',
      },
    },
    [`${QGA} Nf3`]: {
      name: { es: 'Variante Normal', en: 'Normal Variation' },
      comment: {
        es: 'Impide ...e5 antes de recuperar el peón.',
        en: 'Prevents ...e5 before regaining the pawn.',
      },
    },
    [`${QGA} Nf3 Nf6 e3 e6 Bxc4 c5`]: {
      name: { es: 'Defensa Clásica', en: 'Classical Defence' },
      comment: {
        es: 'El golpe típico contra d4.',
        en: 'The typical strike at d4.',
      },
    },
    [QGA_CL]: {
      name: { es: 'Defensa Clásica, línea principal', en: 'Classical Defence, Main Line' },
      comment: {
        es: 'Prepara ...b5 para ganar tiempo sobre el alfil de c4.',
        en: 'Prepares ...b5 to gain time on the c4 bishop.',
      },
    },
    [`${QGA_CL} a4`]: {
      name: { es: 'Variante Rubinstein', en: 'Rubinstein Variation' },
      comment: {
        es: 'Impide ...b5 a costa de debilitar la casilla b4.',
        en: 'Stops ...b5 at the cost of weakening b4.',
      },
    },
    [`${QGA_CL} a4 Nc6 Qe2 cxd4 Rd1 Be7 exd4`]: {
      comment: {
        es: 'Estructura de peón aislado: las blancas tienen piezas activas y las negras bloquean en d5.',
        en: 'An isolated-pawn structure: White has active pieces while Black blockades on d5.',
      },
    },
    [`${QGA_CL} Qe2`]: {
      name: { es: 'Sistema Alekhine', en: 'Alekhine System' },
      comment: {
        es: 'Prepara Td1 para presionar la columna d.',
        en: 'Prepares Rd1 to press on the d-file.',
      },
    },
    [`${QGA_CL} Qe2 b5 Bb3 Bb7`]: {
      name: { es: 'Sistema Alekhine, línea principal', en: 'Alekhine System, Main Line' },
      comment: {
        es: 'El alfil se instala en la gran diagonal y vigila e4.',
        en: 'The bishop settles on the long diagonal and watches e4.',
      },
    },
    [`${QGA} e4`]: {
      comment: {
        es: 'Ocupa el centro con dos peones; las negras deben atacarlo de inmediato.',
        en: 'Occupies the centre with two pawns; Black must attack it at once.',
      },
    },
    [`${QGA} e4 e5`]: {
      name: { es: 'Defensa McDonnell', en: 'McDonnell Defence' },
      comment: {
        es: 'Contragolpe central inmediato.',
        en: 'An immediate central counterstrike.',
      },
    },
    [`${QGA} e4 Nf6`]: {
      name: { es: 'Variante Central, sistema Alekhine', en: 'Central Variation, Alekhine System' },
      comment: {
        es: 'Ataca e4 y provoca e5; el caballo se instalará en d5.',
        en: 'Hits e4 and provokes e5; the knight will settle on d5.',
      },
    },
    [`${QGA} e3`]: {
      name: { es: 'Variante Antigua', en: 'Old Variation' },
      comment: {
        es: 'Recupera el peón con el alfil, pero permite ...e5.',
        en: 'Regains the pawn with the bishop but allows ...e5.',
      },
    },
    [`${QGA} Nf3 Nf6 e3 Bg4`]: {
      comment: {
        es: 'El alfil sale antes de ...e6 y presiona d4 a través del caballo de f3.',
        en: 'The bishop comes out before ...e6 and pressures d4 through the f3 knight.',
      },
    },
  },
};

const SL = 'd4 d5 c4 c6';
const SL_CZ = `${SL} Nf3 Nf6 Nc3 dxc4 a4 Bf5`;

export const slav: OpeningSpec = {
  id: 'slav-defence',
  name: { es: 'Defensa Eslava', en: 'Slav Defence' },
  eco: 'D10-D19',
  side: 'black',
  description: {
    es: 'Las negras defienden d5 con ...c6, lo que deja libre al alfil de c8 para salir a f5 o g4 antes de jugar ...e6.',
    en: 'Black defends d5 with ...c6, leaving the c8 bishop free to reach f5 or g4 before ...e6.',
  },
  main: `${SL_CZ} e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bd3 Bh5 e5 Nd5`,
  lines: [
    `${SL_CZ} Ne5 Nbd7 Nxc4 Qc7 g3 e5 dxe5 Nxe5 Bf4 Nfd7 Bg2 f6 O-O`,
    `${SL} Nf3 Nf6 Nc3 a6 e3 b5 b3 Bg4 Be2 Nbd7 O-O e6`,
    `${SL} Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4 Bg6 Nxg6 hxg6 Bd3 Nbd7 O-O Bd6`,
    `${SL} cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6 Qb3 Bb4 Bb5 O-O`,
  ],
  notes: {
    [SL]: {
      name: { es: 'Defensa Eslava', en: 'Slav Defence' },
      comment: {
        es: 'Defiende d5 con el peón de c sin encerrar al alfil de c8.',
        en: 'Defends d5 with the c-pawn without shutting in the c8 bishop.',
      },
    },
    [`${SL} Nf3 Nf6 Nc3 dxc4`]: {
      comment: {
        es: 'Toma el peón y amenaza conservarlo con ...b5.',
        en: 'Takes the pawn and threatens to hold it with ...b5.',
      },
    },
    [`${SL} Nf3 Nf6 Nc3 dxc4 a4`]: {
      name: { es: 'Variante Alapin', en: 'Alapin Variation' },
      comment: {
        es: 'Impide ...b5; a cambio debilita la casilla b4.',
        en: 'Stops ...b5, at the cost of weakening b4.',
      },
    },
    [SL_CZ]: {
      name: { es: 'Variante Checa', en: 'Czech Variation' },
      comment: {
        es: 'El alfil sale antes de ...e6: la gran ventaja de la Eslava.',
        en: "The bishop gets out before ...e6: the Slav's great advantage.",
      },
    },
    [`${SL_CZ} e3 e6 Bxc4 Bb4 O-O`]: {
      name: { es: 'Variante Holandesa', en: 'Dutch Variation' },
      comment: {
        es: 'Las blancas enrocan y preparan De2 y e4.',
        en: 'White castles and prepares Qe2 and e4.',
      },
    },
    [`${SL_CZ} e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4`]: {
      comment: {
        es: 'Las blancas consiguen e4, pero las negras presionan el centro con las piezas.',
        en: 'White achieves e4, but Black presses the centre with pieces.',
      },
    },
    [`${SL_CZ} e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bd3 Bh5 e5 Nd5`]: {
      comment: {
        es: 'El caballo se instala en d5, una casilla fuerte delante del peón bloqueado.',
        en: 'The knight settles on d5, a strong square in front of the blocked pawn.',
      },
    },
    [`${SL_CZ} Ne5`]: {
      name: { es: 'Ataque Krause', en: 'Krause Attack' },
      comment: {
        es: 'Busca recuperar c4 con el caballo y jugar f3 y e4.',
        en: 'Aims to regain c4 with the knight and play f3 and e4.',
      },
    },
    [`${SL} Nf3 Nf6 Nc3 a6`]: {
      name: { es: 'Variante Chebanenko', en: 'Chebanenko Variation' },
      comment: {
        es: 'Prepara ...b5 y deja abiertas varias opciones para el alfil de c8.',
        en: 'Prepares ...b5 and keeps several options open for the c8 bishop.',
      },
    },
    [`${SL} Nf3 Nf6 e3`]: {
      name: { es: 'Variante Tranquila', en: 'Quiet Variation' },
      comment: {
        es: 'Protege c4 pero encierra al alfil de c1.',
        en: 'Protects c4 but shuts in the c1 bishop.',
      },
    },
    [`${SL} Nf3 Nf6 e3 Bf5`]: {
      name: { es: 'Defensa Schallopp', en: 'Schallopp Defence' },
      comment: {
        es: 'Desarrolla el alfil antes de cerrar con ...e6.',
        en: 'Develops the bishop before closing the chain with ...e6.',
      },
    },
    [`${SL} Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4`]: {
      comment: {
        es: 'Persigue al alfil para conseguir la pareja de alfiles.',
        en: 'Chases the bishop to win the bishop pair.',
      },
    },
    [`${SL} cxd5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: 'Estructura simétrica: las blancas conservan una ligera iniciativa gracias al primer movimiento.',
        en: 'A symmetrical structure: White keeps a slight initiative thanks to the first move.',
      },
    },
    [`${SL} cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6 Qb3 Bb4`]: {
      name: { es: 'Variante Trifunovic', en: 'Trifunovic Variation' },
      comment: {
        es: 'Responde a la presión sobre b7 con contrajuego sobre c3.',
        en: 'Meets the pressure on b7 with counterplay against c3.',
      },
    },
  },
};

const LON = 'd4 d5 Nf3 Nf6 Bf4';

export const london: OpeningSpec = {
  id: 'london-system',
  name: { es: 'Sistema Londres', en: 'London System' },
  eco: 'D02',
  side: 'white',
  description: {
    es: 'Sistema de las blancas basado en Af4, e3, c3 y Cbd2: una estructura sólida que se juega casi contra cualquier defensa, con menos teoría que el Gambito de Dama.',
    en: "A White system built on Bf4, e3, c3 and Nbd2: a solid structure that works against almost any defence, with less theory than the Queen's Gambit.",
  },
  main: `${LON} c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 Ne5 Bb7 O-O Qc7 f4`,
  lines: [
    `${LON} c5 e3 Qb6 Nc3 c4 Rb1 Bf5`,
    `${LON} e6 e3 Bd6 Bg3 O-O Bd3 c5 c3 Nc6 Nbd2 b6`,
    `${LON} Bf5 e3 e6 c4 Bb4+ Nc3 O-O`,
    'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3',
    'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O Be2 d6 h3 c5 c3',
  ],
  notes: {
    [LON]: {
      name: { es: 'Sistema Londres', en: 'London System' },
      comment: {
        es: 'El alfil sale antes de e3; las blancas montan la misma estructura casi contra cualquier defensa.',
        en: 'The bishop comes out before e3; White sets up the same structure against almost anything.',
      },
    },
    [`${LON} c5 e3`]: {
      comment: {
        es: 'Estructura típica: e3, c3, Cbd2 y Ad3, sólida y fácil de jugar.',
        en: 'The typical setup: e3, c3, Nbd2 and Bd3, solid and easy to play.',
      },
    },
    [`${LON} c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3`]: {
      comment: {
        es: 'Mantiene el alfil en su diagonal en lugar de permitir un cambio favorable a las negras.',
        en: 'Keeps the bishop on its diagonal instead of allowing a trade that suits Black.',
      },
    },
    [`${LON} c5 e3 Nc6 Nbd2 e6 c3 Bd6 Bg3 O-O Bd3 b6 Ne5`]: {
      comment: {
        es: 'El caballo se instala en e5; con f4 las blancas preparan un ataque en el flanco de rey.',
        en: 'The knight settles on e5; with f4 White prepares a kingside attack.',
      },
    },
    [`${LON} c5 e3 Qb6`]: {
      comment: {
        es: 'Ataca b2, que queda débil tras la salida del alfil de c1.',
        en: 'Hits b2, which is weak once the c1 bishop has left.',
      },
    },
    [`${LON} c5 e3 Qb6 Nc3`]: {
      name: { es: 'Variante del Peón Envenenado', en: 'Poisoned Pawn Variation' },
      comment: {
        es: 'Las blancas ofrecen b2: tomarlo con la dama es arriesgado por Cb5 y Tb1.',
        en: 'White offers b2: taking it with the queen is risky because of Nb5 and Rb1.',
      },
    },
    [`${LON} Bf5`]: {
      comment: {
        es: 'Las negras copian la idea y desarrollan su alfil fuera de la cadena.',
        en: 'Black copies the idea and develops the bishop outside the chain.',
      },
    },
    'd4 d5 Bf4': {
      comment: {
        es: 'Orden moderno: el alfil sale en la segunda jugada, antes de Cf3.',
        en: 'The modern move order: the bishop comes out on move two, before Nf3.',
      },
    },
    'd4 d5 Bf4 c5': {
      comment: {
        es: 'Golpe inmediato contra d4, aprovechando que b2 ha perdido la protección del alfil.',
        en: 'An immediate strike at d4, exploiting the fact that b2 has lost the bishop’s protection.',
      },
    },
    'd4 Nf6 Nf3 g6 Bf4': {
      comment: {
        es: 'Contra la India de Rey, las blancas mantienen el mismo esquema y evitan la teoría principal.',
        en: "Against the King's Indian, White keeps the same setup and avoids main-line theory.",
      },
    },
  },
};

// ---------------------------------------------------------------- Indian defences

const KID = 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6';
const KID_CL = `${KID} Nf3 O-O Be2 e5`;
const KID_MDP = `${KID_CL} O-O Nc6 d5 Ne7`;

export const kingsIndian: OpeningSpec = {
  id: 'kings-indian-defence',
  name: { es: 'Defensa India de Rey', en: "King's Indian Defence" },
  eco: 'E60-E99',
  side: 'black',
  description: {
    es: 'Las negras ceden el centro al principio para atacarlo después con ...e5 o ...c5. En las líneas cerradas cada bando ataca en un flanco distinto.',
    en: 'Black concedes the centre early, planning to strike at it with ...e5 or ...c5. In the closed lines each side attacks on a different wing.',
  },
  main: `${KID_MDP} Ne1 Nd7 Nd3 f5 Bd2 Nf6 f3 f4 g4 g5`,
  lines: [
    `${KID_MDP} Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5`,
    `${KID_MDP} b4 Nh5 Re1 f5 Ng5 Nf6`,
    `${KID_CL} d5 a5 Bg5 h6 Bh4 Na6`,
    `${KID_CL} dxe5 dxe5 Qxd8 Rxd8 Bg5 Re8`,
    `${KID} f3 O-O Be3 e5 Nge2 c6 d5 cxd5 cxd5 Nbd7`,
    `${KID} f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Re8`,
  ],
  notes: {
    [KID]: {
      name: { es: 'Variante Normal', en: 'Normal Variation' },
      comment: {
        es: 'Las negras permiten un gran centro blanco para atacarlo después con ...e5 o ...c5.',
        en: 'Black allows a big white centre, planning to attack it later with ...e5 or ...c5.',
      },
    },
    [KID_CL]: {
      name: { es: 'Variante Ortodoxa', en: 'Orthodox Variation' },
      comment: {
        es: 'Golpe central clásico: las negras disputan d4 con un peón.',
        en: 'The classical central strike: Black contests d4 with a pawn.',
      },
    },
    [`${KID_CL} O-O Nc6`]: {
      name: { es: 'Defensa Aronin-Taimanov', en: 'Aronin–Taimanov Defence' },
      comment: {
        es: 'Presiona d4 y obliga a las blancas a cerrar el centro.',
        en: 'Pressures d4 and forces White to close the centre.',
      },
    },
    [KID_MDP]: {
      comment: {
        es: 'Centro cerrado: las blancas atacarán en el flanco de dama y las negras en el de rey con ...f5.',
        en: 'A closed centre: White attacks on the queenside and Black on the kingside with ...f5.',
      },
    },
    [`${KID_MDP} Ne1`]: {
      name: { es: 'Sistema Clásico', en: 'Classical System' },
      comment: {
        es: 'El caballo se dirige a d3 para apoyar c5 y vigilar f4.',
        en: 'The knight heads for d3 to support c5 and watch f4.',
      },
    },
    [`${KID_MDP} Ne1 Nd7`]: {
      comment: {
        es: 'El caballo deja paso al peón de f para la ruptura ...f5.',
        en: 'The knight makes way for the ...f5 break.',
      },
    },
    [`${KID_MDP} Ne1 Nd7 Nd3 f5 Bd2 Nf6 f3 f4`]: {
      comment: {
        es: 'Las negras cierran el flanco de rey y preparan ...g5-g4 para atacar.',
        en: 'Black locks the kingside and prepares ...g5-g4 to attack.',
      },
    },
    [`${KID_MDP} Ne1 Nd7 Nd3 f5 Bd2 Nf6 f3 f4 g4`]: {
      comment: {
        es: 'Las blancas frenan el avance de los peones negros en el flanco de rey.',
        en: "White puts a brake on Black's kingside pawn advance.",
      },
    },
    [`${KID_MDP} b4`]: {
      name: { es: 'Ataque de la Bayoneta', en: 'Bayonet Attack' },
      comment: {
        es: 'Ataque rápido en el flanco de dama antes de que las negras se organicen.',
        en: 'A fast queenside attack before Black gets organised.',
      },
    },
    [`${KID_MDP} b4 Nh5`]: {
      comment: {
        es: 'El caballo deja paso a ...f5 y vigila f4.',
        en: 'The knight makes way for ...f5 and watches f4.',
      },
    },
    [`${KID_MDP} b4 Nh5 Re1`]: {
      name: { es: 'Línea Sokolov', en: "Sokolov's Line" },
    },
    [`${KID_CL} d5`]: {
      name: { es: 'Variante Petrosian', en: 'Petrosian Variation' },
      comment: {
        es: 'Cierra el centro de inmediato y prepara Ag5 para clavar el caballo.',
        en: 'Closes the centre at once and prepares Bg5 to pin the knight.',
      },
    },
    [`${KID_CL} d5 a5`]: {
      name: { es: 'Defensa Stein', en: 'Stein Defence' },
      comment: {
        es: 'Frena la expansión blanca con b4 en el flanco de dama.',
        en: "Stops White's queenside expansion with b4.",
      },
    },
    [`${KID_CL} dxe5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: 'Cambio de damas temprano: las blancas buscan un final cómodo, pero las negras igualan sin grandes problemas.',
        en: 'An early queen trade: White hopes for a comfortable endgame, but Black equalises without much trouble.',
      },
    },
    [`${KID} f3`]: {
      name: { es: 'Variante Sämisch', en: 'Sämisch Variation' },
      comment: {
        es: 'Refuerza e4 y prepara Ae3, Dd2 y un posible ataque con g4 y h4.',
        en: 'Reinforces e4 and prepares Be3, Qd2 and a possible attack with g4 and h4.',
      },
    },
    [`${KID} f3 O-O Be3 e5`]: {
      name: { es: 'Variante Sämisch, línea ortodoxa', en: 'Sämisch Variation, Orthodox Variation' },
      comment: {
        es: 'La ruptura central clásica también contra la Sämisch.',
        en: 'The classical central break, this time against the Sämisch.',
      },
    },
    [`${KID} f3 O-O Be3 e5 Nge2 c6 d5 cxd5`]: {
      name: {
        es: 'Sämisch cerrada, línea principal',
        en: 'Sämisch Variation, Closed Variation, Main Line',
      },
      comment: {
        es: 'Abre la columna c para el contrajuego negro en el flanco de dama.',
        en: "Opens the c-file for Black's queenside counterplay.",
      },
    },
    [`${KID} f4`]: {
      name: { es: 'Ataque de los Cuatro Peones', en: 'Four Pawns Attack' },
      comment: {
        es: 'Cuatro peones en el centro: mucho espacio, pero también objetivos para el contraataque negro.',
        en: "Four central pawns: lots of space, but also targets for Black's counterattack.",
      },
    },
    [`${KID} f4 O-O Nf3 c5 d5 e6`]: {
      comment: {
        es: 'Las negras atacan la cadena de peones y abren la columna e.',
        en: 'Black attacks the pawn chain and opens the e-file.',
      },
    },
  },
};

const NI = 'd4 Nf6 c4 e6 Nc3 Bb4';
const NI_RUB = `${NI} e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3`;

export const nimzoIndian: OpeningSpec = {
  id: 'nimzo-indian-defence',
  name: { es: 'Defensa Nimzoindia', en: 'Nimzo-Indian Defence' },
  eco: 'E20-E59',
  side: 'black',
  description: {
    es: 'Con 3...Ab4 las negras clavan el caballo de c3 para impedir e4, y a menudo cambian el alfil por el caballo para dañar la estructura blanca.',
    en: "With 3...Bb4 Black pins the c3 knight to stop e4, often trading bishop for knight to damage White's pawn structure.",
  },
  main: `${NI_RUB} dxc4 Bxc4 Qc7 Bd3 e5 Qc2 Re8`,
  lines: [
    `${NI} e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6`,
    `${NI} Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6 Nf3 Nbd7`,
    `${NI} Qc2 d5 cxd5 exd5 Bg5 h6 Bh4 c5 dxc5 g5 Bg3 Ne4`,
    `${NI} Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5`,
    `${NI} a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8`,
  ],
  notes: {
    [NI]: {
      name: { es: 'Defensa Nimzoindia', en: 'Nimzo-Indian Defence' },
      comment: {
        es: 'Clava el caballo de c3 para impedir e4; las negras están dispuestas a ceder el alfil a cambio de dañar la estructura blanca.',
        en: "Pins the c3 knight to stop e4; Black is ready to give up the bishop to damage White's structure.",
      },
    },
    [`${NI} e3`]: {
      name: { es: 'Sistema Rubinstein', en: 'Rubinstein System' },
      comment: {
        es: 'Desarrollo sólido: las blancas completan el flanco de rey antes de decidir su plan.',
        en: 'Solid development: White completes the kingside before choosing a plan.',
      },
    },
    [`${NI} e3 O-O Bd3 d5 Nf3 c5`]: {
      name: { es: 'Sistema Gligoric', en: 'Gligoric System' },
      comment: {
        es: 'Las negras golpean en el centro con ambos peones.',
        en: 'Black strikes in the centre with both pawns.',
      },
    },
    [`${NI} e3 O-O Bd3 d5 Nf3 c5 O-O Nc6`]: {
      name: { es: 'Defensa Bernstein', en: 'Bernstein Defence' },
    },
    [NI_RUB]: {
      comment: {
        es: 'Las blancas obtienen la pareja de alfiles y un centro de peones a cambio de los peones doblados en c.',
        en: 'White gets the bishop pair and a pawn centre in exchange for doubled c-pawns.',
      },
    },
    [`${NI_RUB} dxc4 Bxc4 Qc7`]: {
      comment: {
        es: 'Prepara ...e5 para disputar el centro.',
        en: 'Prepares ...e5 to contest the centre.',
      },
    },
    [`${NI} e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6`]: {
      name: { es: 'Variante Hübner', en: 'Hübner Variation' },
      comment: {
        es: 'Estructura cerrada con ...e5: los caballos negros luchan contra los alfiles blancos.',
        en: "A closed structure with ...e5: Black's knights take on White's bishops.",
      },
    },
    [`${NI} Qc2`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'Recapturará en c3 con la dama para evitar los peones doblados.',
        en: 'White will recapture on c3 with the queen to avoid doubled pawns.',
      },
    },
    [`${NI} Qc2 O-O a3 Bxc3+ Qxc3 b6`]: {
      name: { es: 'Defensa Keres', en: 'Keres Defence' },
      comment: {
        es: 'El alfil irá a b7 para controlar e4.',
        en: 'The bishop goes to b7 to control e4.',
      },
    },
    [`${NI} Qc2 d5`]: {
      name: { es: 'Variante Noa', en: 'Noa Variation' },
      comment: {
        es: 'Golpe central inmediato.',
        en: 'An immediate central strike.',
      },
    },
    [`${NI} Nf3`]: {
      name: { es: 'Variante de los Tres Caballos', en: 'Three Knights Variation' },
      comment: {
        es: 'Desarrollo flexible que mantiene abiertas varias estructuras.',
        en: 'Flexible development that keeps several structures open.',
      },
    },
    [`${NI} Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5`]: {
      name: { es: 'Híbrido Inglés', en: 'English Hybrid' },
      comment: {
        es: 'Posición abierta de tipo Inglesa: el alfil de g2 presiona la gran diagonal.',
        en: 'An open, English-like position: the g2 bishop presses the long diagonal.',
      },
    },
    [`${NI} a3`]: {
      name: { es: 'Variante Sämisch', en: 'Sämisch Variation' },
      comment: {
        es: 'Fuerza el cambio en c3: las blancas obtienen la pareja de alfiles a cambio de peones doblados.',
        en: 'Forces the trade on c3: White gets the bishop pair in exchange for doubled pawns.',
      },
    },
    [`${NI} a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8`]: {
      comment: {
        es: 'Maniobra típica: el caballo evita la clavada Ag5 y prepara ...f5.',
        en: 'A typical manoeuvre: the knight sidesteps the Bg5 pin and prepares ...f5.',
      },
    },
  },
};

const GR = 'd4 Nf6 c4 g6 Nc3 d5';
const GR_EX = `${GR} cxd5 Nxd5 e4 Nxc3 bxc3 Bg7`;

export const grunfeld: OpeningSpec = {
  id: 'grunfeld-defence',
  name: { es: 'Defensa Grünfeld', en: 'Grünfeld Defence' },
  eco: 'D70-D99',
  side: 'black',
  description: {
    es: 'Las negras permiten que las blancas levanten un gran centro con e4 para atacarlo después con el alfil de g7 y ...c5. Apertura muy dinámica.',
    en: 'Black lets White build a big centre with e4 and then attacks it with the g7 bishop and ...c5. A highly dynamic opening.',
  },
  main: `${GR_EX} Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2 O-O Bg4 Bg5 h6 Be3`,
  lines: [
    `${GR_EX} Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4 f3 Na5 Bd3 cxd4 cxd4 Be6`,
    `${GR_EX} Be3 c5 Qd2 Qa5 Rc1 cxd4 cxd4 Qxd2+ Kxd2 O-O`,
    `${GR} Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 Be3 Nfd7 Qb3 c5`,
    `${GR} Bf4 Bg7 e3 c5 dxc5 Qa5 Rc1 dxc4 Bxc4 O-O Nf3 Qxc5 Bb3 Nc6 O-O Qa5`,
  ],
  notes: {
    [GR]: {
      name: { es: 'Defensa Grünfeld', en: 'Grünfeld Defence' },
      comment: {
        es: 'Las negras desafían el centro de inmediato; si las blancas lo ocupan con e4, lo atacarán con piezas y ...c5.',
        en: 'Black challenges the centre at once; if White occupies it with e4, Black attacks it with pieces and ...c5.',
      },
    },
    [`${GR} cxd5 Nxd5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
    },
    [`${GR} cxd5 Nxd5 e4 Nxc3 bxc3`]: {
      comment: {
        es: 'Las blancas consiguen un gran centro de peones; las negras lo atacarán con el alfil de g7 y ...c5.',
        en: 'White gets a big pawn centre; Black will attack it with the g7 bishop and ...c5.',
      },
    },
    [`${GR_EX} Nf3`]: {
      name: { es: 'Variante del Cambio Moderna', en: 'Modern Exchange Variation' },
    },
    [`${GR_EX} Nf3 c5 Rb1`]: {
      comment: {
        es: 'La torre sale de la diagonal del alfil de g7 y presiona b7.',
        en: 'The rook leaves the g7 bishop’s diagonal and presses b7.',
      },
    },
    [`${GR_EX} Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ Bd2 Qxa2`]: {
      comment: {
        es: 'Las negras capturan el peón de a2 a cambio de tiempo; las blancas buscan compensación en el centro.',
        en: 'Black grabs the a2 pawn at the cost of time; White seeks compensation in the centre.',
      },
    },
    [`${GR_EX} Bc4`]: {
      name: { es: 'Variante del Cambio Clásica', en: 'Classical Exchange Variation' },
      comment: {
        es: 'El alfil apunta a f7 y el caballo irá a e2 para evitar la clavada ...Ag4.',
        en: 'The bishop eyes f7 and the knight goes to e2 to avoid the ...Bg4 pin.',
      },
    },
    [`${GR_EX} Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4 f3 Na5`]: {
      comment: {
        es: 'Las negras presionan d4 y atacan el alfil de c4.',
        en: 'Black presses d4 and attacks the c4 bishop.',
      },
    },
    [`${GR_EX} Be3`]: {
      comment: {
        es: 'Refuerza d4 y prepara Dd2 y Tc1.',
        en: 'Reinforces d4 and prepares Qd2 and Rc1.',
      },
    },
    [`${GR} Nf3 Bg7 Qb3`]: {
      name: { es: 'Variante Rusa', en: 'Russian Variation' },
      comment: {
        es: 'Presiona d5 y obliga a las negras a tomar en c4.',
        en: 'Pressures d5 and forces Black to take on c4.',
      },
    },
    [`${GR} Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4`]: {
      name: { es: 'Variante Smyslov', en: 'Smyslov Variation' },
      comment: {
        es: 'Presiona d4 mediante la clavada del caballo de f3.',
        en: 'Pressures d4 by pinning the f3 knight.',
      },
    },
    [`${GR} Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 Be3 Nfd7 Qb3 c5`]: {
      name: { es: 'Variante Yugoslava', en: 'Yugoslav Variation' },
    },
    [`${GR} Bf4`]: {
      name: { es: 'Ataque Brinckmann', en: 'Brinckmann Attack' },
      comment: {
        es: 'Desarrollo activo del alfil; las negras responden con ...c5 y ...Da5 para recuperar el peón con juego activo.',
        en: 'Active bishop development; Black replies ...c5 and ...Qa5 to regain the pawn with active play.',
      },
    },
  },
};

// ---------------------------------------------------------------- Flank

const ENG_4N = 'c4 e5 Nc3 Nf6 Nf3 Nc6';

export const english: OpeningSpec = {
  id: 'english-opening',
  name: { es: 'Apertura Inglesa', en: 'English Opening' },
  eco: 'A10-A39',
  side: 'white',
  description: {
    es: 'Las blancas controlan d5 desde el flanco con 1.c4, a menudo con fianchetto del alfil de rey. Juego posicional y flexible que puede transponer a muchas aperturas.',
    en: 'White controls d5 from the flank with 1.c4, often with a kingside fianchetto. Flexible positional play that can transpose into many openings.',
  },
  main: `${ENG_4N} g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O a3 Be6 b4 a5 b5 Nd4`,
  lines: [
    'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4 Nge7 Nge2 O-O O-O f5',
    'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O d4 cxd4 Nxd4 Nxd4 Qxd4 d6 Qd3',
    'c4 Nf6 Nc3 e6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 d4 c5 Nf3',
    'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3',
  ],
  notes: {
    c4: {
      name: { es: 'Apertura Inglesa', en: 'English Opening' },
      comment: {
        es: 'Controla d5 desde el flanco; las blancas suelen combinarlo con un fianchetto en g2.',
        en: 'Controls d5 from the flank; White often combines it with a fianchetto on g2.',
      },
    },
    'c4 e5': {
      name: { es: 'Variante inglesa de rey (1...e5)', en: "King's English Variation" },
      comment: {
        es: 'Las negras ocupan el centro con el peón de rey.',
        en: "Black occupies the centre with the king's pawn.",
      },
    },
    'c4 e5 Nc3': {
      name: { es: 'Siciliana invertida', en: 'Reversed Sicilian' },
      comment: {
        es: 'Una Siciliana con los colores cambiados y un tiempo más para las blancas.',
        en: 'A Sicilian with colours reversed and an extra tempo for White.',
      },
    },
    [ENG_4N]: {
      name: { es: 'Variante de los Cuatro Caballos', en: 'Four Knights Variation' },
    },
    [`${ENG_4N} g3`]: {
      comment: {
        es: 'Fianchetto: el alfil de g2 presionará d5 y b7.',
        en: 'A fianchetto: the g2 bishop will press d5 and b7.',
      },
    },
    [`${ENG_4N} g3 d5 cxd5 Nxd5`]: {
      comment: {
        es: 'Estructura de Dragón invertido: las blancas juegan un Dragón con un tiempo más.',
        en: 'A reversed Dragon structure: White plays a Dragon with an extra tempo.',
      },
    },
    [`${ENG_4N} g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O a3`]: {
      comment: {
        es: 'Prepara b4-b5 para expulsar al caballo de c6 y ganar espacio en el flanco de dama.',
        en: 'Prepares b4-b5 to drive away the c6 knight and gain queenside space.',
      },
    },
    'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3': {
      name: { es: 'Sistema cerrado', en: 'Closed System' },
      comment: {
        es: 'Juego lento: las blancas maniobran antes de romper con b4 o f4.',
        en: 'Slow play: White manoeuvres before breaking with b4 or f4.',
      },
    },
    'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4': {
      name: { es: 'Sistema Botvinnik', en: 'Botvinnik System' },
      comment: {
        es: 'Los peones de c4 y e4 controlan d5; el plan es Cge2 y f4.',
        en: 'The c4 and e4 pawns control d5; the plan is Nge2 and f4.',
      },
    },
    'c4 c5': {
      name: { es: 'Variante Simétrica', en: 'Symmetrical Variation' },
      comment: {
        es: 'Las negras copian la jugada y disputan d4.',
        en: 'Black mirrors the move and contests d4.',
      },
    },
    'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O d4': {
      comment: {
        es: 'Las blancas rompen la simetría abriendo el centro.',
        en: 'White breaks the symmetry by opening the centre.',
      },
    },
    'c4 Nf6': {
      name: { es: 'Defensa Angloindia', en: 'Anglo-Indian Defence' },
    },
    'c4 Nf6 Nc3 e6 e4': {
      name: { es: 'Variante Mikenas-Carls', en: 'Mikenas–Carls Variation' },
      comment: {
        es: 'Ocupa el centro de inmediato e invita a ...d5 y e5.',
        en: 'Occupies the centre at once, inviting ...d5 and e5.',
      },
    },
    'c4 e6': {
      name: { es: 'Defensa Agincourt', en: 'Agincourt Defence' },
      comment: {
        es: 'Las negras preparan ...d5 con una estructura de tipo Gambito de Dama.',
        en: "Black prepares ...d5 with a Queen's Gambit-style structure.",
      },
    },
    'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O': {
      name: { es: 'Neocatalana rehusada', en: 'Neo-Catalan Declined' },
    },
  },
};

export const d4Openings = [qgd, qga, slav, london, kingsIndian, nimzoIndian, grunfeld, english];
