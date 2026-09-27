import type { OpeningSpec } from './tree-builder.ts';

// ---------------------------------------------------------------- 1.e4 e5

const SC = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4';
const MIESES = `${SC} Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4`;

export const scotch: OpeningSpec = {
  id: 'scotch-game',
  name: { es: 'Apertura Escocesa', en: 'Scotch Game' },
  eco: 'C44-C45',
  side: 'white',
  description: {
    es: 'Las blancas abren el centro con 3.d4 y cambian su peón de d por el de e5: juego de piezas libre y algo más de espacio.',
    en: 'White opens the centre with 3.d4 and trades the d-pawn for Black’s e-pawn: free piece play and a little extra space.',
  },
  main: `${MIESES} Ba6 b3 g6 g3 Bg7 Bb2 O-O Bg2 Rfe8 O-O`,
  lines: [
    `${MIESES} Nb6 Nd2 Qe6 b3 a5 Bb2 Bb4 a3 Bxd2+ Qxd2 d5`,
    `${SC} Bc5 Nxc6 Qf6 Qd2 dxc6 Nc3 Be6 Na4 Rd8 Bd3 Bd4 O-O Ne7 c3 Bb6`,
    `${SC} Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 O-O d6 f3 O-O`,
    `${SC} Qh4 Nc3 Bb4 Be2 Qxe4 Nb5 Bxc3+ bxc3 Kd8 O-O Nf6`,
    `e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5`,
  ],
  notes: {
    'e4 e5 Nf3 Nc6 d4': {
      name: { es: 'Apertura Escocesa', en: 'Scotch Game' },
      comment: {
        es: 'Las blancas atacan e5 de inmediato y abren el centro en la tercera jugada.',
        en: 'White strikes at e5 at once and opens the centre on move three.',
      },
    },
    [SC]: {
      comment: {
        es: 'El caballo recupera el peón en una casilla central; las negras intentarán hostigarlo con sus piezas.',
        en: 'The knight regains the pawn on a central square; Black will try to harass it with pieces.',
      },
    },
    [`${SC} Nf6`]: {
      name: { es: 'Variante Schmidt', en: 'Schmidt Variation' },
      comment: {
        es: 'Desarrolla y ataca el peón de e4.',
        en: 'Develops while attacking the e4 pawn.',
      },
    },
    [`${SC} Nf6 Nxc6 bxc6 e5`]: {
      name: { es: 'Variante Mieses', en: 'Mieses Variation' },
      comment: {
        es: 'Gana espacio y expulsa al caballo de f6 de su mejor casilla.',
        en: 'Gains space and drives the f6 knight from its best square.',
      },
    },
    [`${SC} Nf6 Nxc6 bxc6 e5 Qe7`]: {
      comment: {
        es: 'Clava el peón de e5 contra el rey y obliga a De2.',
        en: 'Pins the e5 pawn against the king and forces Qe2.',
      },
    },
    [MIESES]: {
      comment: {
        es: 'Expulsa al caballo de d5, aunque la dama de e2 sigue tapando al alfil de f1.',
        en: 'Kicks the d5 knight, although the queen on e2 still blocks the f1 bishop.',
      },
    },
    [`${MIESES} Ba6`]: {
      comment: {
        es: 'Clava el peón de c4 contra la dama y mantiene el caballo en d5.',
        en: 'Pins the c4 pawn against the queen and keeps the knight on d5.',
      },
    },
    [`${MIESES} Ba6 b3 g6 g3`]: {
      comment: {
        es: 'Como la dama tapa al alfil de f1, las blancas lo desarrollan en fianchetto y enrocan.',
        en: 'With the queen blocking the f1 bishop, White fianchettoes it and castles.',
      },
    },
    [`${MIESES} Nb6`]: {
      comment: {
        es: 'Retirada más tranquila: el caballo vigila c4 y d5.',
        en: 'A calmer retreat: the knight keeps an eye on c4 and d5.',
      },
    },
    [`${SC} Bc5`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'El alfil ataca al caballo de d4 y obliga a las blancas a decidir.',
        en: 'The bishop hits the d4 knight and forces White to decide.',
      },
    },
    [`${SC} Bc5 Nxc6 Qf6`]: {
      name: { es: 'Variante Intermezzo', en: 'Intermezzo Variation' },
      comment: {
        es: 'Jugada intermedia: amenaza mate en f2 antes de recapturar en c6.',
        en: 'An in-between move: it threatens mate on f2 before recapturing on c6.',
      },
    },
    [`${SC} Bc5 Be3`]: {
      comment: {
        es: 'Refuerza el caballo de d4 y ofrece cambiar el alfil activo de c5.',
        en: 'Supports the d4 knight and offers to trade Black’s active bishop.',
      },
    },
    [`${SC} Qh4`]: {
      name: { es: 'Variante Steinitz', en: 'Steinitz Variation' },
      comment: {
        es: 'Ataca e4 de inmediato, pero la dama sale muy pronto y puede ser perseguida.',
        en: 'Attacks e4 at once, but the early queen sortie can be chased.',
      },
    },
    [`${SC} Qh4 Nc3 Bb4 Be2 Qxe4 Nb5`]: {
      comment: {
        es: 'Las blancas han entregado el peón de e4 a cambio de desarrollo y presión sobre c7.',
        en: 'White has given the e4 pawn for development and pressure on c7.',
      },
    },
    'e4 e5 Nf3 Nc6 d4 exd4 Bc4': {
      name: { es: 'Gambito Escocés', en: 'Scotch Gambit' },
      comment: {
        es: 'Gambito: en lugar de recuperar el peón, las blancas desarrollan el alfil apuntando a f7.',
        en: 'A gambit: instead of regaining the pawn, White develops the bishop towards f7.',
      },
    },
    'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5': {
      comment: {
        es: 'Golpe central: las negras atacan al alfil antes de que e5 las incomode.',
        en: 'A central strike: Black attacks the bishop before e5 becomes a nuisance.',
      },
    },
  },
};

