import type { OpeningSpec } from './tree-builder.ts';
import { e4Openings } from './openings-e4.ts';
import { d4Openings } from './openings-d4.ts';

const RUY = 'e4 e5 Nf3 Nc6 Bb5';
const RUY_CLOSED = `${RUY} a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3`;

export const ruyLopez: OpeningSpec = {
  id: 'ruy-lopez',
  name: { es: 'Apertura Española (Ruy López)', en: 'Ruy Lopez (Spanish Opening)' },
  eco: 'C60-C99',
  side: 'white',
  description: {
    es: 'Las blancas presionan el caballo de c6, defensor del peón de e5, y buscan una ventaja duradera en el [centro](centre).',
    en: 'White pressures the c6 knight, the defender of the e5 pawn, aiming for a lasting [central](centre) edge.',
  },
  main: `${RUY_CLOSED} d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2`,
  lines: [
    `${RUY} Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 Ke8`,
    `${RUY} a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Bc5 Nbd2 O-O Bc2`,
    `${RUY_CLOSED} O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3`,
    `${RUY} a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1`,
  ],
  notes: {
    [RUY]: {
      name: { es: 'Apertura Española', en: 'Ruy Lopez' },
      comment: {
        es: 'El alfil ataca al defensor del peón de e5 y prepara el [enroque](castling) rápido.',
        en: 'The bishop hits the defender of e5 and prepares quick [castling](castling).',
      },
    },
    [`${RUY} a6`]: {
      name: { es: 'Defensa Morphy', en: 'Morphy Defence' },
      comment: {
        es: 'Pregunta al alfil: las negras se ganan la opción de ...b5 en el momento oportuno.',
        en: 'Questions the bishop; Black keeps ...b5 in reserve for the right moment.',
      },
    },
    [`${RUY} a6 Ba4 Nf6 O-O`]: {
      comment: {
        es: 'e4 no cuelga: si ...Cxe4, Te1 o d4 recuperan el peón con [iniciativa](initiative).',
        en: 'e4 is not really hanging: after ...Nxe4, Re1 or d4 regains the pawn with the [initiative](initiative).',
      },
    },
    [`${RUY} a6 Ba4 Nf6 O-O Be7`]: {
      name: { es: 'Variante Cerrada', en: 'Closed Variation' },
    },
    [`${RUY_CLOSED} d6 c3`]: {
      comment: {
        es: 'Prepara d4 y deja al alfil una casilla de retirada en c2.',
        en: 'Prepares d4 and gives the bishop a retreat square on c2.',
      },
    },
    [`${RUY_CLOSED} d6 c3 O-O h3`]: {
      comment: {
        es: 'Evita ...Ag4, que [clavaría](pin) el caballo de f3 y presionaría d4.',
        en: 'Prevents ...Bg4, which would [pin](pin) the f3 knight and pressure d4.',
      },
    },
    [`${RUY_CLOSED} d6 c3 O-O h3 Na5`]: {
      name: { es: 'Variante Chigorin', en: 'Chigorin Variation' },
      comment: {
        es: 'Elimina o expulsa el alfil de b3 y prepara ...c5 para ganar [espacio](space) en el [flanco](flank) de dama.',
        en: 'Chases the b3 bishop and prepares ...c5 to gain [queenside](flank) [space](space).',
      },
    },
    [`${RUY} Nf6`]: {
      name: { es: 'Defensa Berlinesa', en: 'Berlin Defence' },
      comment: {
        es: 'Contraataca e4 de inmediato; muy sólida al más alto nivel.',
        en: 'Counterattacks e4 at once; extremely solid at top level.',
      },
    },
    [`${RUY} Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8`]: {
      name: { es: 'Muro de Berlín (final berlinés)', en: 'Berlin Wall (Berlin Endgame)' },
      comment: {
        es: 'Se cambian damas: las negras pierden el [enroque](castling) pero tienen la [pareja de alfiles](bishop-pair).',
        en: 'Queens come off: Black loses the right to [castle](castling) but keeps the [bishop pair](bishop-pair).',
      },
    },
    [`${RUY} a6 Ba4 Nf6 O-O Nxe4`]: {
      name: { es: 'Variante Abierta', en: 'Open Variation' },
      comment: {
        es: 'Las negras toman e4 y buscan juego activo de piezas a cambio de algunas debilidades.',
        en: 'Black grabs e4 and plays for active pieces in exchange for some weaknesses.',
      },
    },
    [`${RUY_CLOSED} O-O c3 d5`]: {
      name: { es: 'Ataque Marshall', en: 'Marshall Attack' },
      comment: {
        es: '[Gambito](gambit): las negras entregan un peón a cambio de un ataque duradero sobre el rey blanco.',
        en: 'A [gambit](gambit): Black gives a pawn for a lasting attack against the white king.',
      },
    },
    [`${RUY_CLOSED} O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3`]: {
      comment: {
        es: 'La dama se instala junto al enroque; las blancas deben defenderse con precisión.',
        en: 'The queen settles next to the white king; White must defend accurately.',
      },
    },
    [`${RUY} a6 Bxc6`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: 'Las blancas ceden la [pareja de alfiles](bishop-pair) a cambio de una mayoría de peones sana en el [flanco](flank) de rey.',
        en: 'White gives up the [bishop pair](bishop-pair) for a healthy [kingside](flank) pawn majority.',
      },
    },
    [`${RUY} a6 Bxc6 dxc6 O-O f6`]: {
      comment: {
        es: 'Defiende e5 sin [cambiar](exchange) el peón; el peón de c6 [doblado](doubled-pawns) controla casillas [centrales](centre).',
        en: 'Defends e5 without [exchanging](exchange); the [doubled](doubled-pawns) c-pawns still control [central](centre) squares.',
      },
    },
  },
};

