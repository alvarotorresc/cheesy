// ===== Demo progress of media/shots =====
//
// The saved progress the list scenes are photographed with: someone a few weeks into the app,
// with some things done and most still to do. openPage() writes it to the IndexedDB database
// before the app starts.
//
// The rows have the exact shape the app stores (src/app/core/progress): it checks every row it
// reads and silently drops the ones that do not fit, so a row here that drifts from the content
// simply stops showing. The scenes count what is on screen to catch that.

// Runs in a row without mistakes after which a line counts as mastered (MASTERY_STREAK).
export const MASTERY_STREAK = 3;

// The clock of the screenshots is pinned to 28 September 2026: everything happened the week before.
const at = (iso) => Date.parse(iso);

// A line is identified by its moves in UCI, castling written as the king move (e1g1): what
// `lineIdOf` gives for a line of the opening tree. The comment above each one is the same line
// in SAN, as it reads in src/app/core/content/data/openings/<id>.json.
const RUY_LOPEZ = [
  // e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6 c2c3 e8g8 h2h3 c6a5 b3c2 c7c5 d2d4 d8c7 b1d2',
  // e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 e8g8 c2c3 d7d5 e4d5 f6d5 f3e5 c6e5 e1e5 c7c6 d2d4 e7d6 e5e1 d8h4 g2g3 h4h3',
  // e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6 d7c6 e1g1 f7f6 d2d4 e5d4 f3d4 c6c5 d4b3 d8d1 f1d1',
];

const ITALIAN_GAME = [
  // e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5 d1b3 c6e7 e1g1 e8g8 f1e1 c7c6',
  // e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1 e8g8 f1e1 a7a6 c4b3 c5a7 h2h3',
  // e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5 exd5 Nxd5
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3 b4a5 d2d4 e5d4 e1g1 g8e7 c3d4 d7d5 e4d5 e7d5',
  // e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 c6a5 c4b5 c7c6 d5c6 b7c6 b5e2 h7h6 g5f3 e5e4 f3e5 f8d6',
];

const SICILIAN_NAJDORF = [
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5 Bxf6 Nxf6 g5 Nd7 f5 Nc5
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1g5 e7e6 f2f4 f8e7 d1f3 d8c7 e1c1 b8d7 g2g4 b7b5 g5f6 d7f6 g4g5 f6d7 f4f5 d7c5',
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5 g5 b4
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 c8e6 f2f3 f8e7 d1d2 e8g8 e1c1 b8d7 g2g4 b7b5 g4g5 b5b4',
  // e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Qd2 Nbd7 a4
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 f1e2 e7e5 d4b3 f8e7 e1g1 e8g8 c1e3 c8e6 d1d2 b8d7 a2a4',
];

const QUEENS_GAMBIT_DECLINED = [
  // d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5
  'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6 c4d5 f6d5 h4e7 d8e7 c3d5 e6d5 a1c1 c8e6 d1a4 c7c5 a4a3 f8c8 f1b5',
];

// One stored row of a line, from its runs: [completed, without mistakes, current streak]. A line
// that was never run clean keeps `fewestMistakes`, the mistakes of its best run.
function line(
  openingId,
  color,
  lineId,
  [practiced, clean, streak],
  lastPracticed,
  fewestMistakes = 0,
) {
  return {
    key: `${openingId}/${color}/${lineId}`,
    openingId,
    color,
    lineId,
    practiced,
    clean,
    streak,
    lastPracticed: at(lastPracticed),
    bestMistakes: clean > 0 ? 0 : fewestMistakes,
  };
}

const endgame = (endgameId, completions, first, last = first) => ({
  endgameId,
  completions,
  firstCompletedAt: at(first),
  lastCompletedAt: at(last),
});

// Solved at the first try, or solved after a mistake, a hint or a look at the solution.
const position = (positionId, solves, firstTry, lastSolvedAt) => ({
  positionId,
  solves,
  firstTry,
  spoiled: !firstTry,
  lastSolvedAt: at(lastSolvedAt),
});

export const DEMO_PROGRESS = {
  lines: [
    // Ruy Lopez with White: 2 of its 5 lines mastered, 1 in progress.
    line('ruy-lopez', 'white', RUY_LOPEZ[0], [5, 4, 3], '2026-09-26T18:12:00Z'),
    line('ruy-lopez', 'white', RUY_LOPEZ[1], [3, 3, 3], '2026-09-27T09:40:00Z'),
    line('ruy-lopez', 'white', RUY_LOPEZ[2], [2, 1, 1], '2026-09-27T09:52:00Z'),
    // Italian Game with White: its 4 lines mastered.
    line('italian-game', 'white', ITALIAN_GAME[0], [4, 4, 4], '2026-09-22T19:05:00Z'),
    line('italian-game', 'white', ITALIAN_GAME[1], [3, 3, 3], '2026-09-22T19:21:00Z'),
    line('italian-game', 'white', ITALIAN_GAME[2], [6, 4, 3], '2026-09-24T20:30:00Z'),
    line('italian-game', 'white', ITALIAN_GAME[3], [5, 5, 5], '2026-09-25T08:15:00Z'),
    // Sicilian Najdorf with Black: 1 of its 4 lines mastered, 2 in progress.
    line('sicilian-najdorf', 'black', SICILIAN_NAJDORF[0], [4, 3, 3], '2026-09-23T21:02:00Z'),
    line('sicilian-najdorf', 'black', SICILIAN_NAJDORF[1], [3, 2, 2], '2026-09-26T18:40:00Z'),
    line('sicilian-najdorf', 'black', SICILIAN_NAJDORF[2], [1, 0, 0], '2026-09-26T18:55:00Z', 2),
    // Queen's Gambit Declined with Black: 1 of its 5 lines in progress.
    line(
      'queens-gambit-declined',
      'black',
      QUEENS_GAMBIT_DECLINED[0],
      [2, 1, 1],
      '2026-09-27T10:20:00Z',
    ),
  ],
  // 4 of the 14 endgames passed.
  endgames: [
    endgame('kp-opposition-defence', 2, '2026-09-20T17:30:00Z', '2026-09-24T19:10:00Z'),
    endgame('kp-key-squares', 1, '2026-09-20T17:48:00Z'),
    endgame('lucena-position', 3, '2026-09-21T20:15:00Z', '2026-09-27T11:05:00Z'),
    endgame('mate-queen', 1, '2026-09-23T08:20:00Z'),
  ],
  // 5 of the 13 positions solved, 3 of them at the first try.
  positions: [
    position('kieninger-trap', 1, true, '2026-09-21T13:05:00Z'),
    position('arabian-mate', 2, true, '2026-09-25T13:10:00Z'),
    position('pin-wins-queen', 1, false, '2026-09-21T13:12:00Z'),
    position('legal-mate', 2, true, '2026-09-26T22:01:00Z'),
    position('smothered-mate', 1, false, '2026-09-26T22:09:00Z'),
  ],
};