const PE = 'e4 e5 Nf3 Nf6';
const PE_CL = `${PE} Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3`;

export const petrov: OpeningSpec = {
  id: 'petrov-defence',
  name: { es: 'Defensa Petrov (Rusa)', en: "Petrov's Defence (Russian Game)" },
  eco: 'C42-C43',
  side: 'black',
  description: {
    es: 'Las negras contraatacan e4 en lugar de defender e5: una defensa simétrica y muy sólida, apreciada por su fiabilidad al máximo nivel.',
    en: 'Black counterattacks e4 instead of defending e5: a symmetrical, very solid defence valued for its reliability at top level.',
  },
  main: `${PE_CL} Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5 a3 Nxc3 bxc3 Nc6 Re1 Re8 Bf4`,
  lines: [
    `${PE_CL} Bd6 O-O O-O c4 c6 Re1 Bf5`,
    `${PE} Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7`,
    `${PE} Nxe5 d6 Nf3 Nxe4 Qe2 Qe7 d3 Nf6 Bg5 Qxe2+ Bxe2 Be7 Nc3 c6`,
    `${PE} d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6`,
  ],
  notes: {
    [PE]: {
      name: { es: 'Defensa Petrov', en: "Petrov's Defence" },
      comment: {
        es: 'Respuesta simétrica: en lugar de defender e5, las negras atacan e4.',
        en: 'The symmetrical reply: instead of defending e5, Black attacks e4.',
      },
    },
    [`${PE} Nxe5 d6`]: {
      comment: {
        es: 'Primero se expulsa al caballo: tomar e4 de inmediato permite De2 y las negras pasan apuros para igualar.',
        en: 'Kick the knight first: taking on e4 at once allows Qe2, and Black struggles to equalise.',
      },
    },
    [`${PE} Nxe5 d6 Nf3 Nxe4`]: {
      comment: {
        es: 'Las negras recuperan el peón con una posición simétrica y sólida.',
        en: 'Black regains the pawn with a symmetrical, solid position.',
      },
    },
    [`${PE} Nxe5 d6 Nf3 Nxe4 d4`]: {
      name: { es: 'Ataque Clásico', en: 'Classical Attack' },
      comment: {
        es: 'Gana espacio en el centro y prepara Ad3 para desafiar al caballo de e4.',
        en: 'Gains central space and prepares Bd3 to challenge the e4 knight.',
      },
    },
    [`${PE_CL} Nc6`]: {
      name: { es: 'Variante Mason-Showalter', en: 'Mason–Showalter Variation' },
      comment: {
        es: 'Desarrolla y prepara ...Ae7 y ...0-0 manteniendo el caballo en e4.',
        en: 'Develops and prepares ...Be7 and ...O-O while keeping the knight on e4.',
      },
    },
    [`${PE_CL} Nc6 O-O Be7 c4`]: {
      name: { es: 'Variante Jaenisch', en: 'Jaenisch Variation' },
      comment: {
        es: 'Ataca d5, el apoyo del caballo de e4.',
        en: 'Hits d5, the support of the e4 knight.',
      },
    },
    [`${PE_CL} Nc6 O-O Be7 c4 Nb4`]: {
      comment: {
        es: 'El caballo ataca al alfil de d3, que apuntaba al enroque negro.',
        en: 'The knight attacks the d3 bishop, which was aiming at Black’s king.',
      },
    },
    [`${PE_CL} Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5 a3 Nxc3 bxc3 Nc6`]: {
      comment: {
        es: 'Posición típica de la línea principal: las blancas presionan con Te1 y Af4; las negras siguen sólidas.',
        en: 'A typical main-line position: White presses with Re1 and Bf4 while Black stays solid.',
      },
    },
    [`${PE_CL} Bd6`]: {
      name: { es: 'Variante Marshall', en: 'Marshall Variation' },
      comment: {
        es: 'Desarrollo más activo del alfil, que apunta hacia el flanco de rey blanco.',
        en: 'A more active bishop development, eyeing White’s kingside.',
      },
    },
    [`${PE} Nxe5 d6 Nf3 Nxe4 Nc3`]: {
      name: { es: 'Ataque Nimzowitsch', en: 'Nimzowitsch Attack' },
      comment: {
        es: 'Fuerza el cambio de caballos; tras dxc3 las blancas suelen enrocar largo y atacar.',
        en: 'Forces a knight trade; after dxc3 White usually castles long and attacks.',
      },
    },
    [`${PE} Nxe5 d6 Nf3 Nxe4 Qe2`]: {
      name: { es: 'Ataque Cozio', en: 'Cozio Attack' },
      comment: {
        es: 'Clava el caballo y fuerza el cambio de damas: una línea muy tranquila.',
        en: 'Pins the knight and forces a queen trade: a very quiet line.',
      },
    },
    [`${PE} d4`]: {
      name: { es: 'Ataque Moderno', en: 'Modern Attack' },
      comment: {
        es: 'Abre el centro de inmediato en lugar de capturar en e5.',
        en: 'Opens the centre at once instead of capturing on e5.',
      },
    },
    [`${PE} d4 Nxe4 Bd3 d5`]: {
      comment: {
        es: 'Apoya el caballo de e4 y mantiene una posición sólida.',
        en: 'Supports the e4 knight and keeps a solid position.',
      },
    },
  },
};

const KG = 'e4 e5 f4';
const KGA = `${KG} exf4 Nf3`;