const ITA = 'e4 e5 Nf3 Nc6 Bc4';
const GP = `${ITA} Bc5`;

export const italian: OpeningSpec = {
  id: 'italian-game',
  name: { es: 'Apertura Italiana', en: 'Italian Game' },
  eco: 'C50-C59',
  side: 'white',
  description: {
    es: 'El alfil apunta a f7, el punto débil del enroque negro, y las blancas preparan c3 y d4 para dominar el [centro](centre).',
    en: 'The bishop aims at f7, the weak point near the black king, while White prepares c3 and d4 to take the [centre](centre).',
  },
  main: `${GP} c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6`,
  lines: [
    `${GP} c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3`,
    `${GP} b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5 exd5 Nxd5`,
    `${ITA} Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6`,
  ],
  notes: {
    [ITA]: {
      name: { es: 'Apertura Italiana', en: 'Italian Game' },
      comment: {
        es: 'El alfil se sitúa en la diagonal a2-g8, apuntando a f7.',
        en: 'The bishop takes the a2-g8 diagonal, eyeing f7.',
      },
    },
    [GP]: {
      name: { es: 'Giuoco Piano', en: 'Giuoco Piano' },
      comment: {
        es: 'Respuesta simétrica: el alfil negro también apunta al punto f2.',
        en: 'The symmetrical reply: the black bishop also eyes f2.',
      },
    },
    [`${GP} c3`]: {
      comment: {
        es: 'Prepara d4 para levantar un [centro](centre) de peones.',
        en: 'Prepares d4 to build a pawn [centre](centre).',
      },
    },
    [`${GP} c3 Nf6 d4`]: {
      name: { es: 'Ataque central', en: 'Centre Attack' },
    },
    [`${GP} c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5`]: {
      comment: {
        es: 'Golpe [central](centre) clásico: las negras [rompen](pawn-break) antes de que e5 las encierre.',
        en: 'The classic [central](centre) strike: Black [breaks](pawn-break) before e5 can cramp them.',
      },
    },
    [`${GP} c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3`]: {
      comment: {
        es: 'Presiona d5 y b7; las blancas juegan con el [peón aislado](isolated-pawn) de d4 y piezas activas.',
        en: 'Hits d5 and b7; White plays with the [isolated](isolated-pawn) d4 pawn and active pieces.',
      },
    },
    [`${GP} c3 Nf6 d3`]: {
      name: { es: 'Giuoco Pianissimo', en: 'Giuoco Pianissimo' },
      comment: {
        es: 'Plan lento y flexible: se protege e4 y se maniobra antes de [romper](pawn-break) en el [centro](centre).',
        en: 'A slow, flexible plan: e4 is protected and White manoeuvres before any [central](centre) [break](pawn-break).',
      },
    },
    [`${GP} c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7`]: {
      comment: {
        es: 'Ambos alfiles se ponen a salvo de ataques de peones antes de continuar la maniobra.',
        en: 'Both bishops step out of reach of pawn attacks before the manoeuvring continues.',
      },
    },
    [`${GP} b4`]: {
      name: { es: 'Gambito Evans', en: 'Evans Gambit' },
      comment: {
        es: '[Gambito](gambit): se entrega un peón para ganar [tiempos](tempo) con c3 y d4.',
        en: 'A [gambit](gambit): White gives a pawn to gain [time](tempo) with c3 and d4.',
      },
    },
    [`${GP} b4 Bxb4 c3 Ba5 d4`]: {
      comment: {
        es: '[Centro](centre) de peones y [desarrollo](development) rápido a cambio del material.',
        en: 'A pawn [centre](centre) and fast [development](development) in return for the material.',
      },
    },
    [`${ITA} Nf6`]: {
      name: { es: 'Defensa de los Dos Caballos', en: 'Two Knights Defence' },
      comment: {
        es: 'Contraataque sobre e4 que invita a Cg5.',
        en: 'A counterattack on e4 that invites Ng5.',
      },
    },
    [`${ITA} Nf6 Ng5`]: {
      comment: {
        es: 'Ataca f7 con dos piezas; las negras deben responder con precisión.',
        en: 'Hits f7 twice; Black must respond accurately.',
      },
    },
    [`${ITA} Nf6 Ng5 d5 exd5 Na5`]: {
      comment: {
        es: 'Las negras entregan un peón y ganan [tiempos](tempo) atacando al alfil.',
        en: 'Black gives a pawn and gains [time](tempo) by attacking the bishop.',
      },
    },
  },
};