export const kingsGambit: OpeningSpec = {
  id: 'kings-gambit',
  name: { es: 'Gambito de Rey', en: "King's Gambit" },
  eco: 'C30-C39',
  side: 'white',
  description: {
    es: 'Las blancas entregan el peón de f para desviar el de e5, abrir la columna f y levantar un centro con d4. Apertura romántica y agresiva: el motor la considera algo peor para las blancas, pero es teoría jugable.',
    en: 'White gives up the f-pawn to deflect the e5 pawn, open the f-file and build a centre with d4. A romantic, aggressive opening: engines rate it slightly worse for White, but it is playable theory.',
  },
  main: `${KGA} d5 exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4 Nd5 O-O Bd6 Nc3 Be6 Ne4 O-O Nxd6 Qxd6`,
  lines: [
    `${KGA} g5 h4 g4 Ne5 Nf6 d4 d6 Nd3 Nxe4 Bxf4 Bg7 c3 O-O Nd2`,
    `${KGA} d6 d4 g5 h4 g4 Ng1 Qf6 Nc3 Ne7`,
    `${KGA} Be7 Bc4 Nf6 e5 Ng4 O-O d6`,
    `${KG} exf4 Bc4 Nf6 Nc3 c6 Bb3 d5 exd5 cxd5 d4 Bd6`,
    `${KG} d5 exd5 exf4 Nf3 Nf6 Bc4 Nxd5 O-O Be7 d4 O-O`,
    `${KG} Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2`,
  ],
  notes: {
    [KG]: {
      name: { es: 'Gambito de Rey', en: "King's Gambit" },
      comment: {
        es: 'Gambito: se ofrece el peón de f para desviar el peón de e5 y abrir la columna f.',
        en: 'A gambit: White offers the f-pawn to deflect the e5 pawn and open the f-file.',
      },
    },
    [`${KG} exf4`]: {
      name: { es: 'Gambito de Rey Aceptado', en: "King's Gambit Accepted" },
      comment: {
        es: 'Las negras aceptan el peón y deben decidir si lo defienden o lo devuelven para desarrollarse.',
        en: 'Black takes the pawn and must decide whether to hold it or give it back for development.',
      },
    },
    [KGA]: {
      name: { es: 'Gambito del Caballo de Rey', en: "King's Knight's Gambit" },
      comment: {
        es: 'Impide ...Dh4+ y prepara d4 y Axf4.',
        en: 'Prevents ...Qh4+ and prepares d4 and Bxf4.',
      },
    },
    [`${KGA} d5`]: {
      name: { es: 'Defensa Moderna', en: 'Modern Defence' },
      comment: {
        es: 'Las negras golpean en el centro para abrir líneas y desarrollarse deprisa.',
        en: 'Black strikes in the centre to open lines and develop quickly.',
      },
    },
    [`${KGA} d5 exd5 Nf6`]: {
      name: { es: 'Defensa Abbazia', en: 'Abbazia Defence' },
    },
    [`${KGA} d5 exd5 Nf6 Bb5+`]: {
      comment: {
        es: 'Jaque intermedio que complica la recuperación del peón de d5.',
        en: 'An in-between check that makes it harder for Black to regain the d5 pawn.',
      },
    },
    [`${KGA} d5 exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4 Nd5`]: {
      name: { es: 'Defensa Abbazia, línea principal', en: 'Abbazia Defence, Main Line' },
      comment: {
        es: 'Las negras conservan el peón de f4 y centralizan el caballo; las blancas buscan actividad a cambio.',
        en: 'Black keeps the f4 pawn and centralises the knight; White seeks activity in return.',
      },
    },
    [`${KGA} d5 exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4 Nd5 O-O`]: {
      comment: {
        es: 'Las blancas enrocan: la torre de f1 apuntará al peón de f4.',
        en: 'White castles: the f1 rook will target the f4 pawn.',
      },
    },
    [`${KGA} g5`]: {
      comment: {
        es: 'Defiende f4 con otro peón: el planteamiento clásico y más agudo.',
        en: 'Defends f4 with another pawn: the classical and sharpest approach.',
      },
    },
    [`${KGA} g5 h4`]: {
      comment: {
        es: 'Ataca la cadena g5-f4 antes de que las negras la consoliden con ...h6 y ...Ag7.',
        en: 'Undermines the g5-f4 chain before Black can consolidate with ...h6 and ...Bg7.',
      },
    },
    [`${KGA} g5 h4 g4 Ne5`]: {
      name: { es: 'Gambito Kieseritzky', en: 'Kieseritzky Gambit' },
      comment: {
        es: 'El caballo salta al centro; las blancas atacarán g4 y f4 en cuanto puedan.',
        en: 'The knight jumps to the centre; White will go after g4 and f4.',
      },
    },
    [`${KGA} g5 h4 g4 Ne5 Nf6`]: {
      name: { es: 'Defensa Berlinesa', en: 'Berlin Defence' },
    },
    [`${KGA} d6`]: {
      name: { es: 'Defensa Fischer', en: 'Fischer Defence' },
      comment: {
        es: 'Quita la casilla e5 al caballo antes de defender f4 con ...g5.',
        en: 'Takes e5 away from the knight before defending f4 with ...g5.',
      },
    },
    [`${KGA} d6 d4 g5 h4 g4 Ng1`]: {
      comment: {
        es: 'Retirada paradójica: el caballo esquiva el ataque del peón y se reubicará por e2.',
        en: 'A paradoxical retreat: the knight dodges the pawn and will be redeployed via e2.',
      },
    },
    [`${KGA} Be7`]: {
      name: { es: 'Defensa Cunningham', en: 'Cunningham Defence' },
      comment: {
        es: 'Amenaza ...Ah4+ para incomodar al rey blanco.',
        en: 'Threatens ...Bh4+ to harass the white king.',
      },
    },
    [`${KG} exf4 Bc4`]: {
      name: { es: 'Gambito del Alfil', en: "Bishop's Gambit" },
      comment: {
        es: 'El alfil apunta a f7; las blancas aceptan un posible ...Dh4+ seguido de Rf1.',
        en: 'The bishop eyes f7; White accepts a possible ...Qh4+ followed by Kf1.',
      },
    },
    [`${KG} d5`]: {
      name: { es: 'Contragambito Falkbeer', en: 'Falkbeer Countergambit' },
      comment: {
        es: 'Las negras rehúsan el peón y contraatacan en el centro.',
        en: 'Black declines the pawn and hits back in the centre.',
      },
    },
    [`${KG} d5 exd5 exf4`]: {
      comment: {
        es: 'Ahora sí se toma en f4: la posición recuerda a la Defensa Moderna.',
        en: 'Now Black does take on f4, reaching a position similar to the Modern Defence.',
      },
    },
    [`${KG} Bc5`]: {
      name: {
        es: 'Gambito de Rey Rehusado, Variante Clásica',
        en: "King's Gambit Declined, Classical Variation",
      },
      comment: {
        es: 'El alfil controla g1 e impide el enroque corto blanco.',
        en: 'The bishop covers g1 and stops White from castling short.',
      },
    },
    [`${KG} Bc5 Nf3 d6 c3`]: {
      comment: {
        es: 'Prepara d4 para expulsar al alfil y levantar un centro fuerte.',
        en: 'Prepares d4 to kick the bishop and build a strong centre.',
      },
    },
  },
};

// ---------------------------------------------------------------- Sicilians

const DR = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6';
const YUG = `${DR} Be3 Bg7 f3 O-O Qd2 Nc6`;

export const dragon: OpeningSpec = {
  id: 'sicilian-dragon',
  name: { es: 'Defensa Siciliana, Variante del Dragón', en: 'Sicilian Defence, Dragon Variation' },
  eco: 'B70-B79',
  side: 'black',
  description: {
    es: 'Las negras colocan el alfil en fianchetto en g7 para presionar la gran diagonal. Contra el Ataque Yugoslavo se juega una carrera de ataques con enroques opuestos.',
    en: 'Black fianchettoes the bishop on g7 to rake the long diagonal. Against the Yugoslav Attack the game becomes a race of attacks with opposite-side castling.',
  },
  main: `${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1 Nc4 Bxc4 Rxc4 g4 b5`,
  lines: [
    `${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5 Bg5 Rc5`,
    `${YUG} O-O-O d5 exd5 Nxd5 Nxc6 bxc6 Bd4 Bxd4 Qxd4 Qb6`,
    `${YUG} g4 Be6 Nxe6 fxe6 O-O-O Ne5`,
    `${DR} Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6 f4 Qc8`,
    `${DR} f4 Nbd7`,
  ],
  notes: {
    'e4 c5': {
      name: { es: 'Defensa Siciliana', en: 'Sicilian Defence' },
      comment: {
        es: 'Lucha por d4 con un peón lateral y crea desequilibrio desde la primera jugada.',
        en: 'Fights for d4 with a flank pawn and creates imbalance from move one.',
      },
    },
    'e4 c5 Nf3 d6 d4 cxd4': {
      comment: {
        es: 'Cambia un peón lateral por uno central: las negras tendrán mayoría central.',
        en: 'Trades a flank pawn for a centre pawn: Black gets the central majority.',
      },
    },
    [DR]: {
      name: { es: 'Variante del Dragón', en: 'Dragon Variation' },
      comment: {
        es: 'El alfil irá a g7, desde donde presionará la gran diagonal hacia d4 y b2.',
        en: 'The bishop heads for g7, from where it rakes the long diagonal towards d4 and b2.',
      },
    },
    [`${DR} Be3 Bg7 f3`]: {
      name: { es: 'Ataque Yugoslavo', en: 'Yugoslav Attack' },
      comment: {
        es: 'Plan típico: Dd2, Ah6 para cambiar el alfil de g7, enroque largo y avance h4-h5.',
        en: 'The typical plan: Qd2, Bh6 to trade off the g7 bishop, long castling and h4-h5.',
      },
    },
    [`${YUG} Bc4`]: {
      name: { es: 'Ataque Yugoslavo, línea principal', en: 'Yugoslav Attack, Main Line' },
      comment: {
        es: 'El alfil controla d5 y apunta a f7, pero será un blanco del juego negro por la columna c.',
        en: 'The bishop controls d5 and eyes f7, but it becomes a target of Black’s play on the c-file.',
      },
    },
    [`${YUG} Bc4 Bd7 O-O-O Rc8`]: {
      comment: {
        es: 'Carrera de ataques: las blancas en el flanco de rey y las negras por la columna c.',
        en: 'A race of attacks: White on the kingside, Black down the c-file.',
      },
    },
    [`${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1`]: {
      comment: {
        es: 'Aparta al rey de la columna c y de posibles sacrificios en c3.',
        en: 'Takes the king off the c-file and away from sacrifices on c3.',
      },
    },
    [`${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1 Nc4 Bxc4 Rxc4`]: {
      comment: {
        es: 'Las negras eliminan el alfil de b3 y la torre de c4 presiona c3 y e4.',
        en: 'Black removes the b3 bishop and the c4 rook presses on c3 and e4.',
      },
    },
    [`${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1 Nc4 Bxc4 Rxc4 g4 b5`]: {
      comment: {
        es: 'Las negras lanzan los peones del flanco de dama contra el rey blanco.',
        en: 'Black throws the queenside pawns at the white king.',
      },
    },
    [`${YUG} Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5`]: {
      comment: {
        es: 'Frena el avance h4-h5 a costa de debilitar la casilla g6.',
        en: 'Halts h4-h5 at the cost of weakening g6.',
      },
    },
    [`${YUG} O-O-O`]: {
      name: { es: 'Ataque Yugoslavo, línea moderna', en: 'Yugoslav Attack, Modern Line' },
    },
    [`${YUG} O-O-O d5`]: {
      comment: {
        es: 'Rotura central inmediata: las negras abren el juego antes de que llegue el ataque blanco.',
        en: 'An immediate central break: Black opens the game before White’s attack arrives.',
      },
    },
    [`${YUG} g4`]: {
      name: { es: 'Variante Panov', en: 'Panov Variation' },
      comment: {
        es: 'Las blancas avanzan en el flanco de rey antes de decidir dónde colocar el alfil de f1.',
        en: 'White advances on the kingside before deciding where the f1 bishop belongs.',
      },
    },
    [`${DR} Be2`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'Desarrollo tranquilo y enroque corto: juego posicional sin los riesgos del Yugoslavo.',
        en: 'Quiet development and short castling: positional play without the Yugoslav’s risks.',
      },
    },
    [`${DR} f4`]: {
      name: { es: 'Variante Levenfish', en: 'Levenfish Variation' },
      comment: {
        es: 'Amenaza e5 de inmediato; ...Cbd7 controla esa casilla.',
        en: 'Threatens e5 at once; ...Nbd7 covers that square.',
      },
    },
  },
};