const NAJ = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';

export const najdorf: OpeningSpec = {
  id: 'sicilian-najdorf',
  name: { es: 'Defensa Siciliana, Variante Najdorf', en: 'Sicilian Defence, Najdorf Variation' },
  eco: 'B90-B99',
  side: 'black',
  description: {
    es: 'Con 5...a6 las negras controlan b5 y mantienen opciones de ...e5 o ...e6; posiciones asimétricas y muy dinámicas.',
    en: 'With 5...a6 Black controls b5 and keeps both ...e5 and ...e6 in reserve; sharp, unbalanced positions.',
  },
  main: `${NAJ} Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5 Bxf6 Nxf6 g5 Nd7 f5 Nc5`,
  lines: [
    `${NAJ} Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5 g5 b4`,
    `${NAJ} Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Qd2 Nbd7 a4`,
    `${NAJ} Bc4 e6 Bb3 b5 O-O Be7 Qf3 Qc7 Qg3 O-O Bh6 Ne8`,
  ],
  notes: {
    'e4 c5': {
      name: { es: 'Defensa Siciliana', en: 'Sicilian Defence' },
      comment: {
        es: 'Lucha por d4 con un peón [lateral](flank) y crea desequilibrio desde la primera jugada.',
        en: 'Fights for d4 with a [flank](flank) pawn and creates imbalance from move one.',
      },
    },
    'e4 c5 Nf3 d6 d4 cxd4': {
      comment: {
        es: '[Cambia](exchange) un peón [lateral](flank) por uno [central](centre): las negras tendrán mayoría central.',
        en: '[Trades](exchange) a [flank](flank) pawn for a [centre](centre) pawn: Black gets the central majority.',
      },
    },
    [NAJ]: {
      name: { es: 'Variante Najdorf', en: 'Najdorf Variation' },
      comment: {
        es: 'Controla b5 (sin Cb5 ni Ab5) y prepara ...e5 o ...b5.',
        en: 'Controls b5 (no Nb5 or Bb5) and prepares ...e5 or ...b5.',
      },
    },
    [`${NAJ} Bg5`]: {
      name: { es: 'Línea principal 6.Ag5', en: 'Main Line 6.Bg5' },
      comment: {
        es: 'Presiona el caballo de f6, que vigila d5 y e4, y prepara f4 para un ataque directo.',
        en: 'Pressures the f6 knight, which guards d5 and e4, and prepares f4 for a direct attack.',
      },
    },
    [`${NAJ} Bg5 e6`]: {
      comment: {
        es: 'Controla d5 y prepara ...Ae7 para proteger el caballo de f6.',
        en: 'Covers d5 and prepares ...Be7 to shield the f6 knight.',
      },
    },
    [`${NAJ} Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5`]: {
      comment: {
        es: 'Carrera de ataques: las blancas avanzan en el [flanco](flank) de rey y las negras contraatacan en el de dama.',
        en: 'A race of attacks: White storms the [kingside](flank) while Black counterattacks on the queenside.',
      },
    },
    [`${NAJ} Be3`]: {
      name: { es: 'Ataque Inglés', en: 'English Attack' },
      comment: {
        es: 'Plan f3, Dd2, 0-0-0 y g4-g5 para atacar en el [flanco](flank) de rey.',
        en: 'The plan is f3, Qd2, O-O-O and g4-g5 to attack on the [kingside](flank).',
      },
    },
    [`${NAJ} Be3 e5`]: {
      comment: {
        es: 'Gana [espacio](space) y expulsa al caballo de d4; a cambio, d5 queda débil.',
        en: 'Gains [space](space) and kicks the d4 knight; the price is a weak d5 square.',
      },
    },
    [`${NAJ} Be2`]: {
      name: { es: 'Variante Opočenský', en: 'Opočenský Variation' },
      comment: {
        es: '[Desarrollo](development) tranquilo y [enroque](castling) corto: juego posicional.',
        en: 'Quiet [development](development) and short [castling](castling): a positional approach.',
      },
    },
    [`${NAJ} Be2 e5`]: {
      comment: {
        es: 'Contra un plan tranquilo, las negras ocupan el [centro](centre) y vigilan d5.',
        en: 'Against a quiet setup Black claims the [centre](centre) and keeps an eye on d5.',
      },
    },
    [`${NAJ} Bc4`]: {
      name: { es: 'Ataque Fischer-Sozin (Lipnitsky)', en: 'Fischer–Sozin (Lipnitsky) Attack' },
      comment: {
        es: 'El alfil apunta a e6 y f7, preparando golpes como Cxe6 o f4-f5.',
        en: 'The bishop targets e6 and f7, preparing blows such as Nxe6 or f4-f5.',
      },
    },
    [`${NAJ} Bc4 e6`]: {
      comment: {
        es: 'Cierra la diagonal del alfil; luego ...b5 gana [tiempo](tempo) sobre él.',
        en: 'Blunts the bishop; ...b5 then gains [time](tempo) against it.',
      },
    },
  },
};