const SV = 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5';
const SV8 = `${SV} Ndb5 d6 Bg5 a6 Na3 b5`;

export const sveshnikov: OpeningSpec = {
  id: 'sicilian-sveshnikov',
  name: {
    es: 'Defensa Siciliana, Variante Sveshnikov',
    en: 'Sicilian Defence, Sveshnikov Variation',
  },
  eco: 'B33',
  side: 'black',
  description: {
    es: 'Las negras aceptan un agujero permanente en d5 y un peón retrasado en d6 a cambio de tiempos, espacio y piezas activas. Dinámica y muy respetada al más alto nivel.',
    en: 'Black accepts a permanent hole on d5 and a backward d6 pawn in return for time, space and active pieces. Dynamic and highly respected at top level.',
  },
  main: `${SV8} Bxf6 gxf6 Nd5 f5 c3 Bg7 exf5 Bxf5 Nc2 O-O Nce3 Be6 Bd3 f5 O-O`,
  lines: [
    `${SV8} Bxf6 gxf6 Nd5 f5 Bd3 Be6 O-O Bxd5 exd5 Ne7 c3 Bg7`,
    `${SV8} Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5 a4 bxa4 Rxa4 a5 Bc4 Rb8 b3 Kh8`,
    `${SV} Ndb5 d6 Nd5 Nxd5 exd5 Nb8 c4 Be7`,
    `${SV} Nxc6 bxc6 Bc4 Be7`,
  ],
  notes: {
    'e4 c5': {
      name: { es: 'Defensa Siciliana', en: 'Sicilian Defence' },
      comment: {
        es: 'Lucha por d4 con un peón lateral y crea desequilibrio desde la primera jugada.',
        en: 'Fights for d4 with a flank pawn and creates imbalance from move one.',
      },
    },
    [SV]: {
      name: { es: 'Variante Lasker-Pelikan', en: 'Lasker–Pelikan Variation' },
      comment: {
        es: 'Las negras ganan tiempo sobre el caballo de d4 a cambio de dejar un agujero en d5.',
        en: 'Black gains time on the d4 knight at the cost of a hole on d5.',
      },
    },
    [`${SV} Ndb5 d6`]: {
      comment: {
        es: 'Impide Cd6+; el peón de d6 quedará retrasado, pero bien protegido.',
        en: 'Stops Nd6+; the d6 pawn will be backward but well protected.',
      },
    },
    [`${SV} Ndb5 d6 Bg5`]: {
      comment: {
        es: 'Presiona el caballo de f6, uno de los defensores de d5.',
        en: 'Pressures the f6 knight, one of the defenders of d5.',
      },
    },
    [`${SV} Ndb5 d6 Bg5 a6 Na3`]: {
      comment: {
        es: 'El caballo queda mal situado en a3; las negras lo aprovechan con ...b5.',
        en: 'The knight is offside on a3; Black exploits that with ...b5.',
      },
    },
    [SV8]: {
      name: { es: 'Variante Sveshnikov', en: 'Sveshnikov Variation' },
      comment: {
        es: 'Gana espacio y deja al caballo de a3 fuera de juego.',
        en: 'Gains space and keeps the a3 knight out of play.',
      },
    },
    [`${SV8} Bxf6 gxf6`]: {
      comment: {
        es: 'Las negras aceptan peones doblados a cambio de la pareja de alfiles y el control de casillas centrales.',
        en: 'Black accepts doubled pawns for the bishop pair and control of central squares.',
      },
    },
    [`${SV8} Bxf6 gxf6 Nd5 f5`]: {
      comment: {
        es: 'Ataca e4 y abre la diagonal para ...Ag7.',
        en: 'Hits e4 and opens the diagonal for ...Bg7.',
      },
    },
    [`${SV8} Bxf6 gxf6 Nd5 f5 c3`]: {
      comment: {
        es: 'Prepara Cc2 para devolver al juego el caballo de a3.',
        en: 'Prepares Nc2 to bring the a3 knight back into play.',
      },
    },
    [`${SV8} Bxf6 gxf6 Nd5 f5 c3 Bg7 exf5 Bxf5 Nc2 O-O Nce3`]: {
      comment: {
        es: 'Los caballos blancos vigilan d5 y f5; las negras buscan ...f5 y actividad en el flanco de rey.',
        en: 'White’s knights watch d5 and f5; Black looks for ...f5 and kingside activity.',
      },
    },
    [`${SV8} Nd5`]: {
      name: { es: 'Variante Chelyabinsk (9.Cd5)', en: 'Chelyabinsk Variation (9.Nd5)' },
      comment: {
        es: 'Ocupa d5 de inmediato; las negras responden ...Ae7 para recapturar en f6 con el alfil.',
        en: 'Occupies d5 at once; Black answers ...Be7 to recapture on f6 with the bishop.',
      },
    },
    [`${SV8} Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2 Bg5 a4`]: {
      comment: {
        es: 'Ataca la cadena de peones negra del flanco de dama.',
        en: 'Attacks Black’s queenside pawn chain.',
      },
    },
    [`${SV} Ndb5 d6 Nd5`]: {
      comment: {
        es: 'Otra idea: cambiar caballos en d5 para fijar la estructura antes de ...a6.',
        en: 'Another idea: trade knights on d5 to fix the structure before ...a6.',
      },
    },
    [`${SV} Nxc6`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: 'Cambio prematuro que da a las negras un centro de peones sólido.',
        en: 'A premature trade that hands Black a solid pawn centre.',
      },
    },
  },
};