const FR = 'e4 e6 d4 d5';

export const french: OpeningSpec = {
  id: 'french-defence',
  name: { es: 'Defensa Francesa', en: 'French Defence' },
  eco: 'C00-C19',
  side: 'black',
  description: {
    es: 'Las negras aceptan algo de [espacio](space) menos a cambio de una [estructura](pawn-structure) sólida y contraataques en el [centro](centre) con ...c5 y ...f6.',
    en: 'Black accepts less [space](space) for a solid [structure](pawn-structure) and [central](centre) counterplay with ...c5 and ...f6.',
  },
  main: `${FR} Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6 f4 Bd7 Qd3 dxc3`,
  lines: [
    `${FR} Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5`,
    `${FR} Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 cxd4 Nxd4 Bc5 Qd2 O-O O-O-O a6`,
    `${FR} e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5`,
    `${FR} exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4`,
    `${FR} Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O Nf6 Nb3 Nc6 Nbxd4 Nxd4 Nxd4 a6`,
  ],
  notes: {
    'e4 e6': {
      name: { es: 'Defensa Francesa', en: 'French Defence' },
      comment: {
        es: 'Prepara ...d5 apoyado por el peón de e6.',
        en: 'Prepares ...d5 with the support of the e6 pawn.',
      },
    },
    [`${FR} Nc3 Bb4`]: {
      name: { es: 'Variante Winawer', en: 'Winawer Variation' },
      comment: {
        es: '[Clava](pin) el caballo y presiona e4; las negras aceptan ceder el alfil a cambio de dañar la [estructura](pawn-structure) blanca.',
        en: '[Pins](pin) the knight and hits e4; Black is ready to give up the bishop to damage White’s [structure](pawn-structure).',
      },
    },
    [`${FR} Nc3 Bb4 e5 c5`]: {
      comment: {
        es: 'Ataque inmediato a la base de la [cadena de peones](pawn-chain) blanca.',
        en: 'An immediate strike at the base of White’s [pawn chain](pawn-chain).',
      },
    },
    [`${FR} Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4`]: {
      comment: {
        es: 'Ataca g7, debilitado tras la marcha del alfil negro de casillas oscuras.',
        en: 'Attacks g7, weakened after Black’s dark-squared bishop left.',
      },
    },
    [`${FR} Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7`]: {
      name: { es: 'Variante del Peón Envenenado', en: 'Poisoned Pawn Variation' },
      comment: {
        es: 'Las negras entregan el [flanco](flank) de rey a cambio de un [contrajuego](counterplay) fuerte contra c3 y el [centro](centre).',
        en: 'Black gives up the [kingside](flank) for strong [counterplay](counterplay) against c3 and the [centre](centre).',
      },
    },
    [`${FR} Nc3 Nf6`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: '[Desarrollo](development) natural que presiona e4.',
        en: 'Natural [development](development) that pressures e4.',
      },
    },
    [`${FR} Nc3 Nf6 e5`]: {
      name: { es: 'Variante Steinitz', en: 'Steinitz Variation' },
    },
    [`${FR} Nc3 Nf6 e5 Nfd7 f4`]: {
      comment: {
        es: 'Refuerza e5 con f4; las negras atacan la [cadena](pawn-chain) con ...c5 y ...Cc6.',
        en: 'Reinforces e5 with f4; Black hits the [chain](pawn-chain) with ...c5 and ...Nc6.',
      },
    },
    [`${FR} e5`]: {
      name: { es: 'Variante del Avance', en: 'Advance Variation' },
      comment: {
        es: 'Las blancas ganan [espacio](space); las negras atacan la [cadena de peones](pawn-chain) desde su base con ...c5.',
        en: 'White gains [space](space); Black attacks the [pawn chain](pawn-chain) at its base with ...c5.',
      },
    },
    [`${FR} e5 c5 c3 Nc6 Nf3 Qb6`]: {
      comment: {
        es: 'Suma presión sobre d4 y b2.',
        en: 'Adds pressure on d4 and b2.',
      },
    },
    [`${FR} exd5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
      comment: {
        es: '[Estructura](pawn-structure) simétrica: el alfil negro de c8 queda liberado.',
        en: 'A symmetrical [structure](pawn-structure) that frees Black’s c8 bishop.',
      },
    },
    [`${FR} Nd2`]: {
      name: { es: 'Variante Tarrasch', en: 'Tarrasch Variation' },
      comment: {
        es: 'Evita la [clavada](pin) ...Ab4 y mantiene libre el peón de c.',
        en: 'Avoids the ...Bb4 [pin](pin) and keeps the c-pawn free.',
      },
    },
    [`${FR} Nd2 c5 exd5 Qxd5`]: {
      comment: {
        es: 'Las negras recuperan el peón con la dama y aceptan perder algo de [tiempo](tempo) a cambio de una [estructura](pawn-structure) sin debilidades.',
        en: 'Black recaptures with the queen, accepting some lost [time](tempo) for a [structure](pawn-structure) without weaknesses.',
      },
    },
  },
};

const CK = 'e4 c6 d4 d5';

export const caroKann: OpeningSpec = {
  id: 'caro-kann-defence',
  name: { es: 'Defensa Caro-Kann', en: 'Caro-Kann Defence' },
  eco: 'B10-B19',
  side: 'black',
  description: {
    es: 'Las negras preparan ...d5 con ...c6 para disputar el [centro](centre) sin encerrar a su alfil de casillas claras.',
    en: 'Black prepares ...d5 with ...c6 to contest the [centre](centre) without locking in the light-squared bishop.',
  },
  main: `${CK} Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7`,
  lines: [
    `${CK} e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7`,
    `${CK} exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6`,
    `${CK} exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7 cxd5 Nxd5 Bd3 Nc6 O-O O-O Re1`,
  ],
  notes: {
    'e4 c6': {
      name: { es: 'Defensa Caro-Kann', en: 'Caro-Kann Defence' },
      comment: {
        es: 'Prepara ...d5 dejando libre la diagonal del alfil de c8.',
        en: 'Prepares ...d5 while keeping the c8 bishop’s diagonal open.',
      },
    },
    [`${CK} Nc3 dxe4 Nxe4 Bf5`]: {
      name: { es: 'Variante Clásica', en: 'Classical Variation' },
      comment: {
        es: 'El alfil sale antes de ...e6, lo que resuelve el problema clásico de la pieza.',
        en: 'The bishop gets out before ...e6, solving its classic problem.',
      },
    },
    [`${CK} Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4`]: {
      comment: {
        es: 'Amenaza h5 para atrapar o debilitar al alfil de g6.',
        en: 'Threatens h5 to trap or harass the g6 bishop.',
      },
    },
    [`${CK} Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5`]: {
      comment: {
        es: 'El peón de h5 gana [espacio](space) y fija la [estructura](pawn-structure) negra del [flanco](flank) de rey.',
        en: 'The h5 pawn gains [space](space) and fixes Black’s [kingside](flank) [structure](pawn-structure).',
      },
    },
    [`${CK} e5`]: {
      name: { es: 'Variante del Avance', en: 'Advance Variation' },
      comment: {
        es: 'Las blancas ganan [espacio](space); las negras sacan el alfil a f5 antes de ...e6.',
        en: 'White gains [space](space); Black develops the bishop to f5 before ...e6.',
      },
    },
    [`${CK} e5 Bf5 Nf3 e6 Be2 c5`]: {
      comment: {
        es: 'Ataca la base de la [cadena](pawn-chain), como en la Francesa pero con el alfil ya fuera.',
        en: 'Hits the base of the [chain](pawn-chain), as in the French but with the bishop already out.',
      },
    },
    [`${CK} exd5`]: {
      name: { es: 'Variante del Cambio', en: 'Exchange Variation' },
    },
    [`${CK} exd5 cxd5 Bd3`]: {
      comment: {
        es: '[Estructura](pawn-structure) simétrica; las blancas juegan con c3 y Af4 al estilo de un Gambito de Dama del Cambio invertido.',
        en: 'A symmetrical [structure](pawn-structure); White plays c3 and Bf4, like a reversed Queen’s Gambit Exchange.',
      },
    },
    [`${CK} exd5 cxd5 c4`]: {
      name: { es: 'Ataque Panov-Botvinnik', en: 'Panov–Botvinnik Attack' },
      comment: {
        es: 'Las blancas aceptan un [peón aislado](isolated-pawn) en d4 a cambio de actividad de piezas.',
        en: 'White accepts an [isolated](isolated-pawn) d4 pawn in return for active pieces.',
      },
    },
  },
};

export const allOpenings = [
  ruyLopez,
  italian,
  najdorf,
  french,
  caroKann,
  ...e4Openings,
  ...d4Openings,
];