const AL = 'e4 c5 c3';
const AL_D5 = `${AL} d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4`;

export const alapin: OpeningSpec = {
  id: 'sicilian-alapin',
  name: { es: 'Defensa Siciliana, Variante Alapin', en: 'Sicilian Defence, Alapin Variation' },
  eco: 'B22',
  side: 'white',
  description: {
    es: 'Con 2.c3 las blancas preparan d4 para mantener un centro de peones y evitar las Sicilianas abiertas más teóricas.',
    en: 'With 2.c3 White prepares d4 to keep a pawn centre and sidestep the most theoretical Open Sicilians.',
  },
  main: `${AL_D5} Be2 e6 O-O Nc6 h3 Bh5 Be3 cxd4 cxd4 Be7 Nc3 Qd6 Nb5 Qd8`,
  lines: [
    `${AL} Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6`,
    `${AL} Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 c4 Bc2 Qc7 Qe2 g5`,
    `${AL} e6 d4 d5 exd5 exd5 Nf3 Nc6 Bb5 Bd6 dxc5 Bxc5 O-O Ne7 Nbd2 O-O`,
    `${AL} d5 exd5 Qxd5 d4 Nc6 Nf3 Bg4 Be2 cxd4 cxd4 e6 Nc3 Qa5`,
  ],
  notes: {
    'e4 c5': {
      name: { es: 'Defensa Siciliana', en: 'Sicilian Defence' },
      comment: {
        es: 'Lucha por d4 con un peón lateral y crea desequilibrio desde la primera jugada.',
        en: 'Fights for d4 with a flank pawn and creates imbalance from move one.',
      },
    },
    [AL]: {
      name: { es: 'Variante Alapin', en: 'Alapin Variation' },
      comment: {
        es: 'Prepara d4 para responder a ...cxd4 con cxd4 y quedarse con un centro de peones.',
        en: 'Prepares d4 so that ...cxd4 can be met by cxd4, keeping a pawn centre.',
      },
    },
    [`${AL} d5`]: {
      comment: {
        es: 'Aprovecha que c3 quita esa casilla al caballo blanco: la dama podrá recapturar en d5 sin ser atacada por Cc3.',
        en: 'Exploits the fact that c3 takes that square from the white knight: the queen can recapture on d5 without being hit by Nc3.',
      },
    },
    [`${AL} d5 exd5 Qxd5`]: {
      name: { es: 'Defensa Barmen', en: 'Barmen Defence' },
    },
    [AL_D5]: {
      name: { es: 'Defensa Barmen, línea moderna', en: 'Barmen Defence, Modern Line' },
      comment: {
        es: 'Presiona d4 clavando el caballo de f3.',
        en: 'Pressures d4 by pinning the f3 knight.',
      },
    },
    [`${AL_D5} Be2 e6 O-O Nc6 h3 Bh5 Be3 cxd4 cxd4`]: {
      comment: {
        es: 'Estructura de peón aislado en d4: las blancas tienen actividad y las negras apuntan al peón débil.',
        en: 'An isolated d4 pawn: White has activity while Black targets the weak pawn.',
      },
    },
    [`${AL_D5} Be2 e6 O-O Nc6 h3 Bh5 Be3 cxd4 cxd4 Be7 Nc3 Qd6 Nb5`]: {
      comment: {
        es: 'Gana tiempo sobre la dama y vigila las casillas d6 y c7.',
        en: 'Gains time on the queen and eyes the d6 and c7 squares.',
      },
    },
    [`${AL} d5 exd5 Qxd5 d4 Nc6`]: {
      comment: {
        es: 'Presiona d4 con el caballo antes de decidir dónde colocar el alfil.',
        en: 'Pressures d4 with the knight before committing the bishop.',
      },
    },
    [`${AL} Nf6`]: {
      comment: {
        es: 'Ataca e4 y provoca e5; el caballo se instalará en d5.',
        en: 'Hits e4 and provokes e5; the knight settles on d5.',
      },
    },
    [`${AL} Nf6 e5 Nd5 d4 cxd4 Nf3`]: {
      comment: {
        es: 'Las blancas no recapturan todavía: prefieren desarrollarse, aun a costa de entregar el peón de d4.',
        en: 'White does not recapture yet, preferring development even at the cost of the d4 pawn.',
      },
    },
    [`${AL} Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3`]: {
      name: { es: 'Ataque Stoltz', en: 'Stoltz Attack' },
      comment: {
        es: 'El alfil se retira sin salir de la diagonal que apunta a f7.',
        en: 'The bishop retreats while staying on the diagonal aimed at f7.',
      },
    },
    [`${AL} Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 c4 Bc2 Qc7 Qe2 g5`]: {
      name: { es: 'Línea Ivanchuk', en: 'Ivanchuk Line' },
      comment: {
        es: 'Ataque directo contra e5: las negras quieren ...g4 para desalojar al caballo que lo defiende.',
        en: 'A direct assault on e5: Black wants ...g4 to dislodge the knight defending it.',
      },
    },
    [`${AL} e6`]: {
      comment: {
        es: 'Planteamiento de tipo francés: las negras preparan ...d5.',
        en: 'A French-style setup: Black prepares ...d5.',
      },
    },
    [`${AL} e6 d4 d5 exd5 exd5`]: {
      comment: {
        es: 'Si las blancas cambian en c5, las negras quedarán con un peón aislado en d5 pero con piezas activas.',
        en: 'If White takes on c5, Black is left with an isolated d5 pawn but active pieces.',
      },
    },
  },
};

// ---------------------------------------------------------------- Other replies to 1.e4

const SCA = 'e4 d5 exd5';
const SCA_MAIN = `${SCA} Qxd5 Nc3 Qa5 d4 Nf6 Nf3`;

export const scandinavian: OpeningSpec = {
  id: 'scandinavian-defence',
  name: { es: 'Defensa Escandinava', en: 'Scandinavian Defence' },
  eco: 'B01',
  side: 'black',
  description: {
    es: 'Las negras atacan e4 en la primera jugada y recuperan el peón con la dama o con el caballo. Estructura sencilla y sólida, fácil de aprender.',
    en: 'Black hits e4 on move one and regains the pawn with the queen or the knight. A simple, solid structure that is easy to learn.',
  },
  main: `${SCA_MAIN} c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7 a3 Bxc3 Bxc3 Qc7`,
  lines: [
    `${SCA_MAIN} Bf5 Bd2 c6 Bc4 Nbd7 Qe2 Qc7 O-O-O e6`,
    `${SCA} Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O`,
    `${SCA} Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 c6`,
    `${SCA} Nf6 d4 Nxd5 c4 Nb6 Nf3 g6 Nc3 Bg7 h3 O-O`,
    `${SCA} Nf6 d4 Bg4 Nf3 Qxd5 Be2 Nc6`,
  ],
  notes: {
    'e4 d5': {
      name: { es: 'Defensa Escandinava', en: 'Scandinavian Defence' },
      comment: {
        es: 'Ataca e4 de inmediato: las negras aceptan sacar pronto la dama.',
        en: 'Attacks e4 at once: Black accepts an early queen sortie.',
      },
    },
    [`${SCA} Qxd5`]: {
      comment: {
        es: 'La dama recupera el peón, pero será perseguida con Cc3.',
        en: 'The queen regains the pawn but will be chased by Nc3.',
      },
    },
    [`${SCA} Qxd5 Nc3 Qa5`]: {
      name: { es: 'Defensa Escandinava, línea principal', en: 'Scandinavian Defence, Main Line' },
      comment: {
        es: 'Desde a5 la dama está a salvo y clava el caballo de c3 en cuanto avance el peón de d.',
        en: 'On a5 the queen is safe and pins the c3 knight once the d-pawn advances.',
      },
    },
    [`${SCA_MAIN} c6`]: {
      comment: {
        es: 'Da a la dama una casilla de retirada en c7 y prepara ...Af5.',
        en: 'Gives the queen a retreat square on c7 and prepares ...Bf5.',
      },
    },
    [`${SCA_MAIN} c6 Bc4 Bf5 Bd2 e6`]: {
      comment: {
        es: 'Estructura sólida de tipo Caro-Kann con el alfil de c8 ya fuera de la cadena.',
        en: 'A solid Caro-Kann-like structure with the c8 bishop already outside the chain.',
      },
    },
    [`${SCA_MAIN} c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7 a3 Bxc3 Bxc3 Qc7`]: {
      comment: {
        es: 'Las negras ceden el alfil para aliviar la presión y la dama queda a salvo en c7.',
        en: 'Black gives up the bishop to ease the pressure and the queen is safe on c7.',
      },
    },
    [`${SCA_MAIN} Bf5`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'Desarrolla el alfil antes de ...c6.',
        en: 'Develops the bishop before ...c6.',
      },
    },
    [`${SCA_MAIN} Bf5 Bd2 c6 Bc4 Nbd7 Qe2`]: {
      comment: {
        es: 'Las blancas preparan el enroque largo y la ruptura d5; las negras completan el desarrollo con ...Dc7 y ...e6.',
        en: 'White prepares long castling and the d5 break; Black completes development with ...Qc7 and ...e6.',
      },
    },
    [`${SCA} Nf6 d4 Bg4 Nf3`]: {
      name: {
        es: 'Gambito Portugués, variante clásica',
        en: 'Portuguese Gambit, Classical Variation',
      },
      comment: {
        es: 'Desarrollo sencillo: las blancas devuelven el peón y las negras recuperan d5 con la dama.',
        en: 'Simple development: White lets the pawn go and Black regains d5 with the queen.',
      },
    },
    [`${SCA} Qxd5 Nc3 Qd6`]: {
      name: { es: 'Defensa Gubinsky-Melts', en: 'Gubinsky–Melts Defence' },
      comment: {
        es: 'Planteamiento moderno: desde d6 la dama controla e5 y puede replegarse a defender.',
        en: 'A modern setup: from d6 the queen controls e5 and can drop back to defend.',
      },
    },
    [`${SCA} Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6`]: {
      name: { es: 'Variante Bronstein', en: 'Bronstein Variation' },
      comment: {
        es: 'Prepara ...b5 o ...Cc6 sin temer Cb5.',
        en: 'Prepares ...b5 or ...Nc6 without fearing Nb5.',
      },
    },
    [`${SCA} Qxd5 Nc3 Qd8`]: {
      name: { es: 'Variante Valenciana', en: 'Valencian Variation' },
      comment: {
        es: 'Retirada completa: la dama queda a salvo a costa de algo de tiempo.',
        en: 'A full retreat: the queen is safe at the cost of some time.',
      },
    },
    [`${SCA} Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4`]: {
      name: { es: 'Variante Valenciana, línea principal', en: 'Valencian Variation, Main Line' },
    },
    [`${SCA} Nf6`]: {
      name: { es: 'Variante Moderna', en: 'Modern Variation' },
      comment: {
        es: 'Las negras recuperarán el peón con el caballo en lugar de con la dama.',
        en: 'Black will regain the pawn with the knight rather than the queen.',
      },
    },
    [`${SCA} Nf6 d4 Nxd5`]: {
      name: { es: 'Variante Marshall', en: 'Marshall Variation' },
      comment: {
        es: 'El caballo recupera el peón; las blancas ganarán tiempo con c4.',
        en: 'The knight regains the pawn; White gains time with c4.',
      },
    },
    [`${SCA} Nf6 d4 Bg4`]: {
      name: { es: 'Gambito Portugués', en: 'Portuguese Gambit' },
      comment: {
        es: 'Las negras desarrollan el alfil antes de recuperar el peón de d5.',
        en: 'Black develops the bishop before regaining the d5 pawn.',
      },
    },
  },
};

const PI = 'e4 d6 d4 Nf6 Nc3 g6';

export const pirc: OpeningSpec = {
  id: 'pirc-defence',
  name: { es: 'Defensa Pirc', en: 'Pirc Defence' },
  eco: 'B07-B09',
  side: 'black',
  description: {
    es: 'Las negras permiten un centro blanco amplio para socavarlo después con ...c5 o ...e5 y la presión del alfil de g7.',
    en: 'Black allows a broad white centre and undermines it later with ...c5 or ...e5 and pressure from the g7 bishop.',
  },
  main: `${PI} f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Rb8 Kh1 Nc7 a4 a6`,
  lines: [
    `${PI} f4 Bg7 Nf3 c5 dxc5 Qa5 Bd3 Qxc5 Qe2 O-O Be3 Qa5 O-O Bg4`,
    `${PI} f4 Bg7 Nf3 O-O e5 Nfd7 h4 c5 h5 cxd4 Qxd4 dxe5`,
    `${PI} Nf3 Bg7 Be2 O-O O-O c6 a4 a5 h3 Na6`,
    `${PI} Nf3 Bg7 Be2 O-O O-O Bg4 Be3 Nc6 Qd2 e5 d5 Ne7`,
    `${PI} Be3 c6 Qd2 b5 Bd3 Nbd7 Nf3 e5`,
  ],
  notes: {
    'e4 d6': {
      comment: {
        es: 'Las negras dejan que las blancas ocupen el centro para atacarlo después con piezas y rupturas de peón.',
        en: 'Black lets White occupy the centre, planning to attack it later with pieces and pawn breaks.',
      },
    },
    [PI]: {
      name: { es: 'Defensa Pirc', en: 'Pirc Defence' },
      comment: {
        es: 'El alfil irá a g7 para presionar el centro blanco desde lejos.',
        en: 'The bishop heads for g7 to pressure White’s centre from afar.',
      },
    },
    [`${PI} f4`]: {
      name: { es: 'Ataque Austriaco', en: 'Austrian Attack' },
      comment: {
        es: 'Tres peones en el centro: las blancas buscan e5 y un ataque en el flanco de rey.',
        en: 'Three central pawns: White aims for e5 and a kingside attack.',
      },
    },
    [`${PI} f4 Bg7 Nf3 O-O Bd3`]: {
      name: { es: 'Variante Weiss', en: 'Weiss Variation' },
      comment: {
        es: 'Desarrollo flexible: el alfil apoya e4 y apunta al enroque negro.',
        en: 'Flexible development: the bishop supports e4 and eyes Black’s king.',
      },
    },
    [`${PI} f4 Bg7 Nf3 O-O Bd3 Na6`]: {
      comment: {
        es: 'El caballo apoya ...c5 desde a6 y puede saltar a b4 o c7.',
        en: 'The knight supports ...c5 from a6 and can jump to b4 or c7.',
      },
    },
    [`${PI} f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5`]: {
      comment: {
        es: 'Las blancas cierran el centro; las negras juegan en el flanco de dama con ...Tb8 y ...b5.',
        en: 'White closes the centre; Black plays on the queenside with ...Rb8 and ...b5.',
      },
    },
    [`${PI} f4 Bg7 Nf3 c5`]: {
      name: { es: 'Formación Dragón', en: 'Dragon Formation' },
      comment: {
        es: 'Golpe inmediato contra d4, antes de que las blancas completen el desarrollo.',
        en: 'An immediate strike at d4 before White completes development.',
      },
    },
    [`${PI} f4 Bg7 Nf3 O-O e5`]: {
      name: { es: 'Ataque Unzicker', en: 'Unzicker Attack' },
      comment: {
        es: 'Expulsa al caballo de f6 y gana espacio; las negras contraatacan con ...c5.',
        en: 'Kicks the f6 knight and gains space; Black hits back with ...c5.',
      },
    },
    [`${PI} Nf3`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'Desarrollo sólido: las blancas renuncian a f4 a cambio de una posición sin riesgos.',
        en: 'Solid development: White forgoes f4 for a low-risk position.',
      },
    },
    [`${PI} Nf3 Bg7 Be2 O-O O-O c6`]: {
      name: { es: 'Defensa Checa', en: 'Czech Defence' },
      comment: {
        es: 'Prepara ...b5 o ...e5 con una estructura flexible.',
        en: 'Prepares ...b5 or ...e5 with a flexible structure.',
      },
    },
    [`${PI} Nf3 Bg7 Be2 O-O O-O Bg4`]: {
      name: { es: 'Defensa Parma', en: 'Parma Defence' },
      comment: {
        es: 'Presiona d4, dispuesto a cambiar el alfil por el caballo de f3.',
        en: 'Pressures d4, ready to trade the bishop for the f3 knight.',
      },
    },
    [`${PI} Be3`]: {
      comment: {
        es: 'Plan Ae3, Dd2 y Ah6 para cambiar el alfil de g7 y atacar.',
        en: 'The plan is Be3, Qd2 and Bh6 to trade off the g7 bishop and attack.',
      },
    },
    [`${PI} Be3 c6 Qd2`]: {
      name: { es: 'Ataque 150', en: '150 Attack' },
    },
  },
};

export const e4Openings = [
  scotch,
  petrov,
  kingsGambit,
  dragon,
  sveshnikov,
  alapin,
  scandinavian,
  pirc,
];
